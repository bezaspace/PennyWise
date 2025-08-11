"""
Base WebSocket handler with common functionality for all AI voice chat endpoints.
"""

import asyncio
import json
import logging
from typing import Any, Dict
from fastapi import WebSocket
from google.adk.agents.run_config import RunConfig
from google.adk.agents import LiveRequestQueue
from google.genai import types

from .websocket_utils import process_event, handle_client_message
from .session_manager import create_voice_session, get_run_config

logger = logging.getLogger(__name__)


class BaseVoiceHandler:
    """Base class for voice chat WebSocket handlers."""
    
    def __init__(self, websocket: WebSocket, user_id: str, agent_runner, handler_name: str):
        self.websocket = websocket
        self.user_id = user_id
        self.agent_runner = agent_runner
        self.handler_name = handler_name
        self.session = None
        self.live_request_queue = None
        self.live_events = None
        
    async def setup_session(self) -> bool:
        """Setup session and live request queue. Returns True if successful."""
        try:
            self.session = await create_voice_session(self.user_id, self.handler_name)
            logger.info(f"{self.handler_name} session created: {self.session}")
            return True
        except Exception as e:
            logger.error(f"Failed to create {self.handler_name} session: {e}")
            await self.websocket.close(code=1011, reason="Session creation failed")
            return False
    
    async def setup_live_session(self) -> bool:
        """Setup live session with ADK. Returns True if successful."""
        try:
            run_config = get_run_config()
            self.live_request_queue = LiveRequestQueue()
            self.live_events = self.agent_runner.run_live(
                session=self.session,
                live_request_queue=self.live_request_queue,
                run_config=run_config,
            )
            logger.info(f"{self.handler_name} live session started")
            return True
        except Exception as e:
            logger.error(f"Failed to start {self.handler_name} live session: {e}")
            await self.websocket.close(code=1011, reason="Live session setup failed")
            return False
    
    async def agent_to_client(self):
        """Handle events from agent and send to client."""
        try:
            async for event in self.live_events:
                await process_event(event, self.websocket)
        except Exception as e:
            logger.error(f"Error in {self.handler_name} agent_to_client: {e}")
            try:
                if self.websocket.client_state.CONNECTED:
                    await self.websocket.send_text(json.dumps({
                        "error": True, 
                        "message": "Connection error occurred"
                    }))
            except Exception as send_err:
                logger.warning(f"Failed to send error message: {send_err}")
    
    async def client_to_agent(self):
        """Handle messages from client and send to agent."""
        try:
            while True:
                message_json = await self.websocket.receive_text()
                message = json.loads(message_json)
                await handle_client_message(message, self.live_request_queue)
        except Exception as e:
            logger.error(f"Error in {self.handler_name} client_to_agent: {e}")
            return
    
    async def run_concurrent_tasks(self):
        """Run agent_to_client and client_to_agent concurrently."""
        try:
            agent_task = asyncio.create_task(self.agent_to_client())
            client_task = asyncio.create_task(self.client_to_agent())
            
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
            
            # Check for exceptions
            for task in done:
                try:
                    await task
                except Exception as e:
                    logger.error(f"{self.handler_name} WebSocket task error: {e}")
                    
        except Exception as e:
            logger.error(f"{self.handler_name} WebSocket connection error: {e}")
    
    async def cleanup(self):
        """Clean up resources."""
        from tools import clear_websocket_for_tools
        clear_websocket_for_tools()
        
        try:
            if self.live_request_queue:
                self.live_request_queue.close()
        except Exception as e:
            logger.warning(f"Error closing live_request_queue: {e}")
        
        try:
            if self.websocket.client_state.CONNECTED:
                await self.websocket.close()
        except Exception as e:
            logger.warning(f"Error closing websocket: {e}")
    
    async def handle_connection(self):
        """Main handler method that orchestrates the entire WebSocket connection."""
        await self.websocket.accept()
        logger.info(f"{self.handler_name} voice chat WebSocket connected for user: {self.user_id}")
        
        # Set up tools WebSocket reference
        from tools import set_websocket_for_tools
        set_websocket_for_tools(self.websocket)
        
        try:
            # Setup session and live session
            if not await self.setup_session():
                return
            if not await self.setup_live_session():
                return
            
            # Run concurrent tasks
            await self.run_concurrent_tasks()
            
        finally:
            await self.cleanup()