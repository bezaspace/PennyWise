#!/usr/bin/env python3
"""
Test script to verify the voice chat WebSocket connection
"""
import asyncio
import websockets
import json
import base64
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WS_URL = "ws://localhost:8000/api/ai/voice/ws/user_123"

async def test_voice_connection():
    """Test the voice WebSocket connection"""
    try:
        logger.info(f"Connecting to {WS_URL}")
        async with websockets.connect(WS_URL) as websocket:
            logger.info("Connected successfully!")
            
            # Send a test text message
            test_message = {
                "mime_type": "text/plain",
                "data": "Hello, this is a test message for the voice chat."
            }
            
            await websocket.send(json.dumps(test_message))
            logger.info("Sent test message")
            
            # Listen for responses
            timeout = 10  # seconds
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=timeout)
                logger.info(f"Received response: {response}")
                
                # Parse the response
                parsed = json.loads(response)
                if parsed.get("mime_type") == "audio/pcm":
                    logger.info(f"Received audio response of size: {len(parsed.get('data', ''))}")
                elif parsed.get("mime_type") == "text/plain":
                    logger.info(f"Received text response: {parsed.get('data', '')}")
                else:
                    logger.info(f"Received other response: {parsed}")
                    
            except asyncio.TimeoutError:
                logger.warning(f"No response received within {timeout} seconds")
            
            # Send an interrupt test
            interrupt_message = {"type": "interrupt"}
            await websocket.send(json.dumps(interrupt_message))
            logger.info("Sent interrupt message")
            
            # Wait a bit more for any additional responses
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=3)
                logger.info(f"Received after interrupt: {response}")
            except asyncio.TimeoutError:
                logger.info("No response after interrupt (expected)")
            
    except Exception as e:
        logger.error(f"Connection failed: {e}")
        return False
    
    logger.info("Test completed successfully!")
    return True

if __name__ == "__main__":
    result = asyncio.run(test_voice_connection())
    if result:
        print("✅ Voice WebSocket connection test PASSED")
    else:
        print("❌ Voice WebSocket connection test FAILED")
