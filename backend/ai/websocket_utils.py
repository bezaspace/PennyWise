"""
WebSocket utilities for processing events and handling messages.
"""

import base64
import json
import logging
from typing import Any, Dict
from fastapi import WebSocket
from google.genai import types
from google.adk.agents import LiveRequestQueue

logger = logging.getLogger(__name__)


async def send_pending_tool_messages():
    """Send any pending tool messages."""
    from tools import send_pending_tool_messages as send_tools
    await send_tools()


async def process_event(event: Any, websocket: WebSocket):
    """Process a single event from the agent and send appropriate messages to client."""
    # Check for and send any pending tool messages first
    await send_pending_tool_messages()
    
    # Add comprehensive logging to debug event structure
    logger.info(f"=== NEW EVENT ===")
    logger.info(f"Event type: {type(event)}")
    logger.info(f"Event attributes: {[attr for attr in dir(event) if not attr.startswith('_')]}")
    
    # Check for function calls and responses using all possible methods
    function_calls = []
    function_responses = []
    
    # Method 1: Direct ADK methods
    if hasattr(event, 'get_function_calls'):
        try:
            function_calls = event.get_function_calls()
            logger.info(f"ADK get_function_calls() returned: {len(function_calls)} calls")
        except Exception as e:
            logger.info(f"ADK get_function_calls() failed: {e}")
    
    if hasattr(event, 'get_function_responses'):
        try:
            function_responses = event.get_function_responses()
            logger.info(f"ADK get_function_responses() returned: {len(function_responses)} responses")
        except Exception as e:
            logger.info(f"ADK get_function_responses() failed: {e}")
    
    # Method 2: Check content.parts for function calls/responses
    if hasattr(event, 'content') and event.content and hasattr(event.content, 'parts'):
        logger.info(f"Event has content with {len(event.content.parts)} parts")
        for i, part in enumerate(event.content.parts):
            logger.info(f"Part {i}: {type(part)}")
            part_attrs = [attr for attr in dir(part) if not attr.startswith('_')]
            logger.info(f"Part {i} attributes: {part_attrs}")
            
            # Check for function call in part
            if hasattr(part, 'function_call') and part.function_call:
                logger.info(f"Found function_call in part {i}: {part.function_call}")
                function_calls.append(part.function_call)
            
            # Check for function response in part
            if hasattr(part, 'function_response') and part.function_response:
                logger.info(f"Found function_response in part {i}: {part.function_response}")
                function_responses.append(part.function_response)
    
    # Handle turn complete/interrupted with immediate response
    if getattr(event, "turn_complete", False):
        logger.info("AI turn completed")
        message = {
            "turn_complete": True,
            "interrupted": False,
        }
        await websocket.send_text(json.dumps(message))
        return
        
    if getattr(event, "interrupted", False):
        logger.info("AI generation interrupted")
        message = {
            "turn_complete": False,
            "interrupted": True,
        }
        await websocket.send_text(json.dumps(message))
        return

    # Prefer ADK helpers; fallback to content.parts to avoid duplicates
    if not function_calls and hasattr(event, 'content') and event.content and hasattr(event.content, 'parts'):
        for part in event.content.parts:
            if getattr(part, 'function_call', None):
                function_calls.append(part.function_call)

    if not function_responses and hasattr(event, 'content') and event.content and hasattr(event.content, 'parts'):
        for part in event.content.parts:
            if getattr(part, 'function_response', None):
                function_responses.append(part.function_response)

    # Handle function calls (dedup by id/name+args)
    if function_calls:
        logger.info(f"Processing {len(function_calls)} function calls (deduped)")
        seen_calls = set()
        for call in function_calls:
            tool_name = getattr(call, 'name', 'unknown')
            tool_args = getattr(call, 'args', {})
            tool_id = getattr(call, 'id', None)
            key = tool_id or json.dumps({"n": tool_name, "a": tool_args}, sort_keys=True)
            if key in seen_calls:
                continue
            seen_calls.add(key)
            message = {
                "mime_type": "tool/call",
                "tool_name": tool_name,
                "tool_args": tool_args,
                "tool_id": tool_id
            }
            await websocket.send_text(json.dumps(message))

    # Handle function responses (dedup by id/name)
    if function_responses:
        logger.info(f"Processing {len(function_responses)} function responses (deduped)")
        seen_responses = set()
        for response in function_responses:
            tool_name = getattr(response, 'name', 'unknown')
            tool_response = getattr(response, 'response', {})
            tool_id = getattr(response, 'id', None)
            key = tool_id or tool_name
            if key in seen_responses:
                continue
            seen_responses.add(key)
            message = {
                "mime_type": "tool/response",
                "tool_name": tool_name,
                "tool_response": tool_response,
                "tool_id": tool_id
            }
            await websocket.send_text(json.dumps(message))

    # Handle regular content
    if hasattr(event, 'content') and event.content and hasattr(event.content, 'parts') and event.content.parts:
        part = event.content.parts[0]
        
        # Audio response - prioritize for immediate playback
        if getattr(part, "inline_data", None) and part.inline_data.mime_type.startswith("audio/pcm"):
            audio_data = part.inline_data.data
            if audio_data:
                logger.debug(f"Sending audio response: {len(audio_data)} bytes")
                message = {
                    "mime_type": "audio/pcm",
                    "data": base64.b64encode(audio_data).decode("ascii")
                }
                await websocket.send_text(json.dumps(message))
            return
            
        # Text response (for live transcript during generation)
        if getattr(part, "text", None):
            # Only send partial text if it's meaningful
            text_content = part.text.strip()
            if text_content and len(text_content) > 2:
                logger.info(f"Sending text response: {text_content[:100]}...")
                message = {
                    "mime_type": "text/plain",
                    "data": text_content,
                    "partial": getattr(event, "partial", False)
                }
                await websocket.send_text(json.dumps(message))
    
    logger.info(f"=== END EVENT ===")


async def handle_client_message(message: Dict[str, Any], live_request_queue: LiveRequestQueue):
    """Handle a message from the client and send to the agent."""
    # Handle interrupt message with priority
    if message.get("type") == "interrupt":
        logger.info("Received interrupt signal from client")
        # Cancel current AI response immediately
        try:
            if hasattr(live_request_queue, "cancel"):
                live_request_queue.cancel()
            # Send activity end to flush any pending audio
            live_request_queue.send_realtime()
            logger.info("Successfully processed interrupt")
        except Exception as e:
            logger.warning(f"Error during interrupt: {e}")
        return
    
    mime_type = message.get("mime_type")
    data = message.get("data")
    
    if mime_type == "text/plain" and data:
        content = types.Content(role="user", parts=[types.Part.from_text(text=data)])
        live_request_queue.send_content(content=content)
        
    elif mime_type == "audio/pcm" and data:
        try:
            decoded_data = base64.b64decode(data)
            # Use send_realtime for immediate processing
            live_request_queue.send_realtime(
                types.Blob(data=decoded_data, mime_type="audio/pcm;rate=16000")
            )
            # Log audio data size occasionally for debugging
            if len(decoded_data) > 0:
                logger.debug(f"Processed audio chunk: {len(decoded_data)} bytes")
        except Exception as e:
            logger.warning(f"Error processing audio data: {e}")
            return