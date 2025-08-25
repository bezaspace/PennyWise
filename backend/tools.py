import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
from models import (
    TransactionDB,
    BudgetDB,
    GoalDB,
    CategoryDB,
    TransactionType,
    PlanDB,
    InvestmentTradeDB,
    WatchlistItemDB,
    TradeType,
)
from typing import List, Dict, Any, Optional
import asyncio
import json
import logging
import os
import re
try:
    from exa_py import Exa
except Exception:
    Exa = None
from utils.time_utils import get_current_month_string, get_current_date_iso
from stock_service import get_quote as get_symbol_quote, get_quotes as get_symbol_quotes

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

# ---------------- Wrapper tools to avoid default values in schema ----------------
def add_transaction_payload(payload: dict) -> dict:
    """
    Wrapper that accepts a single payload object to avoid default values in tool schema.
    Expected payload keys: description (str), amount (float), category (str, optional),
    type (str, optional), date (str, optional)
    """
    description = payload.get("description")
    amount = payload.get("amount")
    if description is None or amount is None:
        raise ValueError("description and amount are required")
    return add_transaction(
        user_id="user_123",
        description=description,
        amount=float(amount),
        category=payload.get("category"),
        type=payload.get("type"),
        date=payload.get("date"),
    )

def create_budget_category_payload(payload: dict) -> dict:
    """
    Wrapper to create budget category using a single payload to avoid defaults in schema.
    Expected payload keys: category (str), limit (float), period (str, optional)
    """
    category_name = (payload.get("category") or payload.get("category_name") or "").strip()
    if not category_name:
        raise ValueError("category is required")
    limit = payload.get("limit")
    if limit is None:
        raise ValueError("limit is required")
    period = payload.get("period") or "monthly"
    return create_budget_category(category_name=category_name, limit=float(limit), period=period)

def get_latest_plan_payload(payload: dict) -> Optional[dict]:
    """
    Wrapper to fetch latest plan with optional month using a single payload.
    Expected payload keys: month (str, optional)
    """
    print(f"--- Tool: get_latest_plan_payload called with payload: {payload} ---")
    month = payload.get("month") if isinstance(payload, dict) else None
    result = get_latest_plan(month=month)
    try:
        if result:
            queue_tool_response("get_latest_plan_payload", result)
    except Exception:
        pass
    print(f"--- Tool: get_latest_plan_payload returning: {result} ---")
    return result

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
        
        try:
            queue_tool_response("get_transactions", result)
        except Exception:
            pass
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
        
        try:
            queue_tool_response("get_budgets", result)
        except Exception:
            pass
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
        try:
            queue_tool_response("get_goals", result)
        except Exception:
            pass
        return result
    finally:
        next(db_gen, None)


