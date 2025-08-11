"""
Session management utilities for AI voice chat handlers.
"""

import uuid
import logging
from google.adk.agents.run_config import RunConfig
from google.genai import types

logger = logging.getLogger(__name__)


async def create_voice_session(user_id: str, handler_name: str):
    """Create a new voice chat session."""
    from adk_services import session_service
    
    session_id = f"{handler_name.lower()}_session_{uuid.uuid4()}"
    
    session = await session_service.create_session(
        app_name="PennyWise", user_id=user_id, session_id=session_id
    )
    logger.info(f"Successfully created new session: {session_id}")
    return session


def get_run_config() -> RunConfig:
    """Get the standard run configuration for voice chat sessions."""
    return RunConfig(
        response_modalities=[types.Modality.AUDIO],
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