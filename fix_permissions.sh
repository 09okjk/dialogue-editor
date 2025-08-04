#!/bin/bash
# 权限修复脚本 - 解决SQLite数据库权限问题

echo "对话编辑器权限修复脚本"
echo "========================"

# 获取当前脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "项目目录: $SCRIPT_DIR"

# 设置目录权限
echo "设置目录权限..."
chmod 755 "$SCRIPT_DIR"

# 如果数据库文件存在，设置文件权限
DB_FILE="$SCRIPT_DIR/dialogue_data.db"
if [ -f "$DB_FILE" ]; then
    echo "数据库文件已存在，设置权限..."
    chmod 664 "$DB_FILE"
    echo "数据库文件权限已设置为 664"
else
    echo "数据库文件不存在，将在服务器启动时创建"
fi

# 显示当前权限状态
echo ""
echo "当前权限状态:"
echo "目录权限: $(ls -ld "$SCRIPT_DIR" | cut -d' ' -f1)"

if [ -f "$DB_FILE" ]; then
    echo "数据库文件权限: $(ls -l "$DB_FILE" | cut -d' ' -f1)"
fi

# 显示当前用户信息
echo "当前用户: $(whoami)"
echo "用户ID: $(id -u)"
echo "用户组: $(id -g)"

echo ""
echo "权限修复完成！"
echo "现在可以启动服务器了："
echo "python3 server.py"