def get_financial_snapshot(payload: Optional[dict] = None) -> dict:
    """
    Returns a complete, read-only financial snapshot for the agent to analyze.

    payload (optional): {
        user_id?: str,
        days?: int  # window for recent transactions (default 90)
    }

    The snapshot intentionally EXCLUDES investments.trades/holdings/portfolio and watchlist
    per product decision.
    """
    payload = payload or {}
    user_id = payload.get("user_id") or "user_123"
    days = int(payload.get("days", 90))

    # Debug log for visibility in backend logs when this tool is invoked
    try:
        logger.info(f"get_financial_snapshot called for user={user_id} days={days}")
    except Exception:
        print(f"--- Tool: get_financial_snapshot called for user={user_id} days={days} ---")

    db_gen = get_db()
    db = next(db_gen)
    try:
        # Transactions (all, and filtered recent)
        all_tx = db.query(TransactionDB).order_by(TransactionDB.date.desc()).all()

        cutoff = datetime.now() - timedelta(days=days)
        recent_tx = []
        tx_list = []
        for t in all_tx:
            # Build common transaction dict
            txd = {
                "id": t.id,
                "description": t.description,
                "amount": float(t.amount),
                "category": t.category,
                "date": t.date,
                "type": (t.type.value if getattr(t, 'type', None) else None),
            }
            tx_list.append(txd)
            # Try to parse date to filter recent transactions
            try:
                parsed = datetime.fromisoformat(t.date)
            except Exception:
                parsed = None
            if parsed and parsed >= cutoff:
                recent_tx.append(txd)

        # Budgets, categories, goals
        budgets = db.query(BudgetDB).all()
        budgets_list = [
            {"id": b.id, "category": b.category, "limit": float(b.limit), "spent": float(b.spent or 0.0), "period": b.period}
            for b in budgets
        ]

        categories = db.query(CategoryDB).order_by(CategoryDB.name).all()
        categories_list = [{"id": c.id, "name": c.name, "type": c.type} for c in categories]

        goals = db.query(GoalDB).all()
        goals_list = [
            {"id": g.id, "title": g.title, "target_amount": float(g.target_amount), "current_amount": float(g.current_amount or 0.0), "deadline": g.deadline, "category": g.category}
            for g in goals
        ]

        # Latest plan — fetch directly from DB here to avoid emitting a separate
        # queued tool response (get_latest_plan() calls queue_tool_response()).
        try:
            query = db.query(PlanDB)
            plan_row = query.order_by(PlanDB.created_at.desc()).first()
            if not plan_row:
                latest_plan = None
            else:
                import json as _json
                allocations = _json.loads(plan_row.allocations_json) if plan_row.allocations_json else []
                goals = _json.loads(plan_row.goals_json) if plan_row.goals_json else []
                latest_plan = {
                    "id": plan_row.id,
                    "month": plan_row.month,
                    "income": plan_row.income,
                    "savings_rate": plan_row.savings_rate,
                    "emergency_fund_target": plan_row.emergency_fund_target,
                    "allocations": allocations,
                    "goals": goals,
                    "status": plan_row.status,
                }
        except Exception:
            latest_plan = None

        # Aggregates: total balance, monthly income/expenses estimate, spending by category (from recent window)
        total_balance = sum((float(t.get("amount") or 0.0) for t in tx_list))

        monthly_income = 0.0
        monthly_expenses = 0.0
        spending_by_category: Dict[str, float] = {}
        for t in recent_tx:
            amt = float(t.get("amount") or 0.0)
            if t.get("type") == "income" or amt > 0:
                monthly_income += amt if amt > 0 else 0.0
            else:
                # expense (stored as negative amounts in this DB)
                monthly_expenses += abs(amt)
                cat = t.get("category") or "Unknown"
                spending_by_category[cat] = spending_by_category.get(cat, 0.0) + abs(amt)

        aggregates = {
            "total_balance": round(total_balance, 2),
            "monthly_income_est": round(monthly_income, 2),
            "monthly_expenses_est": round(monthly_expenses, 2),
            "spending_by_category": {k: round(v, 2) for k, v in spending_by_category.items()},
            "transactions_window_days": days,
        }

        result = {
            "meta": {"user_id": user_id, "snapshot_time": datetime.now().isoformat(), "transactions_window_days": days},
            "transactions": tx_list,
            "recent_transactions": recent_tx,
            "budgets": budgets_list,
            "categories": categories_list,
            "goals": goals_list,
            "latest_plan": latest_plan,
            # investments and watchlist intentionally excluded as requested
            "aggregates": aggregates,
        }

        try:
            queue_tool_response("get_financial_snapshot", result)
        except Exception:
            pass

        return result
    finally:
        next(db_gen, None)


