import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import TransactionDB, BudgetDB, GoalDB, TransactionType
from typing import List, Dict, Any, Optional
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

# Global variable to store WebSocket connection for tool responses
_current_websocket = None
_pending_tool_messages = []

def set_websocket_for_tools(websocket):
    """Set the current WebSocket connection for tools to use"""
    global _current_websocket, _pending_tool_messages
    _current_websocket = websocket
    _pending_tool_messages = []

def clear_websocket_for_tools():
    """Clear the WebSocket connection"""
    global _current_websocket, _pending_tool_messages
    _current_websocket = None
    _pending_tool_messages = []

def queue_tool_response(tool_name: str, tool_data: Any):
    """Queue a tool response to be sent via WebSocket"""
    global _pending_tool_messages
    message = {
        "mime_type": "tool/response",
        "tool_name": tool_name,
        "tool_response": tool_data,
        "tool_id": None
    }
    _pending_tool_messages.append(message)
    logger.info(f"Queued tool response for {tool_name}: {len(tool_data) if isinstance(tool_data, list) else 'single item'}")

async def send_pending_tool_messages():
    """Send all pending tool messages"""
    global _current_websocket, _pending_tool_messages
    if _current_websocket and _pending_tool_messages:
        for message in _pending_tool_messages:
            try:
                await _current_websocket.send_text(json.dumps(message))
                logger.info(f"Sent tool response for {message['tool_name']}")
            except Exception as e:
                logger.error(f"Failed to send tool response: {e}")
        _pending_tool_messages = []

def add_transaction(
    user_id: str,
    description: str,
    amount: float,
    category: Optional[str] = None,
    type: Optional[str] = None,
    date: Optional[str] = None
) -> dict:
    """
    Adds a new transaction to the database. If category/type/date are missing, the AI can decide/fill them.
    Args:
        user_id (str): The ID of the user.
        description (str): Description of the transaction (required).
        amount (float): Amount spent or received (required).
        category (str, optional): Category of the transaction. AI can fill if missing.
        type (str, optional): 'income' or 'expense'. AI can fill if missing.
        date (str, optional): Date in ISO format. Defaults to now if missing.
    Returns:
        dict: The created transaction as a dictionary.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        transaction_id = str(uuid.uuid4())
        if not date:
            date = datetime.now().isoformat()
        if not category:
            category = "miscellaneous"  # AI can override if it infers better
        if not type:
            type = "expense" if amount < 0 else "income"  # AI can override if it infers better
        transaction = TransactionDB(
            id=transaction_id,
            description=description,
            amount=amount,
            category=category,
            date=date,
            type=TransactionType(type)
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return {
            "id": transaction.id,
            "description": transaction.description,
            "amount": transaction.amount,
            "category": transaction.category,
            "date": transaction.date,
            "type": transaction.type.value,
        }
    finally:
        next(db_gen, None)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_transactions(user_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves the 5 most recent transactions for a given user.
    Args:
        user_id (str): The ID of the user.
    Returns:
        A list of dictionaries, where each dictionary represents a transaction.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        transactions = db.query(TransactionDB).order_by(TransactionDB.date.desc()).limit(5).all()
        result = [
            {
                "id": t.id,
                "description": t.description,
                "amount": t.amount,
                "category": t.category,
                "date": t.date,
                "type": t.type.value,
            }
            for t in transactions
        ]
        
        # Queue tool response for WebSocket sending
        queue_tool_response("get_transactions", result)
        
        return result
    finally:
        next(db_gen, None)

def get_budgets(user_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves the current budgets for a given user.
    Args:
        user_id (str): The ID of the user.
    Returns:
        A list of dictionaries, where each dictionary represents a budget.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        budgets = db.query(BudgetDB).all()
        result = [
            {
                "id": b.id,
                "category": b.category,
                "limit": b.limit,
                "spent": b.spent,
                "period": b.period.value,
            }
            for b in budgets
        ]
        
        # Queue tool response for WebSocket sending
        queue_tool_response("get_budgets", result)
        
        return result
    finally:
        next(db_gen, None)

def get_goals(user_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves the current financial goals for a given user.
    Args:
        user_id (str): The ID of the user.
    Returns:
        A list of dictionaries, where each dictionary represents a financial goal.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        goals = db.query(GoalDB).all()
        result = [
            {
                "id": g.id,
                "title": g.title,
                "target_amount": g.target_amount,
                "current_amount": g.current_amount,
                "deadline": g.deadline,
                "category": g.category,
            }
            for g in goals
        ]
        
        # Queue tool response for WebSocket sending
        queue_tool_response("get_goals", result)
        
        return result
    finally:
        next(db_gen, None)
