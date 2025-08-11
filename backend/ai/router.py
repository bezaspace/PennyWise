"""
Main AI router that defines all AI-related endpoints.
"""

from fastapi import APIRouter, WebSocket
from pydantic import BaseModel
from typing import Dict, Any, Optional

from .unified_handler import unified_voice_chat_ws
from .planning_handler import planning_voice_chat_ws
from .investment_handler import investment_voice_chat_ws

# --- Pydantic Models ---

class FinancialAdviceRequest(BaseModel):
    prompt: str

class ReceiptUploadResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    message: str

# --- Router Setup ---

router = APIRouter(prefix="/api/ai", tags=["AI"])

# Register WebSocket endpoints
@router.websocket("/unified/voice/ws/{user_id}")
async def unified_voice_ws_endpoint(websocket: WebSocket, user_id: str):
    await unified_voice_chat_ws(websocket, user_id)

@router.websocket("/voice/ws/{user_id}")  # Backward compatibility
async def voice_ws_endpoint(websocket: WebSocket, user_id: str):
    await unified_voice_chat_ws(websocket, user_id)

@router.websocket("/planner/voice/ws/{user_id}")
async def planning_voice_ws_endpoint(websocket: WebSocket, user_id: str):
    await planning_voice_chat_ws(websocket, user_id)

@router.websocket("/invest/voice/ws/{user_id}")
async def investment_voice_ws_endpoint(websocket: WebSocket, user_id: str):
    await investment_voice_chat_ws(websocket, user_id)