# ---------------- Exa search wrapper ----------------
def exa_search_payload(payload: dict) -> dict:
    """
    Wrapper to call Exa.search_and_contents with a payload dict.
    Expected payload keys: query (required), num_results, text, highlights, category, context
    Returns a normalized dict with a 'results' list suitable for frontend parsing.
    """
    if Exa is None:
        raise RuntimeError("exa_py not installed or failed to import")

    api_key = os.getenv('EXA_API_KEY')
    if not api_key:
        raise RuntimeError('EXA_API_KEY environment variable not set')

    query = payload.get('query')
    if not query or not isinstance(query, str):
        raise ValueError('query (string) is required')

    num_results = int(payload.get('num_results') or payload.get('numResults') or 5)
    text = payload.get('text', False)
    highlights = payload.get('highlights', False)
    category = payload.get('category')
    context = payload.get('context', False)

    exa = Exa(api_key)

    try:
        resp = exa.search_and_contents(
            query,
            text=text,
            highlights=highlights,
            num_results=num_results,
            category=category,
            context=context,
        )
    except Exception as e:
        logging.error(f"Exa search failed: {e}")
        raise

    # Normalize response to { results: [ { id, title, url, snippet, source, date, text?, highlights? } ] }
    normalized_results = []
    try:
        results = getattr(resp, 'results', None) or resp.get('results') if isinstance(resp, dict) else None
        # If SDK returns simple dict-like
        if results is None and isinstance(resp, dict):
            # Try top-level candidates
            for key in ('results', 'search_results', 'items', 'sources', 'web'):
                if key in resp and isinstance(resp[key], list):
                    results = resp[key]
                    break

        if results and isinstance(results, list):
            for r in results:
                # r may be object-like or dict-like
                try:
                    entry = {
                        'id': r.get('id') if isinstance(r, dict) else getattr(r, 'id', None),
                        'title': r.get('title') if isinstance(r, dict) else getattr(r, 'title', None),
                        'url': r.get('url') if isinstance(r, dict) else getattr(r, 'url', None),
                        'snippet': r.get('snippet') or r.get('highlights') if isinstance(r, dict) else None,
                        'source': r.get('source') if isinstance(r, dict) else None,
                        'date': r.get('publishedDate') or r.get('published_date') if isinstance(r, dict) else None,
                    }
                    # include text/highlights when requested
                    if text:
                        entry['text'] = r.get('text') if isinstance(r, dict) else getattr(r, 'text', None)
                    if highlights:
                        entry['highlights'] = r.get('highlights') if isinstance(r, dict) else getattr(r, 'highlights', None)

                    normalized_results.append(entry)
                except Exception:
                    continue
        else:
            # Fallback: if resp contains text or summary, create single entry
            content_text = None
            if isinstance(resp, dict):
                content_text = resp.get('text') or resp.get('summary') or json.dumps(resp)
            else:
                content_text = str(resp)
            normalized_results.append({
                'id': '0',
                'title': 'Search Results',
                'url': '#',
                'snippet': content_text[:800],
                'source': 'Exa',
                'date': None,
            })
    except Exception as e:
        logging.error(f"Error normalizing Exa response: {e}")
        # Return generic fallback
        normalized_results = [{
            'id': '0',
            'title': 'Search Results',
            'url': '#',
            'snippet': 'No results',
            'source': 'Exa',
            'date': None,
        }]

    result_payload = { 'results': normalized_results }
    return result_payload


