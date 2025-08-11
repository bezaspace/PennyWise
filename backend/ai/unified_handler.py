"""
Unified voice chat WebSocket handler.
"""

import logging
from fastapi import WebSocket
from .websocket_base import BaseVoiceHandler

logger = logging.getLogger(__name__)


async def unified_voice_chat_ws(websocket: WebSocket, user_id: str):
    """Unified WebSocket endpoint for live AI voice chat using the unified coordinator agent."""
    from adk_services import unified_runner
    
    handler = BaseVoiceHandler(
        websocket=websocket,
        user_id=user_id,
        agent_runner=unified_runner,
        handler_name="unified"
    )
    
    await handler.handle_connection()