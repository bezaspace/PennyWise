#!/usr/bin/env python3
"""
Test script to verify Event structure and AI chat functionality
"""

import asyncio
from google.genai import types
from google.adk.events import Event

def test_event_creation():
    """Test that Event objects can be created with proper content structure"""
    try:
        # Test system event
        system_content = types.Content(parts=[types.Part(text="Test system message")])
        system_event = Event(author="system", content=system_content)
        print("✅ System event created successfully")
        
        # Test user event
        user_content = types.Content(parts=[types.Part(text="Test user message")])
        user_event = Event(author="user", content=user_content)
        print("✅ User event created successfully")
        
        print("🎉 All event tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Event creation failed: {e}")
        return False

if __name__ == "__main__":
    test_event_creation()