def exa_productsearch_tool(payload: dict) -> dict:
    """
    Product alternatives search using Exa. Accepts either:
      - { query: str, num_results?: int, include_domains?: [str] }
      - { item: { name, brand?, description?, detected_price?, price_found?, category? }, num_results?: int }

    Returns normalized: { results: [ { id, title, url, snippet, source, date, price?, merchant?, image? } ] }
    """
    if Exa is None:
        raise RuntimeError("exa_py not installed or failed to import")

    api_key = os.getenv('EXA_API_KEY')
    if not api_key:
        raise RuntimeError('EXA_API_KEY environment variable not set')

    # Build query
    query = None
    num_results = int(payload.get('num_results') or payload.get('numResults') or 4)
    include_domains = payload.get('include_domains')

    item = payload.get('item')
    if item and isinstance(item, dict):
        name = (item.get('name') or '').strip()
        brand = (item.get('brand') or '').strip()
        category = (item.get('category') or '').strip()
        detected_price = item.get('detected_price')
        parts = []
        if brand:
            parts.append(brand)
        if name:
            parts.append(name)
        if category and not name:
            parts.append(category)
        base = ' '.join(parts) or name or category or payload.get('query')
        if detected_price:
            query = f"cheapest alternatives to {base} cheaper than ${detected_price} buy online"
        else:
            query = f"cheapest alternatives to {base} buy online price compare"
    else:
        query = payload.get('query')

    if not query or not isinstance(query, str):
        raise ValueError('query (or item.name) is required')

    exa = Exa(api_key)

    try:
        # Limit to Amazon results for now by including site:amazon.com in the query
        amazon_query = query
        if 'site:amazon.com' not in amazon_query.lower():
            amazon_query = f"site:amazon.com {query}"

        resp = exa.search_and_contents(
            amazon_query,
            text=True,
            highlights=False,
            num_results=num_results,
            category=None,
            context=False,
        )
    except Exception as e:
        logging.error(f"Exa product search failed: {e}")
        raise

    # Normalize response similar to exa_search_payload but try to extract images/prices
    normalized_results = []
    try:
        results = getattr(resp, 'results', None) or (resp.get('results') if isinstance(resp, dict) else None)
        if results is None and isinstance(resp, dict):
            for key in ('results', 'search_results', 'items', 'sources', 'web'):
                if key in resp and isinstance(resp[key], list):
                    results = resp[key]
                    break

        if results and isinstance(results, list):
            for r in results:
                try:
                    # unwrap dict-like or object-like
                    url = r.get('url') if isinstance(r, dict) else getattr(r, 'url', None)
                    title = r.get('title') if isinstance(r, dict) else getattr(r, 'title', None)
                    snippet = r.get('snippet') if isinstance(r, dict) else (r.get('highlights') if isinstance(r, dict) else getattr(r, 'text', None))
                    source = r.get('source') if isinstance(r, dict) else getattr(r, 'source', None)
                    date = r.get('publishedDate') or r.get('published_date') if isinstance(r, dict) else getattr(r, 'publishedDate', None)

                    # attempt to find image or price in common locations
                    image = None
                    price = None
                    merchant = None

                    # common keys
                    if isinstance(r, dict):
                        image = r.get('image') or r.get('thumbnail') or r.get('image_url')
                        merchant = r.get('merchant') or r.get('source')
                        # price may be embedded in structured fields
                        if 'price' in r:
                            try:
                                price = float(r.get('price'))
                            except Exception:
                                price = None

                    # fallback: try to extract a price from text
                    text_blob = ''
                    if isinstance(r, dict):
                        text_blob = (r.get('text') or r.get('snippet') or '')
                    else:
                        text_blob = getattr(r, 'text', '') or ''

                    if not price and isinstance(text_blob, str):
                        m = re.search(r"\$(\d+[\d,.]*)", text_blob)
                        if m:
                            try:
                                price = float(m.group(1).replace(',', ''))
                            except Exception:
                                price = None

                    entry = {
                        'id': (r.get('id') if isinstance(r, dict) else getattr(r, 'id', None)) or url or title,
                        'title': title,
                        'url': url,
                        'snippet': snippet,
                        'source': source,
                        'date': date,
                    }
                    if price is not None:
                        entry['price'] = price
                    if merchant:
                        entry['merchant'] = merchant
                    if image:
                        entry['image'] = image

                    normalized_results.append(entry)
                except Exception:
                    continue
        else:
            # Fallback: create single entry
            content_text = None
            if isinstance(resp, dict):
                content_text = resp.get('text') or resp.get('summary') or json.dumps(resp)
            else:
                content_text = str(resp)
            normalized_results.append({
                'id': '0',
                'title': 'Search Results',
                'url': '#',
                'snippet': content_text[:800],
                'source': 'Exa',
                'date': None,
            })
    except Exception as e:
        logging.error(f"Error normalizing Exa product response: {e}")
        normalized_results = [{
            'id': '0',
            'title': 'Search Results',
            'url': '#',
            'snippet': 'No results',
            'source': 'Exa',
            'date': None,
        }]

    # Deduplicate by url
    seen = set()
    deduped = []
    for it in normalized_results:
        u = (it.get('url') or '').rstrip('/') if it.get('url') else None
        key = u or it.get('title')
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        deduped.append(it)

    # Trim to requested num_results
    deduped = deduped[:num_results]
    # Try to canonicalize Amazon product pages by extracting ASINs and only keep product pages
    canonical = []
    asin_re = re.compile(r"(?:/dp/|/gp/product/|/product/|ASIN[\"']?:\s*[\"']?)([A-Z0-9]{10})", re.IGNORECASE)
    for it in deduped:
        url = (it.get('url') or '')
        snippet = it.get('snippet') or ''
        text_blob = ''
        # try to collect a text blob to search for ASIN
        if isinstance(it.get('snippet'), str):
            text_blob = it.get('snippet')
        # Search in URL first
        m = asin_re.search(url)
        if not m:
            # search in snippet/text
            m = asin_re.search(snippet)
        if not m:
            # look for common asin= query param
            m2 = re.search(r"[?&]asin=([A-Z0-9]{10})", url, re.IGNORECASE)
            if m2:
                m = m2

        if m:
            asin = m.group(1)
            canonical_url = f"https://www.amazon.com/dp/{asin}"
            # prefer canonical url
            it['url'] = canonical_url
            # normalize title if it contains Amazon prefix
            canonical.append(it)
        else:
            # If no ASIN, skip — we only want direct product pages for now
            continue

    # Trim to num_results after filtering
    canonical = canonical[:num_results]

    result_payload = { 'results': canonical }
    # Do not automatically queue duplicate tool responses. Only queue if there are pending websocket clients
    try:
        if _current_websocket:
            queue_tool_response('exa_productsearch_tool', result_payload)
    except Exception:
        pass

    return result_payload

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
    # Return plan; rely on ADK function_response to deliver to client
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
            month = get_current_month_string()
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
            deadline = g.get("deadline") or get_current_date_iso()
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

        summary = {
            "plan_id": plan_id,
            "month": month,
            "budgets_applied": applied_budgets,
            "goals_applied": applied_goals,
        }
        # Return summary; rely on ADK function_response to deliver to client
        return summary
    finally:
        next(db_gen, None)

