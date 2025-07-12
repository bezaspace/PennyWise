import os
from dotenv import load_dotenv; load_dotenv()
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from google import genai
from google.genai import types
from pydantic import BaseModel

from database import get_db

# --- Pydantic Models ---

class FinancialAdviceRequest(BaseModel):
    prompt: str

class FinancialAdviceResponse(BaseModel):
    advice: str

class AIErrorResponse(BaseModel):
    error: str
    message: str

# --- Gemini Service ---

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        self.client = genai.Client(api_key=api_key)

    async def generate_financial_advice(self, prompt: str) -> str:
        """Generate financial advice based on user prompt"""
        try:
            system_instruction = """
            You are a helpful and friendly financial assistant. 
            A user is asking for advice. Respond in a conversational, clear, and concise manner.
            Keep the response focused on the user's question and provide actionable advice where possible.
            """
            

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=1024,
                    system_instruction=system_instruction
                )
            )
            return response.text
        except Exception as error:
            logger.error(f'Gemini API error in generate_financial_advice: {error}')
            raise Exception('Failed to generate financial advice. Please try again.')

gemini_service = GeminiService()

# --- API Router ---

router = APIRouter(prefix="/api/ai", tags=["AI"])

@router.post("/chat", response_model=FinancialAdviceResponse)
async def chat(request: FinancialAdviceRequest):
    """Generate AI chat response based on user prompt"""
    try:
        advice = await gemini_service.generate_financial_advice(request.prompt)
        return FinancialAdviceResponse(advice=advice)
    except Exception as e:
        logger.error(f"Error generating AI chat response: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI chat response")
