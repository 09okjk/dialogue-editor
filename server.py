#!/usr/bin/env python3
"""
对话编辑器服务器 - 支持SQLite数据库同步
适用于跨设备数据同步的对话编辑器部署

使用方法：
  python3 server.py                    # 默认端口8080，仅本地访问
  python3 server.py 9000               # 指定端口9000，仅本地访问
  python3 server.py 8080 0.0.0.0       # 端口8080，允许公网访问
  python3 server.py 9000 0.0.0.0       # 端口9000，允许公网访问
"""

import http.server
import socketserver
import os
import sys
import json
import sqlite3
import urllib.parse
from pathlib import Path
from datetime import datetime

# 默认配置
DEFAULT_PORT = 8080
DEFAULT_HOST = "127.0.0.1"  # 仅本地访问

# 获取当前脚本所在目录
DIRECTORY = Path(__file__).parent
DB_PATH = DIRECTORY / "dialogue_data.db"

class DatabaseManager:
    def __init__(self, db_path):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """初始化数据库表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建数据表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dialogue_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 检查是否有数据，如果没有则插入默认空数据
        cursor.execute('SELECT COUNT(*) FROM dialogue_data')
        if cursor.fetchone()[0] == 0:
            cursor.execute('INSERT INTO dialogue_data (data) VALUES (?)', ('[]',))
        
        conn.commit()
        conn.close()
    
    def get_data(self):
        """获取最新的对话数据"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT data FROM dialogue_data ORDER BY updated_at DESC LIMIT 1')
        result = cursor.fetchone()
        
        conn.close()
        
        if result:
            return json.loads(result[0])
        return []
    
    def save_data(self, data):
        """保存对话数据"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 删除旧数据，保存新数据
        cursor.execute('DELETE FROM dialogue_data')
        cursor.execute('INSERT INTO dialogue_data (data) VALUES (?)', (json.dumps(data),))
        
        conn.commit()
        conn.close()
        
        return True

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.db_manager = DatabaseManager(DB_PATH)
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # 添加CORS头部，允许跨域访问
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        # 处理预检请求
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        # 处理API请求
        if self.path == '/api/data':
            self.handle_get_data()
        else:
            # 处理静态文件请求
            super().do_GET()
    
    def do_POST(self):
        # 处理API POST请求
        if self.path == '/api/data':
            self.handle_save_data()
        else:
            self.send_error(404, "Not Found")
    
    def handle_get_data(self):
        """处理获取数据的API请求"""
        try:
            data = self.db_manager.get_data()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'success': True,
                'data': data,
                'timestamp': datetime.now().isoformat()
            }
            
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Database error: {str(e)}")
    
    def handle_save_data(self):
        """处理保存数据的API请求"""
        try:
            # 读取POST数据
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # 解析JSON数据
            request_data = json.loads(post_data.decode('utf-8'))
            scenes_data = request_data.get('data', [])
            
            # 保存到数据库
            success = self.db_manager.save_data(scenes_data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'success': success,
                'message': 'Data saved successfully' if success else 'Failed to save data',
                'timestamp': datetime.now().isoformat()
            }
            
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON data")
        except Exception as e:
            self.send_error(500, f"Database error: {str(e)}")

def parse_arguments():
    """解析命令行参数"""
    port = DEFAULT_PORT
    host = DEFAULT_HOST
    
    if len(sys.argv) >= 2:
        try:
            port = int(sys.argv[1])
            if port < 1 or port > 65535:
                raise ValueError("端口号必须在1-65535之间")
        except ValueError as e:
            print(f"错误: 无效的端口号 '{sys.argv[1]}' - {e}")
            sys.exit(1)
    
    if len(sys.argv) >= 3:
        host = sys.argv[2]
        if host not in ["0.0.0.0", "127.0.0.1", "localhost"]:
            print(f"警告: 主机地址 '{host}' 可能不安全，建议使用 '0.0.0.0'（公网）或 '127.0.0.1'（本地）")
    
    return host, port

def main():
    host, port = parse_arguments()
    
    try:
        # 切换到脚本所在目录
        os.chdir(DIRECTORY)
        
        # 创建服务器
        with socketserver.TCPServer((host, port), CustomHTTPRequestHandler) as httpd:
            print(f"对话编辑器服务器启动成功!")
            print(f"服务目录: {DIRECTORY}")
            
            if host == "0.0.0.0":
                print(f"本地访问: http://localhost:{port}")
                print(f"公网访问: http://your-server-ip:{port}")
                print("⚠️  警告: 服务器允许公网访问，请确保防火墙和安全设置正确!")
            else:
                print(f"访问地址: http://localhost:{port}")
                print("ℹ️  提示: 当前仅允许本地访问，如需公网访问请使用 '0.0.0.0' 作为主机地址")
            
            print("按 Ctrl+C 停止服务器")
            print("-" * 50)
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n服务器已停止")
        sys.exit(0)
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"错误: 端口 {port} 已被占用")
            print("请尝试使用其他端口或停止占用该端口的程序")
        elif e.errno == 99:  # Cannot assign requested address
            print(f"错误: 无法绑定到地址 {host}:{port}")
            print("请检查主机地址是否正确")
        else:
            print(f"启动服务器时发生错误: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"发生未知错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