def finalize_plan_payload(payload: dict) -> dict:
    """
    Wrapper to finalize a plan using a single payload and implicit user_id.
    Expected payload keys: plan (dict)
    """
    plan = payload.get("plan") if isinstance(payload, dict) else None
    if not isinstance(plan, dict):
        raise ValueError("payload.plan (dict) is required")
    return finalize_plan(user_id="user_123", plan=plan)

def get_latest_plan(month: Optional[str] = None) -> Optional[dict]:
    """
    Retrieve the most recent plan. If month is provided (e.g., "2025-08"),
    return the latest plan for that month. Returns a normalized plan dict or None.
    """
    print(f"--- Tool: get_latest_plan called for month: {month} ---")
    db_gen = get_db()
    db = next(db_gen)
    try:
        query = db.query(PlanDB)
        if month:
            query = query.filter(PlanDB.month == month)
        plan_row = query.order_by(PlanDB.created_at.desc()).first()
        if not plan_row:
            print("--- Tool: get_latest_plan - No plan found ---")
            return None
        import json as _json
        allocations = _json.loads(plan_row.allocations_json) if plan_row.allocations_json else []
        goals = _json.loads(plan_row.goals_json) if plan_row.goals_json else []
        result = {
            "id": plan_row.id,
            "month": plan_row.month,
            "income": plan_row.income,
            "savings_rate": plan_row.savings_rate,
            "emergency_fund_target": plan_row.emergency_fund_target,
            "allocations": allocations,
            "goals": goals,
            "status": plan_row.status,
        }
        print(f"--- Tool: get_latest_plan returning: {result} ---")
        try:
            if result:
                queue_tool_response("get_latest_plan", result)
        except Exception:
            pass
        return result
    finally:
        next(db_gen, None)

