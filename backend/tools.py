import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import TransactionDB, BudgetDB, GoalDB, CategoryDB, TransactionType
from models import PlanDB
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
            type = "expense"  # Always record as expense
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

def create_budget_category(category_name: str, limit: float, period: str = "monthly") -> dict:
    """
    Creates a new budget category and a corresponding budget.
    Args:
        category_name (str): The name of the new category.
        limit (float): The budget limit for this category.
        period (str): The budget period (e.g., "monthly"). Defaults to "monthly".
    Returns:
        dict: The created budget.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Check if category exists
        category = db.query(CategoryDB).filter(CategoryDB.name == category_name).first()
        if not category:
            # Create category with default type
            category_id = str(uuid.uuid4())
            category = CategoryDB(id=category_id, name=category_name, type="expense")
            db.add(category)
            db.commit()
            db.refresh(category)

        # Check if budget for this category already exists
        existing_budget = db.query(BudgetDB).filter(BudgetDB.category == category_name, BudgetDB.period == period).first()
        if existing_budget:
            raise ValueError("Budget for this category and period already exists")

        # Create budget
        budget_id = str(uuid.uuid4())
        db_budget = BudgetDB(
            id=budget_id,
            category=category_name,
            limit=limit,
            spent=0.0,
            period=period
        )
        db.add(db_budget)
        db.commit()
        db.refresh(db_budget)

        return {
            "id": db_budget.id,
            "category": db_budget.category,
            "limit": db_budget.limit,
            "spent": db_budget.spent,
            "period": db_budget.period
        }
    finally:
        next(db_gen, None)


def delete_budget_category(category_name: str) -> dict:
    """
    Deletes a budget category and associated budgets.
    Args:
        category_name (str): The name of the category to delete.
    Returns:
        dict: A confirmation message.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        category = db.query(CategoryDB).filter(CategoryDB.name == category_name).first()
        if not category:
            raise ValueError("Category not found")

        # Ensure 'Unknown' category exists
        unknown_category = db.query(CategoryDB).filter(CategoryDB.name == "Unknown").first()
        if not unknown_category:
            unknown_category_id = str(uuid.uuid4())
            unknown_category = CategoryDB(id=unknown_category_id, name="Unknown", type="expense")
            db.add(unknown_category)
            db.flush()

        # Update transactions to 'Unknown' category
        db.query(TransactionDB).filter(TransactionDB.category == category.name).update({TransactionDB.category: "Unknown"})

        # Delete budgets for this category
        db.query(BudgetDB).filter(BudgetDB.category == category.name).delete()

        db.delete(category)
        db.commit()
        return {"detail": "Category deleted, transactions updated to 'Unknown', budgets removed."}
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
                "period": b.period,
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

def create_goal(goal_data: dict) -> dict:
    """
    Creates a new financial goal.
    Args:
        goal_data (dict): Data for the new goal. Must include:
            - title (str): The title of the goal. Required.
            - target_amount (float): The target amount to save. Required.
            - deadline (str): The deadline for the goal (ISO format). Required.
            - category (str): The category for the goal. Required.
            - current_amount (float, optional): The current amount saved. Defaults to 0.0.
    Returns:
        dict: The created goal.
    Raises:
        ValueError: If any required field is missing.
    """
    required_fields = ["title", "target_amount", "deadline", "category"]
    missing_fields = [field for field in required_fields if field not in goal_data]
    if missing_fields:
        raise ValueError(f"Missing required fields for goal creation: {', '.join(missing_fields)}")

    db_gen = get_db()
    db = next(db_gen)
    try:
        goal_id = str(int(datetime.now().timestamp() * 1000))
        db_goal = GoalDB(
            id=goal_id,
            title=goal_data["title"],
            target_amount=goal_data["target_amount"],
            current_amount=goal_data.get("current_amount", 0.0),
            deadline=goal_data["deadline"],
            category=goal_data["category"]
        )
        db.add(db_goal)
        db.commit()
        db.refresh(db_goal)
        return {
            "id": db_goal.id,
            "title": db_goal.title,
            "target_amount": db_goal.target_amount,
            "current_amount": db_goal.current_amount,
            "deadline": db_goal.deadline,
            "category": db_goal.category
        }
    finally:
        next(db_gen, None)

def update_goal(goal_id: str, updates: dict) -> dict:
    """
    Updates an existing financial goal.
    Args:
        goal_id (str): The ID of the goal to update.
        updates (dict): Fields to update.
    Returns:
        dict: The updated goal.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        goal = db.query(GoalDB).filter(GoalDB.id == goal_id).first()
        if not goal:
            raise ValueError("Goal not found")
        for field, value in updates.items():
            setattr(goal, field, value)
        db.commit()
        db.refresh(goal)
        return {
            "id": goal.id,
            "title": goal.title,
            "target_amount": goal.target_amount,
            "current_amount": goal.current_amount,
            "deadline": goal.deadline,
            "category": goal.category
        }
    finally:
        next(db_gen, None)

def delete_goal(goal_id: str) -> bool:
    """
    Deletes a financial goal.
    Args:
        goal_id (str): The ID of the goal to delete.
    Returns:
        bool: True if deleted, False otherwise.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        goal = db.query(GoalDB).filter(GoalDB.id == goal_id).first()
        if not goal:
            return False
        db.delete(goal)
        db.commit()
        return True
    finally:
        next(db_gen, None)

