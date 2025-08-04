#!/usr/bin/env python3
"""
对话编辑器服务器，支持数据同步
适用于Ubuntu系统部署

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
import urllib.parse
from pathlib import Path

# 默认配置
DEFAULT_PORT = 8080
DEFAULT_HOST = "127.0.0.1"  # 仅本地访问

# 获取当前脚本所在目录
DIRECTORY = Path(__file__).parent
DATA_FILE = DIRECTORY / "dialogue_data.json"

class DialogueServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
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
        # 处理API请求
        if self.path == '/api/data':
            self.handle_save_data()
        else:
            self.send_error(404, "Not Found")
    
    def handle_get_data(self):
        """处理获取数据请求"""
        try:
            if DATA_FILE.exists():
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                data = []
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            print(f"获取数据时发生错误: {e}")
            self.send_error(500, f"Internal Server Error: {str(e)}")
    
    def handle_save_data(self):
        """处理保存数据请求"""
        try:
            # 读取POST数据
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # 解析JSON数据
            data = json.loads(post_data.decode('utf-8'))
            
            # 保存到文件
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "数据保存成功"}, ensure_ascii=False).encode('utf-8'))
            
            print(f"数据已保存到: {DATA_FILE}")
            
        except json.JSONDecodeError as e:
            print(f"JSON解析错误: {e}")
            self.send_error(400, f"Bad Request: Invalid JSON - {str(e)}")
        except Exception as e:
            print(f"保存数据时发生错误: {e}")
            self.send_error(500, f"Internal Server Error: {str(e)}")

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
        with socketserver.TCPServer((host, port), DialogueServerHandler) as httpd:
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