# ---------------- Investment Tools ----------------
def _compute_holdings_internal(db: Session) -> tuple[list[dict], dict[str, dict]]:
    """
    Compute current holdings from all trades in DB.
    Returns (holdings_list, by_symbol_map minimal data)
    """
    trades = (
        db.query(InvestmentTradeDB)
        .order_by(InvestmentTradeDB.date.asc(), InvestmentTradeDB.created_at.asc())
        .all()
    )
    by_symbol: dict[str, dict] = {}
    for t in trades:
        sym = (t.symbol or "").upper()
        if not sym:
            continue
        if sym not in by_symbol:
            by_symbol[sym] = {
                "symbol": sym,
                "company_name": t.company_name,
                "quantity": 0.0,
                "cost_basis_total": 0.0,
            }
        entry = by_symbol[sym]
        if t.type == TradeType.buy:
            entry["quantity"] += float(t.quantity)
            entry["cost_basis_total"] += float(t.price) * float(t.quantity) + float(
                t.fees or 0.0
            )
        else:
            entry["quantity"] -= float(t.quantity)
            if entry["quantity"] < 0:
                entry["quantity"] = round(entry["quantity"], 6)
        if t.company_name:
            entry["company_name"] = t.company_name

    holdings: list[dict] = []
    symbols = [s for s, d in by_symbol.items() if d["quantity"] > 0]
    quotes = get_symbol_quotes(symbols) if symbols else {}
    for sym, data in by_symbol.items():
        qty = float(data["quantity"])
        if qty <= 0:
            continue
        cost_basis_total = (
            float(data["cost_basis_total"]) if data["cost_basis_total"] > 0 else 0.0
        )
        avg_cost = (cost_basis_total / qty) if qty > 0 and cost_basis_total > 0 else 0.0
        q = quotes.get(sym)
        current_price = float(q["price"]) if q else 0.0
        value = qty * current_price
        unrealized = (current_price - avg_cost) * qty
        unrealized_pct = (
            ((current_price - avg_cost) / avg_cost * 100.0) if avg_cost > 0 else 0.0
        )
        holdings.append(
            {
                "symbol": sym,
                "company_name": data.get("company_name"),
                "quantity": qty,
                "average_cost": round(avg_cost, 6),
                "current_price": round(current_price, 6),
                "value": round(value, 2),
                "unrealized_gain": round(unrealized, 2),
                "unrealized_gain_percent": round(unrealized_pct, 4),
            }
        )
    return holdings, by_symbol


def get_investment_holdings() -> list[dict]:
    """
    Returns the user's current equity holdings aggregated from trades with real-time quotes.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        holdings, _ = _compute_holdings_internal(db)
        holdings.sort(key=lambda h: h.get("value", 0.0), reverse=True)
        try:
            queue_tool_response("get_investment_holdings", holdings)
        except Exception:
            pass
        return holdings
    finally:
        next(db_gen, None)


def get_portfolio_summary() -> dict:
    """
    Returns a summary of the user's portfolio: total value, day change, overall gain, and timestamps.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        holdings, _ = _compute_holdings_internal(db)
        symbols = [h["symbol"] for h in holdings]
        quotes = get_symbol_quotes(symbols) if symbols else {}

        total_value = 0.0
        overall_gain = 0.0
        total_prev_value = 0.0
        for h in holdings:
            sym = h["symbol"]
            qty = float(h["quantity"])
            avg_cost = float(h["average_cost"]) if h.get("average_cost") else 0.0
            q = quotes.get(sym)
            current_price = float(q["price"]) if q else 0.0
            prev_close = float(q["prev_close"]) if q else 0.0
            total_value += qty * current_price
            total_prev_value += qty * prev_close
            overall_gain += (current_price - avg_cost) * qty

        day_change = total_value - total_prev_value
        day_change_pct = (day_change / total_prev_value * 100.0) if total_prev_value > 0 else 0.0
        overall_gain_pct = (
            (overall_gain / (total_value - overall_gain) * 100.0)
            if (total_value - overall_gain) > 0
            else 0.0
        )
        last_updated = 0.0
        for sym in symbols:
            q = quotes.get(sym)
            if q:
                last_updated = max(last_updated, float(q.get("last_updated", 0.0)))

        summary = {
            "total_value": round(total_value, 2),
            "day_change": round(day_change, 2),
            "day_change_percent": round(day_change_pct, 4),
            "overall_gain": round(overall_gain, 2),
            "overall_gain_percent": round(overall_gain_pct, 4),
            "last_updated": last_updated,
        }
        try:
            queue_tool_response("get_portfolio_summary", summary)
        except Exception:
            pass
        return summary
    finally:
        next(db_gen, None)


