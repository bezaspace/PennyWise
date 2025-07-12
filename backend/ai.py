import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
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
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        
        self.model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            safety_settings=[
                {
                    "category": HarmCategory.HARM_CATEGORY_HARASSMENT,
                    "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    "category": HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    "category": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    "category": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ],
            generation_config={
                "temperature": 0.7,
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 1024,
            }
        )

    async def generate_financial_advice(self, prompt: str) -> str:
        """Generate financial advice based on user prompt"""
        try:
            enhanced_prompt = f"""
            You are a helpful and friendly financial assistant. 
            A user is asking for advice. Respond in a conversational, clear, and concise manner.
            Keep the response focused on the user's question and provide actionable advice where possible.
            
            User query: {prompt}
            """

            response = self.model.generate_content(enhanced_prompt)
            return response.text
        except Exception as error:
            logger.error(f'Gemini API error in generate_financial_advice: {error}')
            raise Exception('Failed to generate financial advice. Please try again.')

gemini_service = GeminiService()

# --- API Router ---

router = APIRouter(prefix="/api/ai", tags=["AI"])

@router.post("/financial-advice", response_model=FinancialAdviceResponse)
async def get_financial_advice(request: FinancialAdviceRequest):
    """Generate financial advice based on user prompt"""
    try:
        advice = await gemini_service.generate_financial_advice(request.prompt)
        return FinancialAdviceResponse(advice=advice)
    except Exception as e:
        logger.error(f"Error generating financial advice: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate financial advice")

