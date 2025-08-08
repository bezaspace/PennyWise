import base64
import logging
from typing import Dict, Any, Optional
from google import genai
from google.genai import types
import json
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class ReceiptService:
    """Service for processing receipt images using Gemini vision capabilities."""
    
    def __init__(self):
        self.client = genai.Client()
    
    async def extract_receipt_data(self, image_data: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Extract transaction details from a receipt image using Gemini vision.
        
        Args:
            image_data: Raw image bytes
            mime_type: MIME type of the image (e.g., 'image/jpeg', 'image/png')
            
        Returns:
            Dictionary containing extracted receipt data
        """
        try:
            # Create image part for Gemini
            image_part = types.Part.from_bytes(
                data=image_data,
                mime_type=mime_type
            )
            
            # Craft a detailed prompt for receipt extraction
            prompt = """
            Analyze this receipt image and extract the following information in JSON format:
            
            {
                "merchant": "Name of the store/restaurant",
                "amount": "Total amount as a number (positive for expenses)",
                "date": "Date in ISO format (YYYY-MM-DD), use today's date if not clear",
                "category": "Best category guess (food, groceries, gas, shopping, entertainment, etc.)",
                "description": "Brief description of the purchase",
                "items": ["list of main items purchased if visible"],
                "confidence": "high/medium/low based on image clarity"
            }
            
            Rules:
            - IMPORTANT: Look for the TOTAL amount, GRAND TOTAL, or final amount to pay. This is usually the largest number on the receipt.
            - Amount should be the final total including tax, but not including tips unless explicitly part of total
            - Look for keywords like "Total", "Grand Total", "Amount Due", "Balance Due", or currency symbols
            - If multiple amounts are visible, choose the final total amount to be paid
            - Use common expense categories: food, groceries, gas, shopping, entertainment, healthcare, transportation, etc.
            - If date is unclear, use today's date
            - Be conservative with confidence rating
            - If this is not a receipt, return {"error": "Not a valid receipt image"}
            
            Return only valid JSON, no additional text.
            """
            
            # Generate content using Gemini
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[image_part, prompt]
            )
            
            if not response.text:
                raise ValueError("No response from Gemini")
            
            # Parse the JSON response
            receipt_data = self._parse_gemini_response(response.text)
            
            # Validate and clean the data
            cleaned_data = self._validate_and_clean_data(receipt_data)
            
            logger.info(f"Successfully extracted receipt data: {cleaned_data}")
            return cleaned_data
            
        except Exception as e:
            logger.error(f"Error extracting receipt data: {e}")
            return {
                "error": f"Failed to process receipt: {str(e)}",
                "confidence": "low"
            }

    async def analyze_item_image(self, image_data: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Analyze a general shopping item photo to identify the item and detect price if visible.
        Returns a structured object suitable for follow-up in chat.
        """
        try:
            image_part = types.Part.from_bytes(data=image_data, mime_type=mime_type)

            prompt = """
            You are analyzing a shopping product photo. Return STRICT JSON only.

            Extract:
            {
              "name": "Short product name (e.g., 'Nike Air Max 270')",
              "brand": "Brand if visible, else empty string",
              "description": "1-2 sentence helpful description of what this is",
              "category": "Best everyday spending category (groceries, food, shopping, entertainment, transportation, healthcare, etc.)",
              "detected_price": "If a clear price tag/label is visible, the numeric price; else null",
              "price_found": "true if a reliable price is visible; else false",
              "confidence": "high|medium|low"
            }

            Rules:
            - Do NOT guess a price. Only set detected_price when a literal price is clearly visible.
            - If multiple prices are visible, choose the most prominent/likely final price.
            - Keep description concise and useful.
            - If this is clearly a receipt, return {"error": "This is a receipt image"}.
            - Return only valid JSON.
            """

            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[image_part, prompt]
            )

            if not response.text:
                raise ValueError("No response from Gemini (item analysis)")

            raw_data = self._parse_gemini_response(response.text)
            if "error" in raw_data:
                return {"error": raw_data.get("error", "Item analysis failed"), "confidence": "low"}

            cleaned = self._validate_and_clean_item_data(raw_data)
            cleaned["type"] = "item"
            logger.info(f"Successfully analyzed item image: {cleaned}")
            return cleaned

        except Exception as e:
            logger.error(f"Error analyzing item image: {e}")
            return {
                "error": f"Failed to analyze item image: {str(e)}",
                "confidence": "low"
            }

    def _validate_and_clean_item_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and normalize item analysis data."""
        if "error" in data:
            return data

        cleaned: Dict[str, Any] = {}

        cleaned["name"] = str(data.get("name", "Unknown item")).strip() or "Unknown item"
        cleaned["brand"] = str(data.get("brand", "")).strip()
        cleaned["description"] = str(data.get("description", "Item of interest")).strip() or "Item of interest"

        category = str(data.get("category", "shopping")).lower().strip()
        category_mapping = {
            "groceries": "groceries",
            "grocery": "groceries",
            "food": "food",
            "restaurant": "food",
            "dining": "food",
            "transportation": "transportation",
            "gas": "transportation",
            "fuel": "transportation",
            "entertainment": "entertainment",
            "health": "healthcare",
            "healthcare": "healthcare",
            "pharmacy": "healthcare",
            "shopping": "shopping",
            "retail": "shopping",
        }
        cleaned["category"] = category_mapping.get(category, "shopping")

        detected_price = None
        try:
            if data.get("detected_price") is not None:
                detected_price = float(data.get("detected_price"))
        except (ValueError, TypeError):
            detected_price = None
        cleaned["detected_price"] = detected_price
        cleaned["price_found"] = bool(data.get("price_found", detected_price is not None))

        confidence = str(data.get("confidence", "medium")).lower()
        cleaned["confidence"] = confidence if confidence in ["high", "medium", "low"] else "medium"

        return cleaned
    
    def _parse_gemini_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Gemini's response and extract JSON."""
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                # If no JSON found, try parsing the entire response
                return json.loads(response_text.strip())
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON response: {e}")
            # Return a fallback structure
            return {
                "error": "Could not parse receipt data",
                "raw_response": response_text,
                "confidence": "low"
            }
    
    def _validate_and_clean_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean extracted receipt data."""
        if "error" in data:
            return data
        
        cleaned = {}
        
        # Merchant name
        cleaned["merchant"] = str(data.get("merchant", "Unknown Merchant")).strip()
        
        # Amount - ensure it's a positive number for expenses
        try:
            amount = float(data.get("amount", 0))
            cleaned["amount"] = abs(amount)  # Make positive for expenses
        except (ValueError, TypeError):
            cleaned["amount"] = 0.0
            cleaned["amount_warning"] = "Could not parse amount"
        
        # Date - ensure valid ISO format
        date_str = data.get("date", "")
        try:
            if date_str:
                # Try to parse the date
                parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                cleaned["date"] = parsed_date.strftime('%Y-%m-%d')
            else:
                # Use today's date
                cleaned["date"] = datetime.now().strftime('%Y-%m-%d')
        except:
            cleaned["date"] = datetime.now().strftime('%Y-%m-%d')
            cleaned["date_warning"] = "Used today's date due to parsing error"
        
        # Category - normalize to common categories
        category = str(data.get("category", "miscellaneous")).lower().strip()
        category_mapping = {
            "food": "food",
            "restaurant": "food",
            "dining": "food",
            "groceries": "groceries",
            "grocery": "groceries",
            "gas": "transportation",
            "fuel": "transportation",
            "shopping": "shopping",
            "retail": "shopping",
            "entertainment": "entertainment",
            "medical": "healthcare",
            "health": "healthcare",
            "pharmacy": "healthcare"
        }
        cleaned["category"] = category_mapping.get(category, "miscellaneous")
        
        # Description
        description = data.get("description", "")
        if not description and cleaned["merchant"]:
            description = f"Purchase at {cleaned['merchant']}"
        cleaned["description"] = str(description).strip() or "Receipt purchase"
        
        # Items (optional)
        items = data.get("items", [])
        if isinstance(items, list):
            cleaned["items"] = [str(item).strip() for item in items if item]
        else:
            cleaned["items"] = []
        
        # Confidence
        confidence = str(data.get("confidence", "medium")).lower()
        cleaned["confidence"] = confidence if confidence in ["high", "medium", "low"] else "medium"
        
        return cleaned

# Global instance
receipt_service = ReceiptService()