def list_trades(limit: int) -> list[dict]:
    """
    Returns list of trades, most recent first. Optional limit to top N.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        q = db.query(InvestmentTradeDB).order_by(InvestmentTradeDB.created_at.desc())
        if limit and limit > 0:
            q = q.limit(limit)
        items = q.all()
        data = [
            {
                "id": t.id,
                "symbol": t.symbol,
                "company_name": t.company_name,
                "type": t.type.value,
                "quantity": float(t.quantity),
                "price": float(t.price),
                "fees": float(t.fees or 0.0),
                "date": t.date,
            }
            for t in items
        ]
        try:
            queue_tool_response("list_trades", data)
        except Exception:
            pass
        return data
    finally:
        next(db_gen, None)


def create_trade(
    symbol: str,
    type: str,
    quantity: float,
    price: float,
    fees: float,
    date: str,
    company_name: str,
) -> dict:
    """
    Creates a trade (buy/sell). Validates sells against owned quantity.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        symbol_u = (symbol or "").upper().strip()
        if not symbol_u:
            raise ValueError("Symbol is required")
        if quantity <= 0 or price <= 0:
            raise ValueError("Quantity and price must be positive")

        # Validate sell
        if type == "sell":
            trades = (
                db.query(InvestmentTradeDB)
                .filter(InvestmentTradeDB.symbol == symbol_u)
                .order_by(InvestmentTradeDB.date.asc(), InvestmentTradeDB.created_at.asc())
                .all()
            )
            owned = 0.0
            for t in trades:
                if t.type == TradeType.buy:
                    owned += float(t.quantity)
                else:
                    owned -= float(t.quantity)
            if quantity > owned + 1e-9:
                raise ValueError("Cannot sell more shares than owned")

        trade_id = str(uuid.uuid4())
        db_trade = InvestmentTradeDB(
            id=trade_id,
            symbol=symbol_u,
            company_name=company_name or None,
            type=TradeType(type),
            quantity=float(quantity),
            price=float(price),
            fees=float(fees),
            date=date or get_current_date_iso(),
        )
        db.add(db_trade)
        db.commit()
        db.refresh(db_trade)
        created = {
            "id": db_trade.id,
            "symbol": db_trade.symbol,
            "company_name": db_trade.company_name,
            "type": db_trade.type.value,
            "quantity": float(db_trade.quantity),
            "price": float(db_trade.price),
            "fees": float(db_trade.fees),
            "date": db_trade.date,
        }
        try:
            queue_tool_response("create_trade", created)
        except Exception:
            pass
        return created
    finally:
        next(db_gen, None)


def get_quote(symbol: str) -> dict:
    """
    Returns a real-time quote for a symbol.
    """
    q = get_symbol_quote(symbol)
    if not q:
        raise ValueError("Quote not available")
    try:
        queue_tool_response("get_quote", q)
    except Exception:
        pass
    return q


def get_watchlist() -> list[dict]:
    """
    Returns current watchlist items.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        items = db.query(WatchlistItemDB).order_by(WatchlistItemDB.created_at.desc()).all()
        data = [
            {"id": i.id, "symbol": i.symbol, "company_name": i.company_name}
            for i in items
        ]
        try:
            queue_tool_response("get_watchlist", data)
        except Exception:
            pass
        return data
    finally:
        next(db_gen, None)


def add_watchlist_item(symbol: str, company_name: str) -> dict:
    """
    Adds a symbol to watchlist if not present.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        symbol_u = (symbol or "").upper().strip()
        if not symbol_u:
            raise ValueError("Symbol is required")
        existing = db.query(WatchlistItemDB).filter(WatchlistItemDB.symbol == symbol_u).first()
        if existing:
            result = {
                "id": existing.id,
                "symbol": existing.symbol,
                "company_name": existing.company_name,
            }
            try:
                queue_tool_response("add_watchlist_item", result)
            except Exception:
                pass
            return result
        item = WatchlistItemDB(id=str(uuid.uuid4()), symbol=symbol_u, company_name=company_name)
        db.add(item)
        db.commit()
        db.refresh(item)
        result = {"id": item.id, "symbol": item.symbol, "company_name": item.company_name}
        try:
            queue_tool_response("add_watchlist_item", result)
        except Exception:
            pass
        return result
    finally:
        next(db_gen, None)


def delete_watchlist_item(identifier: str) -> dict:
    """
    Deletes a watchlist item by id or symbol.
    """
    db_gen = get_db()
    db = next(db_gen)
    try:
        item = (
            db.query(WatchlistItemDB)
            .filter((WatchlistItemDB.id == identifier) | (WatchlistItemDB.symbol == identifier.upper()))
            .first()
        )
        if not item:
            raise ValueError("Watchlist item not found")
        db.delete(item)
        db.commit()
        return {"message": "Watchlist item deleted"}
    finally:
        next(db_gen, None)
