"""
Planning voice chat WebSocket handler.
"""

import logging
from fastapi import WebSocket
from .websocket_base import BaseVoiceHandler

logger = logging.getLogger(__name__)


async def planning_voice_chat_ws(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for live AI voice chat dedicated to planning."""
    from adk_services import planning_runner
    
    handler = BaseVoiceHandler(
        websocket=websocket,
        user_id=user_id,
        agent_runner=planning_runner,
        handler_name="planner"
    )
    
    await handler.handle_connection()