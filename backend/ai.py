import os
from dotenv import load_dotenv; load_dotenv()
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, WebSocket
from fastapi.responses import StreamingResponse
import base64
import asyncio
from sqlalchemy.orm import Session
import logging
from google.genai import types
from google.genai.types import Content, Part, Blob
from pydantic import BaseModel
from google.adk.events import Event
from google.adk.agents.run_config import RunConfig
from google.adk.agents import LiveRequestQueue
import json

from database import get_db
from adk_services import runner, session_service

# --- Pydantic Models ---

class FinancialAdviceRequest(BaseModel):
    prompt: str

# --- ADK Agent Setup ---

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/ai", tags=["AI"])

# --- Live AI Voice Chat WebSocket Endpoint ---
import json

@router.websocket("/voice/ws/{user_id}")
async def ai_voice_chat_ws(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for live AI voice chat (bidirectional audio/text)."""
    await websocket.accept()
    logger.info(f"Voice chat WebSocket connected for user: {user_id}")
    
    session_id = f"{user_id}_session"
    
    # Ensure session exists
    try:
        session = await session_service.get_session(
            app_name="PennyWise", user_id=user_id, session_id=session_id
        )
        logger.info(f"Retrieved existing session: {session_id}")
    except Exception as e:
        logger.info(f"Creating new session: {session_id}, reason: {e}")
        try:
            session = await session_service.create_session(
                app_name="PennyWise", user_id=user_id, session_id=session_id
            )
            logger.info(f"Successfully created new session: {session_id}")
        except Exception as create_error:
            logger.error(f"Failed to create session: {create_error}")
            await websocket.close(code=1011, reason="Session creation failed")
            return

    # Set up ADK live session for AUDIO modality with optimized VAD
    try:
        run_config = RunConfig(
            response_modalities=["AUDIO"],
            realtime_input_config={
                "automatic_activity_detection": {
                    "disabled": False,  # Enable automatic VAD
                    # Optimized settings for better responsiveness
                    "start_of_speech_sensitivity": types.StartSensitivity.START_SENSITIVITY_HIGH,
                    "end_of_speech_sensitivity": types.EndSensitivity.END_SENSITIVITY_HIGH,
                    "prefix_padding_ms": 200,  # Capture beginning of speech
                    "silence_duration_ms": 600,  # Faster response time
                }
            }
        )
        
        live_request_queue = LiveRequestQueue()
        live_events = runner.run_live(
            session=session,
            live_request_queue=live_request_queue,
            run_config=run_config,
        )
        logger.info("Live session started successfully with optimized VAD")
        
    except Exception as e:
        logger.error(f"Failed to start live session: {e}")
        await websocket.close(code=1011, reason="Live session setup failed")
        return

    async def agent_to_client():
        try:
            async for event in live_events:
                # Handle turn complete/interrupted with immediate response
                if getattr(event, "turn_complete", False):
                    logger.info("AI turn completed")
                    message = {
                        "turn_complete": True,
                        "interrupted": False,
                    }
                    await websocket.send_text(json.dumps(message))
                    continue
                    
                if getattr(event, "interrupted", False):
                    logger.info("AI generation interrupted")
                    message = {
                        "turn_complete": False,
                        "interrupted": True,
                    }
                    await websocket.send_text(json.dumps(message))
                    continue

                part = event.content.parts[0] if event.content and event.content.parts else None
                if not part:
                    continue
                    
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
                    continue
                    
                # Text response (for live transcript during generation)
                if getattr(part, "text", None):
                    # Only send partial text if it's meaningful
                    text_content = part.text.strip()
                    if text_content and len(text_content) > 2:
                        message = {
                            "mime_type": "text/plain",
                            "data": text_content,
                            "partial": getattr(event, "partial", False)
                        }
                        await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error in agent_to_client: {e}")
            # Send error message to client
            error_message = {
                "error": True,
                "message": "Connection error occurred"
            }
            try:
                await websocket.send_text(json.dumps(error_message))
            except:
                pass

    async def client_to_agent():
        try:
            while True:
                message_json = await websocket.receive_text()
                message = json.loads(message_json)
                
                # Handle interrupt message with priority
                if message.get("type") == "interrupt":
                    logger.info("Received interrupt signal from client")
                    # Cancel current AI response immediately
                    try:
                        if hasattr(live_request_queue, "cancel"):
                            live_request_queue.cancel()
                        # Send activity end to flush any pending audio
                        live_request_queue.send_realtime(activity_end=True)
                        logger.info("Successfully processed interrupt")
                    except Exception as e:
                        logger.warning(f"Error during interrupt: {e}")
                    continue
                
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
                        continue
                        
        except Exception as e:
            logger.error(f"Error in client_to_agent: {e}")
            # Connection might be closed, break the loop
            return

    # Run both directions concurrently with better error handling
    try:
        agent_task = asyncio.create_task(agent_to_client())
        client_task = asyncio.create_task(client_to_agent())
        
        # Wait for either task to complete or fail
        done, pending = await asyncio.wait(
            [agent_task, client_task], 
            return_when=asyncio.FIRST_EXCEPTION
        )
        
        # Cancel pending tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
                
        # Check if any task raised an exception
        for task in done:
            try:
                await task
            except Exception as e:
                logger.error(f"WebSocket task error: {e}")
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        # Clean up resources
        try:
            live_request_queue.close()
        except Exception as e:
            logger.warning(f"Error closing live_request_queue: {e}")
        
        try:
            if websocket.client_state.CONNECTED:
                await websocket.close()
        except Exception as e:
            logger.warning(f"Error closing websocket: {e}")

@router.post("/chat/stream")
async def chat_stream(request: FinancialAdviceRequest):
    """Stream AI chat response based on user prompt using ADK Agent."""
    user_id = "user_123"  # In a real app, this would come from auth
    session_id = f"{user_id}_session"  # A simple way to manage sessions per user

    # Follow the ADK documentation pattern for session management with extra verification
    session = None
    try:
        # First, try to get existing session
        session = await session_service.get_session(
            app_name="PennyWise", user_id=user_id, session_id=session_id
        )
        logger.info(f"Retrieved existing session: {session_id}")
    except Exception as e:
        logger.info(f"Session not found, creating new session: {session_id}. Error: {e}")
        try:
            # Create new session following the documentation pattern
            session = await session_service.create_session(
                app_name="PennyWise", user_id=user_id, session_id=session_id
            )
            logger.info(f"Created new session: {session_id}")
            
            # Wait a moment and verify the session was created
            import asyncio
            await asyncio.sleep(0.1)
            
            # Verify session exists
            verify_session = await session_service.get_session(
                app_name="PennyWise", user_id=user_id, session_id=session_id
            )
            logger.info(f"Session verified: {session_id}")
            
        except Exception as create_error:
            logger.error(f"Failed to create session: {create_error}")
            # Try one more time to get it in case there's a race condition
            try:
                session = await session_service.get_session(
                    app_name="PennyWise", user_id=user_id, session_id=session_id
                )
                logger.info(f"Session found on retry: {session_id}")
            except:
                raise HTTPException(status_code=500, detail=f"Session management error: {str(create_error)}")

    async def event_generator():
        try:
            # Create user message content following the documentation pattern
            user_message = types.Content(role='user', parts=[types.Part(text=request.prompt)])
            
            logger.info(f"About to call runner.run_async with session_id: {session_id}")
            
            # Use runner.run_async exactly as shown in the documentation
            response_found = False
            async for event in runner.run_async(
                user_id=user_id, session_id=session_id, new_message=user_message
            ):
                logger.debug(f"Received event: {event.author}, type: {type(event).__name__}")
                
                # Check if this is the final response event - using both methods from documentation
                is_final = False
                if hasattr(event, 'is_final_response'):
                    is_final = event.is_final_response()
                    logger.debug(f"Event is_final_response: {is_final}")
                
                if is_final:
                    logger.info("Processing final response event")
                    if event.content and event.content.parts:
                        # Extract text from the first part
                        text = event.content.parts[0].text
                        if text:
                            logger.info(f"Yielding final response: {text[:100]}...")
                            yield f"data: {text}\n\n"
                            response_found = True
                    elif hasattr(event, 'actions') and event.actions and hasattr(event.actions, 'escalate') and event.actions.escalate:
                        # Handle escalation/error case
                        error_msg = getattr(event, 'error_message', None) or "Agent encountered an error"
                        yield f"data: {error_msg}\n\n"
                        response_found = True
                    break  # Stop after final response
                else:
                    # For intermediate events, check if there's useful content to stream
                    if event.content and event.content.parts:
                        text = event.content.parts[0].text
                        if text and len(text.strip()) > 0:
                            logger.debug(f"Intermediate content: {text[:50]}...")
                            # Don't yield intermediate content for now, just log it
            
            if not response_found:
                logger.warning("No final response found in events")
                yield f"data: No response received from agent.\n\n"
                    
        except Exception as e:
            logger.error(f"Error in event generator: {e}")
            yield f"data: Error processing request: {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/plain")


@router.post("/session/init")
async def initialize_session():
    """Initialize or reset the AI chat session."""
    user_id = "user_123"
    session_id = f"{user_id}_session"
    
    try:
        # Following ADK documentation pattern - just create a new session
        session = await session_service.create_session(
            app_name="PennyWise", user_id=user_id, session_id=session_id
        )
        logger.info(f"Initialized session: {session_id}")
        
        return {"status": "success", "session_id": session_id, "message": "Session initialized successfully"}
        
    except Exception as e:
        # Session might already exist, which is fine
        logger.info(f"Session may already exist: {e}")
        return {"status": "success", "session_id": session_id, "message": "Session ready (may have already existed)"}


@router.get("/session/status")
async def get_session_status():
    """Get the status of the current AI chat session."""
    user_id = "user_123"
    session_id = f"{user_id}_session"
    
    try:
        session = await session_service.get_session(
            app_name="PennyWise", user_id=user_id, session_id=session_id
        )
        return {
            "status": "exists",
            "session_id": session_id,
            "message": "Session is ready"
        }
    except Exception as e:
        return {
            "status": "not_found",
            "session_id": session_id,
            "message": f"Session not found: {str(e)}"
        }

@router.get("/health")
async def ai_health_check():
    """Health check for AI service."""
    try:
        # Basic check that the ADK services are accessible
        return {
            "status": "healthy",
            "service": "AI Chat",
            "runner_available": runner is not None,
            "session_service_available": session_service is not None,
            "message": "AI service is operational"
        }
    except Exception as e:
        logger.error(f"AI health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI service unhealthy: {str(e)}")

@router.get("/debug/session")
async def debug_session():
    """Debug endpoint to check session service functionality."""
    user_id = "user_123"
    session_id = f"{user_id}_session"
    
    try:
        # Test session retrieval first
        logger.info("Testing session retrieval...")
        
        session_exists = False
        retrieved_session = None
        
        try:
            retrieved_session = await session_service.get_session(
                app_name="PennyWise", user_id=user_id, session_id=session_id
            )
            session_exists = True
            logger.info("Session already exists")
        except Exception as get_error:
            logger.info(f"Session doesn't exist: {get_error}")
        
        # If session doesn't exist, try to create it
        session_created = False
        if not session_exists:
            try:
                session = await session_service.create_session(
                    app_name="PennyWise", user_id=user_id, session_id=session_id
                )
                session_created = True
                logger.info("Session created successfully")
            except Exception as create_error:
                logger.error(f"Failed to create session: {create_error}")
                return {
                    "status": "error",
                    "error": str(create_error),
                    "session_id": session_id,
                    "message": "Failed to create session"
                }
        
        return {
            "status": "success",
            "session_exists": session_exists,
            "session_created": session_created,
            "session_retrieved": retrieved_session is not None,
            "session_id": session_id,
            "message": "Session service is working correctly"
        }
        
    except Exception as e:
        logger.error(f"Session debug failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "session_id": session_id,
            "message": "Session service has issues"
        }

@router.get("/debug/runner")
async def debug_runner():
    """Debug endpoint to check runner configuration."""
    user_id = "user_123"
    session_id = f"{user_id}_session"
    
    try:
        # Check runner configuration
        runner_info = {
            "agent_name": runner.agent.name if runner.agent else "No agent",
            "app_name": runner.app_name if hasattr(runner, 'app_name') else "No app name",
            "session_service": str(type(runner.session_service)) if hasattr(runner, 'session_service') else "No session service",
            "session_service_same": runner.session_service is session_service if hasattr(runner, 'session_service') else False
        }
        
        # Try to access the session through the runner's session service
        try:
            runner_session = await runner.session_service.get_session(
                app_name="PennyWise", user_id=user_id, session_id=session_id
            )
            runner_can_access = True
        except Exception as e:
            runner_can_access = False
            runner_error = str(e)
        
        return {
            "status": "success",
            "runner_info": runner_info,
            "runner_can_access_session": runner_can_access,
            "runner_error": runner_error if not runner_can_access else None,
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"Runner debug failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "session_id": session_id
        }

@router.post("/debug/chat")
async def debug_chat(request: FinancialAdviceRequest):
    """Debug endpoint that mimics the chat functionality step by step."""
    user_id = "user_123"
    session_id = f"{user_id}_session"
    
    debug_info = {
        "user_id": user_id,
        "session_id": session_id,
        "prompt": request.prompt,
        "steps": []
    }
    
    try:
        # Step 1: Check session exists
        debug_info["steps"].append("Checking session exists...")
        session = await session_service.get_session(
            app_name="PennyWise", user_id=user_id, session_id=session_id
        )
        debug_info["steps"].append("✅ Session found")
        
        # Step 2: Create user message
        debug_info["steps"].append("Creating user message...")
        user_message = types.Content(role='user', parts=[types.Part(text=request.prompt)])
        debug_info["steps"].append("✅ User message created")
        
        # Step 3: Try runner.run_async with detailed logging
        debug_info["steps"].append("Starting runner.run_async...")
        
        events_received = []
        try:
            async for event in runner.run_async(
                user_id=user_id, session_id=session_id, new_message=user_message
            ):
                event_info = {
                    "author": getattr(event, 'author', 'unknown'),
                    "type": type(event).__name__,
                    "has_content": bool(getattr(event, 'content', None)),
                    "is_final": getattr(event, 'is_final_response', lambda: False)()
                }
                events_received.append(event_info)
                
                if len(events_received) >= 10:  # Limit to prevent huge responses
                    break
                    
        except Exception as runner_error:
            debug_info["steps"].append(f"❌ Runner error: {str(runner_error)}")
            debug_info["runner_error"] = str(runner_error)
            
        debug_info["events_received"] = events_received
        debug_info["steps"].append(f"✅ Received {len(events_received)} events")
        
        return {
            "status": "success" if "runner_error" not in debug_info else "error",
            "debug_info": debug_info
        }
        
    except Exception as e:
        debug_info["steps"].append(f"❌ Error: {str(e)}")
        return {
            "status": "error",
            "debug_info": debug_info,
            "error": str(e)
        }
