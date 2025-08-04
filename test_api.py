#!/usr/bin/env python3
"""
API测试脚本 - 用于测试对话编辑器的API接口
"""

import requests
import json
import sys

def test_api(base_url="http://localhost:8080"):
    """测试API接口"""
    
    print(f"测试服务器: {base_url}")
    print("=" * 50)
    
    # 测试GET接口
    print("1. 测试GET /api/data")
    try:
        response = requests.get(f"{base_url}/api/data", timeout=5)
        print(f"   状态码: {response.status_code}")
        print(f"   响应头: {dict(response.headers)}")
        if response.status_code == 200:
            data = response.json()
            print(f"   响应数据: {data}")
        else:
            print(f"   错误内容: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   请求失败: {e}")
    
    print("\n" + "-" * 30 + "\n")
    
    # 测试POST接口
    print("2. 测试POST /api/data")
    test_data = {
        "data": [
            {
                "id": 1,
                "name": "测试场景",
                "description": "这是一个测试场景",
                "dialogues": []
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/data", 
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        print(f"   状态码: {response.status_code}")
        print(f"   响应头: {dict(response.headers)}")
        if response.status_code == 200:
            data = response.json()
            print(f"   响应数据: {data}")
        else:
            print(f"   错误内容: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   请求失败: {e}")
    
    print("\n" + "-" * 30 + "\n")
    
    # 再次测试GET接口验证数据是否保存
    print("3. 验证数据是否保存 - GET /api/data")
    try:
        response = requests.get(f"{base_url}/api/data", timeout=5)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   保存的数据: {data}")
            if data.get('success') and len(data.get('data', [])) > 0:
                print("   ✓ 数据保存成功！")
            else:
                print("   ✗ 数据保存失败或为空")
        else:
            print(f"   错误内容: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   请求失败: {e}")

if __name__ == "__main__":
    # 默认测试本地服务器
    base_url = "http://localhost:8080"
    
    # 如果提供了参数，使用自定义URL
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    
    print("对话编辑器API测试工具")
    print(f"使用方法: python3 {sys.argv[0]} [服务器URL]")
    print(f"例如: python3 {sys.argv[0]} http://your-server:8080")
    print()
    
    test_api(base_url)
