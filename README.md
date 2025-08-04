# 对话编辑器

一个用于管理C#项目对话数据的前端编辑器，支持场景管理、对话编辑和CSV导出功能。

## 功能特性

### 🎭 场景管理

- 创建、重命名、删除场景
- 场景列表展示
- 选择场景查看对话

### 💬 对话管理

- 在选定场景下创建对话
- 编辑对话节点
- 删除对话

### 📝 节点编辑

- 支持多种节点属性：
  - 说话人
  - 对话内容
  - 情绪
  - 动作
  - 下一节点ID
  - 触发条件
  - 效果
- 添加/删除节点
- 实时保存编辑内容

### 📊 CSV导出

- 导出单个场景为CSV文件
- 批量导出所有场景
- CSV文件以场景名命名
- 包含完整的对话数据结构

## 部署说明

### Ubuntu系统部署

#### 方法1: 使用Python服务器（推荐）

1. 确保系统安装了Python 3:

    ```bash
    python3 --version
    ```

2. 进入项目目录:

    ```bash
    cd /path/to/dialogue-editor
    ```

3. 启动服务器:

    ```bash
    python3 server.py
    ```

4. 在浏览器中访问:

    ```bash
    http://localhost:8080
    ```

#### 方法1B: Python服务器后台运行（生产环境推荐）

使用systemd服务让应用在后台自动运行，开机自启：

1. 创建systemd服务文件：

    ```bash
    sudo nano /etc/systemd/system/dialogue-editor.service
    ```

2. 添加以下内容（修改路径为你的实际路径）：

    ```ini
    [Unit]
    Description=Dialogue Editor Web Server
    After=network.target

    [Service]
    Type=simple
    User=www-data
    WorkingDirectory=/path/to/dialogue-editor
    ExecStart=/usr/bin/python3 /path/to/dialogue-editor/server.py
    Restart=always
    RestartSec=10

    [Install]
    WantedBy=multi-user.target
    ```