# ---------------- Planning Tools ----------------
def _ensure_categories_internal(db: Session, category_names: list[str]) -> list[dict]:
    ensured = []
    for name in category_names:
        if not name:
            continue
        existing = db.query(CategoryDB).filter(CategoryDB.name == name).first()
        if not existing:
            category_id = str(uuid.uuid4())
            new_cat = CategoryDB(id=category_id, name=name, type="expense")
            db.add(new_cat)
            db.flush()
            ensured.append({"id": category_id, "name": name, "type": "expense"})
        else:
            ensured.append({"id": existing.id, "name": existing.name, "type": existing.type})
    return ensured

def emit_plan_preview(plan: dict) -> dict:
    """
    Queue a plan preview for the voice UI as a tool/response, so the client can render a PlanPreview widget.
    The plan dict is expected to contain keys: month, income, savings_rate, emergency_fund_target,
    allocations (list of {category, amount}), goals (optional list of {title, target_amount, current_amount, deadline, category}).
    """
    # Minimal validation
    month = plan.get("month")
    allocations = plan.get("allocations", [])
    if not month or not isinstance(allocations, list):
        raise ValueError("Invalid plan: must include 'month' and 'allocations' list")
    # Send to client for preview
    queue_tool_response("emit_plan_preview", plan)
    return plan

def finalize_plan(user_id: str, plan: dict) -> dict:
    """
    Apply a proposed plan by creating/updating budgets and goals. Also persists the plan as approved in PlanDB.
    Returns a summary with created/updated items.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        month = plan.get("month")
        if not month:
            # Default to current month YYYY-MM
            month = datetime.now().strftime("%Y-%m")
        allocations = plan.get("allocations", []) or []
        goals = plan.get("goals", []) or []

        # Ensure categories
        category_names = [a.get("category") for a in allocations if a.get("category")]
        _ensure_categories_internal(db, category_names)

        # Upsert budgets for this month (we are not storing month granularity in BudgetDB; assume monthly period)
        applied_budgets = []
        for alloc in allocations:
            category = alloc.get("category")
            amount = float(alloc.get("amount", 0))
            if not category:
                continue
            existing = db.query(BudgetDB).filter(BudgetDB.category == category, BudgetDB.period == "monthly").first()
            if existing:
                existing.limit = amount
                db.add(existing)
                db.flush()
                applied_budgets.append({
                    "id": existing.id, "category": existing.category, "limit": existing.limit,
                    "spent": existing.spent, "period": existing.period
                })
            else:
                budget_id = str(uuid.uuid4())
                db_budget = BudgetDB(id=budget_id, category=category, limit=amount, spent=0.0, period="monthly")
                db.add(db_budget)
                db.flush()
                applied_budgets.append({
                    "id": db_budget.id, "category": db_budget.category, "limit": db_budget.limit,
                    "spent": db_budget.spent, "period": db_budget.period
                })

        # Upsert goals
        applied_goals = []
        for g in goals:
            title = g.get("title")
            if not title:
                continue
            target_amount = float(g.get("target_amount", 0.0))
            current_amount = float(g.get("current_amount", 0.0))
            deadline = g.get("deadline") or datetime.now().strftime("%Y-%m-%d")
            category = g.get("category") or "Savings"

            # Try to find a goal by title (simple heuristic)
            existing_goal = db.query(GoalDB).filter(GoalDB.title == title).first()
            if existing_goal:
                existing_goal.target_amount = target_amount
                existing_goal.current_amount = current_amount
                existing_goal.deadline = deadline
                existing_goal.category = category
                db.add(existing_goal)
                db.flush()
                applied_goals.append({
                    "id": existing_goal.id, "title": existing_goal.title,
                    "target_amount": existing_goal.target_amount,
                    "current_amount": existing_goal.current_amount,
                    "deadline": existing_goal.deadline,
                    "category": existing_goal.category,
                })
            else:
                goal_id = str(uuid.uuid4())
                db_goal = GoalDB(
                    id=goal_id, title=title, target_amount=target_amount,
                    current_amount=current_amount, deadline=deadline, category=category
                )
                db.add(db_goal)
                db.flush()
                applied_goals.append({
                    "id": db_goal.id, "title": db_goal.title,
                    "target_amount": db_goal.target_amount,
                    "current_amount": db_goal.current_amount,
                    "deadline": db_goal.deadline,
                    "category": db_goal.category,
                })

        # Persist approved plan (optional)
        import json as _json
        plan_id = str(uuid.uuid4())
        db_plan = PlanDB(
            id=plan_id,
            month=month,
            income=plan.get("income"),
            savings_rate=plan.get("savings_rate"),
            emergency_fund_target=plan.get("emergency_fund_target"),
            allocations_json=_json.dumps(allocations),
            goals_json=_json.dumps(goals) if goals else None,
            status="approved",
        )
        db.add(db_plan)
        db.commit()

        # Queue tool responses so the client updates widgets
        queue_tool_response("get_budgets", applied_budgets)
        queue_tool_response("get_goals", applied_goals)

        summary = {
            "plan_id": plan_id,
            "month": month,
            "budgets_applied": applied_budgets,
            "goals_applied": applied_goals,
        }
        queue_tool_response("finalize_plan", summary)
        return summary
    finally:
        next(db_gen, None)
