#!/bin/bash
# 权限诊断和修复脚本 - 深度检查SQLite权限问题

echo "对话编辑器权限深度诊断脚本"
echo "=================================="

# 获取当前脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_FILE="$SCRIPT_DIR/dialogue_data.db"

echo "项目目录: $SCRIPT_DIR"
echo "数据库文件路径: $DB_FILE"
echo ""

# 1. 检查当前用户和权限
echo "=== 用户信息 ==="
echo "当前用户: $(whoami)"
echo "用户ID: $(id -u)"
echo "用户组: $(groups)"
echo "有效用户ID: $(id -u)"
echo "有效组ID: $(id -g)"
echo ""

# 2. 检查目录权限
echo "=== 目录权限检查 ==="
ls -la "$SCRIPT_DIR"
echo ""
echo "目录详细权限:"
stat "$SCRIPT_DIR" 2>/dev/null || echo "无法获取目录状态"
echo ""

# 3. 检查数据库文件（如果存在）
if [ -f "$DB_FILE" ]; then
    echo "=== 数据库文件权限检查 ==="
    ls -la "$DB_FILE"
    echo ""
    echo "数据库文件详细权限:"
    stat "$DB_FILE" 2>/dev/null || echo "无法获取文件状态"
    echo ""
else
    echo "=== 数据库文件不存在 ==="
fi

# 4. 检查磁盘空间
echo "=== 磁盘空间检查 ==="
df -h "$SCRIPT_DIR"
echo ""

# 5. 检查文件系统类型
echo "=== 文件系统信息 ==="
df -T "$SCRIPT_DIR"
echo ""

# 6. 测试写入权限
echo "=== 写入权限测试 ==="
TEST_FILE="$SCRIPT_DIR/test_write_$(date +%s).tmp"
if touch "$TEST_FILE" 2>/dev/null; then
    echo "✓ 可以在目录中创建文件"
    if echo "test" > "$TEST_FILE" 2>/dev/null; then
        echo "✓ 可以写入文件"
        rm -f "$TEST_FILE" 2>/dev/null && echo "✓ 可以删除文件"
    else
        echo "✗ 无法写入文件"
    fi
else
    echo "✗ 无法在目录中创建文件"
fi
echo ""

# 7. 检查SELinux状态（如果存在）
echo "=== SELinux检查 ==="
if command -v getenforce >/dev/null 2>&1; then
    echo "SELinux状态: $(getenforce)"
    if [ -f "$DB_FILE" ]; then
        echo "数据库文件SELinux上下文:"
        ls -Z "$DB_FILE" 2>/dev/null || echo "无法获取SELinux上下文"
    fi
else
    echo "系统未安装SELinux"
fi
echo ""

# 8. 尝试修复权限
echo "=== 尝试修复权限 ==="

# 设置目录权限
echo "设置目录权限为 755..."
chmod 755 "$SCRIPT_DIR" && echo "✓ 目录权限设置成功" || echo "✗ 目录权限设置失败"

# 如果数据库文件存在，设置文件权限
if [ -f "$DB_FILE" ]; then
    echo "设置数据库文件权限为 666..."
    chmod 666 "$DB_FILE" && echo "✓ 数据库文件权限设置成功" || echo "✗ 数据库文件权限设置失败"
else
    echo "数据库文件不存在，将在服务器启动时创建"
fi

# 9. 尝试创建和写入测试数据库
echo ""
echo "=== SQLite写入测试 ==="
TEST_DB="$SCRIPT_DIR/test_$(date +%s).db"
python3 -c "
import sqlite3
import sys
try:
    conn = sqlite3.connect('$TEST_DB')
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT)')
    cursor.execute('INSERT INTO test (data) VALUES (?)', ('test_data',))
    conn.commit()
    cursor.execute('SELECT * FROM test')
    result = cursor.fetchone()
    conn.close()
    print('✓ SQLite写入测试成功:', result)
    import os
    os.remove('$TEST_DB')
    print('✓ 测试数据库已清理')
except Exception as e:
    print('✗ SQLite写入测试失败:', str(e))
    sys.exit(1)
"

echo ""
echo "=== 修复建议 ==="
echo "如果上述测试失败，请尝试以下解决方案："
echo ""
echo "1. 使用sudo运行服务器（不推荐，仅用于测试）:"
echo "   sudo python3 server.py"
echo ""
echo "2. 更改数据库位置到用户主目录:"
echo "   mkdir -p ~/dialogue-editor-data"
echo "   chmod 755 ~/dialogue-editor-data"
echo "   然后修改server.py中的DB_PATH"
echo ""
echo "3. 如果是Docker环境，检查卷挂载权限"
echo ""
echo "4. 检查父目录的权限链"
echo "   namei -l '$SCRIPT_DIR'"
echo ""

# 10. 显示最终状态
echo "=== 最终权限状态 ==="
echo "目录权限: $(ls -ld "$SCRIPT_DIR" | cut -d' ' -f1)"
if [ -f "$DB_FILE" ]; then
    echo "数据库文件权限: $(ls -l "$DB_FILE" | cut -d' ' -f1)"
fi

echo ""
echo "诊断完成！请查看上述信息来确定问题所在。"
