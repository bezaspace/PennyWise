"""
Investment voice chat WebSocket handler.
"""

import logging
from fastapi import WebSocket
from .websocket_base import BaseVoiceHandler

logger = logging.getLogger(__name__)


async def investment_voice_chat_ws(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for live AI voice chat dedicated to investments."""
    from adk_services import investment_runner
    
    handler = BaseVoiceHandler(
        websocket=websocket,
        user_id=user_id,
        agent_runner=investment_runner,
        handler_name="invest"
    )
    
    await handler.handle_connection()