3. 启用并启动服务：

    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable dialogue-editor.service
    sudo systemctl start dialogue-editor.service
    ```

4. 检查服务状态：

    ```bash
    sudo systemctl status dialogue-editor.service
    ```

5. 查看日志（如果需要）：

    ```bash
    sudo journalctl -u dialogue-editor.service -f
    ```

#### 方法1C: 使用nohup后台运行（简单方法）

1. 进入项目目录：

    ```bash
    cd /path/to/dialogue-editor
    ```

2. 使用nohup后台运行：

    ```bash
    nohup python3 server.py > dialogue-editor.log 2>&1 &
    ```

3. 查看进程ID：

    ```bash
    ps aux | grep server.py
    ```

4. 停止服务（如果需要）：

    ```bash
    pkill -f "python3 server.py"
    ```

5. 查看日志：

    ```bash
    tail -f dialogue-editor.log
    ```

#### 方法2: 使用Node.js服务器

1. 安装Node.js:

    ```bash
    sudo apt update
    sudo apt install nodejs npm
    ```

2. 安装http-server:

    ```bash
    npm install -g http-server
    ```

3. 在项目目录启动服务器:

    ```bash
    http-server -p 8080
    ```

#### 方法2B: Node.js服务器后台运行

使用PM2进程管理器让Node.js应用在后台运行：

1. 安装PM2：

    ```bash
    npm install -g pm2
    ```

2. 进入项目目录并启动服务：

    ```bash
    cd /path/to/dialogue-editor
    pm2 start "http-server -p 8080" --name dialogue-editor
    ```

3. 设置开机自启：

    ```bash
    pm2 startup
    pm2 save
    ```

4. 查看服务状态：

    ```bash
    pm2 status
    pm2 logs dialogue-editor
    ```

5. 管理服务：

    ```bash
    pm2 stop dialogue-editor    # 停止服务
    pm2 restart dialogue-editor # 重启服务
    pm2 delete dialogue-editor  # 删除服务
    ```

#### 方法3: 使用Nginx

1. 安装Nginx:

    ```bash
    sudo apt update
    sudo apt install nginx
    ```

2. 将项目文件复制到Nginx目录:

    ```bash
    sudo cp -r /path/to/dialogue-editor/* /var/www/html/
    ```

3. 启动Nginx:

    ```bash
    sudo systemctl start nginx
    sudo systemctl enable nginx
    ```

4. 访问:

    ```bash
    http://your-server-ip
    ```

### Windows系统部署

#### 方法1: 直接运行

1. 双击运行 `server.py` 或在命令行中执行:

    ```cmd
    python server.py
    ```

2. 在浏览器中访问 `http://localhost:8080`

#### 方法2: 作为Windows服务后台运行

使用NSSM（Non-Sucking Service Manager）将Python应用注册为Windows服务：

1. 下载并安装NSSM：
   - 从 [https://nssm.cc/download](https://nssm.cc/download) 下载
   - 解压到 `C:\nssm`
   - 将 `C:\nssm\win64` 添加到系统 PATH环境变量

2. 以管理员身份打开命令提示符，创建服务：

    ```cmd
    nssm install DialogueEditor
    ```

3. 在弹出的窗口中配置：
   - **Path**: `C:\Python\python.exe` （你的Python安装路径）
   - **Startup directory**: `C:\path\to\dialogue-editor`
   - **Arguments**: `server.py`

4. 启动服务：

    ```cmd
    nssm start DialogueEditor
    ```

5. 管理服务：

    ```cmd
    nssm stop DialogueEditor     # 停止服务
    nssm restart DialogueEditor  # 重启服务
    nssm remove DialogueEditor   # 删除服务
    ```

#### 方法3: 使用任务计划程序

1. 打开“任务计划程序”（Task Scheduler）
2. 点击“创建基本任务”
3. 设置任务名称：`Dialogue Editor`
4. 选择“当计算机启动时”
5. 操作选择“启动程序”
6. 程序/脚本：`python.exe`
7. 添加参数：`server.py`
8. 起始于：`C:\path\to\dialogue-editor`
9. 完成创建并启动任务

## 使用指南

### 1. 创建场景

- 点击左侧"新建场景"按钮
- 输入场景名称
- 场景将出现在左侧列表中

### 2. 管理对话

- 点击场景名称选择场景
- 右侧显示该场景的所有对话
- 点击"新建对话"创建新对话
- 使用"编辑"和"删除"按钮管理对话

### 3. 编辑节点

- 点击对话的"编辑"按钮进入编辑页面
- 修改节点的各种属性
- 使用"添加节点"按钮增加新节点
- 点击"删除节点"移除不需要的节点
- 修改会自动保存到本地存储

### 4. 导出数据

- 选择场景后，点击"导出选中场景"导出单个场景
- 点击"导出所有场景"批量导出所有场景
- CSV文件将自动下载到浏览器默认下载目录

## 数据结构

### CSV导出格式

导出的CSV文件完全匹配您的C#项目DialogueImporter的期望格式：

| 列序号 | 字段名 | 说明 |
|--------|--------|------|
| 1 | dialogueID | 对话ID（格式：场景名_对话ID） |
| 2 | nodeID | 节点ID |
| 3 | speakerID | 说话者ID |
| 4 | speakerName | 说话者名称 |
| 5 | speakerType | 说话者类型（Player/Npc/System/PlayerChoice/NpcNotice） |
| 6 | emotion | 说话者情绪（Neutral/Happy/Sad等） |
| 7 | text | 对话文本内容 |
| 8 | nextNodeID | 下一节点ID |
| 9 | questID | 任务ID |
| 10 | rewardIDs | 奖励ID列表（用分号分隔） |
| 11 | isFollow | 是否跟随（true/false） |
| 12 | conditionType | 对话条件类型（None/QuestCompleted/ItemAcquired等） |
| 13 | conditionValue | 对话条件值 |
| 14+ | 选择项 | 每两列为一组：选择项文本和目标节点ID |

### 本地存储

数据使用浏览器的localStorage进行本地存储，格式为JSON。数据结构如下：

```json
[
  {
    "id": 1,
    "name": "场景名称",
    "dialogues": [
      {
        "id": 1,
        "nodes": [
          {
            "id": 1,
            "speaker": "角色名",
            "content": "对话内容",
            "emotion": "情绪",
            "action": "动作",
            "nextNodeId": "2",
            "conditions": "触发条件",
            "effects": "效果"
          }
        ]
      }
    ]
  }
]
```

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **样式**: 响应式设计，支持移动端
- **存储**: 浏览器localStorage
- **服务器**: Python 3 HTTP服务器
- **导出**: 客户端CSV生成

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 注意事项

1. **数据备份**: 数据存储在浏览器本地，建议定期导出CSV文件作为备份
2. **浏览器限制**: 不同浏览器的localStorage有大小限制（通常5-10MB）
3. **网络访问**: 如需在局域网内访问，请修改服务器绑定地址
4. **安全性**: 本应用为开发工具，不建议在生产环境中暴露到公网

## 故障排除

### 常见问题

1. **端口被占用**
   - 修改 `server.py` 中的 `PORT` 变量
   - 或使用 `lsof -i :8080` 查看占用进程

2. **数据丢失**
   - 检查浏览器是否清除了localStorage
   - 尝试在隐私模式下使用

3. **CSV导出失败**
   - 检查浏览器是否阻止了下载
   - 确认浏览器支持Blob API

4. **样式显示异常**
   - 清除浏览器缓存
   - 检查CSS文件是否正确加载

## 开发说明

如需修改或扩展功能，主要文件说明：

- `index.html`: 主页面结构
- `style.css`: 样式定义
- `script.js`: 核心逻辑实现
- `server.py`: Python HTTP服务器
- `README.md`: 使用说明

## 许可证

本项目采用MIT许可证，可自由使用和修改。
