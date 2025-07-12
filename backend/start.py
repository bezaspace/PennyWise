#!/usr/bin/env python3
"""
Simple startup script for the PennyWise FastAPI backend
"""
import uvicorn
import sys
import os

def main():
    print("🚀 Starting PennyWise FastAPI Backend...")
    print("📊 API Documentation will be available at: http://localhost:8000/docs")
    print("🔄 Auto-reload enabled for development")
    print("⚡ Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Backend server stopped!")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()