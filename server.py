#!/usr/bin/env python3
"""
简单的HTTP服务器，用于部署对话编辑器
适用于Ubuntu系统部署
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# 设置端口
PORT = 8080

# 获取当前脚本所在目录
DIRECTORY = Path(__file__).parent

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
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

def main():
    try:
        # 切换到脚本所在目录
        os.chdir(DIRECTORY)
        
        # 创建服务器
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print(f"对话编辑器服务器启动成功!")
            print(f"访问地址: http://localhost:{PORT}")
            print(f"服务目录: {DIRECTORY}")
            print("按 Ctrl+C 停止服务器")
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n服务器已停止")
        sys.exit(0)
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"错误: 端口 {PORT} 已被占用")
            print("请尝试使用其他端口或停止占用该端口的程序")
        else:
            print(f"启动服务器时发生错误: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"发生未知错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
