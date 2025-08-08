from fastapi import FastAPI, Depends, HTTPException, Body
app = FastAPI(title="PennyWise Finance API", version="1.0.0")
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import uuid
import os
from dotenv import load_dotenv

from database import get_db, create_tables, seed_database, engine
from models import (
    TransactionDB, BudgetDB, GoalDB, CategoryDB,
    Transaction, TransactionCreate,
    Budget, BudgetCreate, BudgetUpdate,
    Goal, GoalCreate, GoalUpdate,
    Category, CategoryCreate, CategoryUpdate,
    AnalyticsBalance, AnalyticsIncome, AnalyticsExpenses, AnalyticsSpending,
    TransactionType, CategoryType,
    # Investments models
    InvestmentTradeDB, WatchlistItemDB, TradeType,
    InvestmentTrade, InvestmentTradeCreate, InvestmentTradeUpdate,
    Holding as HoldingModel, PortfolioSummary as PortfolioSummaryModel,
    WatchlistItem as WatchlistItemModel, Quote as QuoteModel,
)
from ai import router as ai_router
from adk_services import initialize_adk_services
from stock_service import get_quote, get_quotes

load_dotenv()


# ... (imports)

from tools import create_budget_category, delete_budget_category

# ... (other code)

@app.post("/api/budget-category", response_model=Budget)
def create_category_and_budget(
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    try:
        return create_budget_category(
            category_name=data.get("category", "").strip(),
            limit=data.get("limit"),
            period=data.get("period", "monthly")
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/budget-category/{category_name}")
def delete_category_and_budget(
    category_name: str,
    db: Session = Depends(get_db)
):
    try:
        return delete_budget_category(category_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# ... (rest of the file)


# Include AI routes
app.include_router(ai_router)

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:8081").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    create_tables()
    initialize_adk_services(engine)
    seed_database()

# Health check
@app.get("/")
def read_root():
    return {"message": "PennyWise Finance API is running!"}

# Transaction endpoints
@app.get("/api/transactions", response_model=List[Transaction])
def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(TransactionDB).order_by(TransactionDB.created_at.desc()).all()
    # Convert enum to string for API response
    result = []
    for t in transactions:
        result.append(Transaction(
            id=t.id,
            description=t.description,
            amount=t.amount,
            category=t.category,
            date=t.date,
            type=t.type.value  # Convert enum to string
        ))
    return result

@app.post("/api/transactions", response_model=Transaction)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    # Generate ID based on timestamp
    transaction_id = str(int(datetime.now().timestamp() * 1000))
    
    db_transaction = TransactionDB(
        id=transaction_id,
        description=transaction.description,
        amount=transaction.amount,
        category=transaction.category,
        date=transaction.date,
        type=TransactionType(transaction.type)
    )
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    # Return with string type value
    return Transaction(
        id=db_transaction.id,
        description=db_transaction.description,
        amount=db_transaction.amount,
        category=db_transaction.category,
        date=db_transaction.date,
        type=db_transaction.type.value
    )

@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db)):
    transaction = db.query(TransactionDB).filter(TransactionDB.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(transaction)
    db.commit()
    
    return {"message": "Transaction deleted successfully"}

# Budget endpoints
@app.get("/api/transactions/{transaction_id}", response_model=Transaction)
def get_transaction_by_id(transaction_id: str, db: Session = Depends(get_db)):
    transaction = db.query(TransactionDB).filter(TransactionDB.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Transaction(
        id=transaction.id,
        description=transaction.description,
        amount=transaction.amount,
        category=transaction.category,
        date=transaction.date,
        type=transaction.type.value
    )
@app.get("/api/budgets", response_model=List[Budget])
def get_budgets(db: Session = Depends(get_db)):
    budgets = db.query(BudgetDB).all()
    result = []
    for b in budgets:
        result.append(Budget(
            id=b.id,
            category=b.category,
            limit=b.limit,
            spent=b.spent,
            period=b.period
        ))
    return result

@app.get("/api/budgets/{budget_id}", response_model=Budget)
def get_budget_by_id(budget_id: str, db: Session = Depends(get_db)):
    budget = db.query(BudgetDB).filter(BudgetDB.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return Budget(
        id=budget.id,
        category=budget.category,
        limit=budget.limit,
        spent=budget.spent,
        period=budget.period
    )

@app.post("/api/budgets", response_model=Budget)
def create_budget(budget: BudgetCreate, db: Session = Depends(get_db)):
    # Generate ID based on timestamp
    budget_id = str(int(datetime.now().timestamp() * 1000))
    
    db_budget = BudgetDB(
        id=budget_id,
        category=budget.category,
        limit=budget.limit,
        spent=0.0,
        period=budget.period
    )
    
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    
    # Return with string period value
    return Budget(
        id=db_budget.id,
        category=db_budget.category,
        limit=db_budget.limit,
        spent=db_budget.spent,
        period=db_budget.period
    )

@app.put("/api/budgets/{budget_id}", response_model=Budget)
def update_budget(budget_id: str, budget_update: BudgetUpdate, db: Session = Depends(get_db)):
    budget = db.query(BudgetDB).filter(BudgetDB.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    
    # Return with string period value
    return Budget(
        id=budget.id,
        category=budget.category,
        limit=budget.limit,
        spent=budget.spent
    )

# Goal endpoints
@app.get("/api/goals", response_model=List[Goal])
def get_goals(db: Session = Depends(get_db)):
    goals = db.query(GoalDB).all()
    result = []
    for g in goals:
        result.append(Goal(
            id=g.id,
            title=g.title,
            target_amount=g.target_amount,
            current_amount=g.current_amount,
            deadline=g.deadline,
            category=g.category
        ))
    return result

# Create a new goal
@app.post("/api/goals", response_model=Goal)
def create_goal(goal: GoalCreate, db: Session = Depends(get_db)):
    # Generate ID based on timestamp
    goal_id = str(int(datetime.now().timestamp() * 1000))
    db_goal = GoalDB(
        id=goal_id,
        title=goal.title,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        deadline=goal.deadline,
        category=goal.category
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return Goal(
        id=db_goal.id,
        title=db_goal.title,
        target_amount=db_goal.target_amount,
        current_amount=db_goal.current_amount,
        deadline=db_goal.deadline,
        category=db_goal.category
    )

# Update an existing goal
@app.put("/api/goals/{goal_id}", response_model=Goal)
def update_goal(goal_id: str, goal_update: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(GoalDB).filter(GoalDB.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    update_data = goal_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return Goal(
        id=goal.id,
        title=goal.title,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        deadline=goal.deadline,
        category=goal.category
    )

# Delete a goal
@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: str, db: Session = Depends(get_db)):
    goal = db.query(GoalDB).filter(GoalDB.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}

# GET endpoint for budget by ID
@app.get("/api/budgets/{budget_id}", response_model=Budget)
def get_budget_by_id(budget_id: str, db: Session = Depends(get_db)):
    budget = db.query(BudgetDB).filter(BudgetDB.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return Budget(
        id=budget.id,
        category=budget.category,
        limit=budget.limit,
        spent=budget.spent,
        period=budget.period
    )
# Category endpoints
@app.get("/api/categories", response_model=List[Category])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(CategoryDB).order_by(CategoryDB.name).all()
    return [Category.from_orm(category) for category in categories]

@app.post("/api/categories", response_model=Category)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    # Check if category name already exists
    existing = db.query(CategoryDB).filter(CategoryDB.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    # Generate ID based on timestamp
    category_id = str(int(datetime.now().timestamp() * 1000))
    
    db_category = CategoryDB(
        id=category_id,
        name=category.name
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return db_category

@app.put("/api/categories/{category_id}", response_model=Category)
def update_category(category_id: str, category_update: CategoryUpdate, db: Session = Depends(get_db)):
    category = db.query(CategoryDB).filter(CategoryDB.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if new name conflicts with existing category
    if category_update.name and category_update.name != category.name:
        existing = db.query(CategoryDB).filter(CategoryDB.name == category_update.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Category name already exists")
    
    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    return category

@app.delete("/api/categories/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db)):
    category = db.query(CategoryDB).filter(CategoryDB.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Ensure 'Unknown' category exists
    unknown_category = db.query(CategoryDB).filter(CategoryDB.name == "Unknown").first()
    if not unknown_category:
        unknown_category_id = str(int(datetime.now().timestamp() * 1000))
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
    
    return {"message": "Category deleted successfully"}

# Analytics endpoints
@app.get("/api/analytics/balance", response_model=AnalyticsBalance)
def get_total_balance(db: Session = Depends(get_db)):
    total = db.query(func.sum(TransactionDB.amount)).scalar() or 0.0
    return AnalyticsBalance(balance=total)

@app.get("/api/analytics/income", response_model=AnalyticsIncome)
def get_monthly_income(db: Session = Depends(get_db)):
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Parse date strings and filter by current month/year
    transactions = db.query(TransactionDB).filter(
        TransactionDB.type == TransactionType.income
    ).all()
    
    monthly_income = 0.0
    for transaction in transactions:
        try:
            transaction_date = datetime.fromisoformat(transaction.date.replace('Z', '+00:00'))
            if (transaction_date.month == current_month and 
                transaction_date.year == current_year):
                monthly_income += transaction.amount
        except:
            continue
    
    return AnalyticsIncome(monthly_income=monthly_income)

@app.get("/api/analytics/expenses", response_model=AnalyticsExpenses)
def get_monthly_expenses(db: Session = Depends(get_db)):
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Parse date strings and filter by current month/year
    transactions = db.query(TransactionDB).filter(
        TransactionDB.type == TransactionType.expense
    ).all()
    
    monthly_expenses = 0.0
    for transaction in transactions:
        try:
            transaction_date = datetime.fromisoformat(transaction.date.replace('Z', '+00:00'))
            if (transaction_date.month == current_month and 
                transaction_date.year == current_year):
                monthly_expenses += abs(transaction.amount)
        except:
            continue
    
    return AnalyticsExpenses(monthly_expenses=monthly_expenses)

@app.get("/api/analytics/spending", response_model=AnalyticsSpending)
def get_spending_by_category(days: int = 30, db: Session = Depends(get_db)):
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Get expense transactions within the date range
    transactions = db.query(TransactionDB).filter(
        TransactionDB.type == TransactionType.expense
    ).all()
    
    spending_by_category = {}
    for transaction in transactions:
        try:
            transaction_date = datetime.fromisoformat(transaction.date.replace('Z', '+00:00'))
            if transaction_date >= cutoff_date:
                category = transaction.category
                amount = abs(transaction.amount)
                spending_by_category[category] = spending_by_category.get(category, 0.0) + amount
        except:
            continue
    
    return AnalyticsSpending(spending_by_category=spending_by_category)

# ============================ Investments API ============================

def _compute_holdings(db: Session) -> Tuple[list[dict], dict[str, dict]]:
    """
    Compute current holdings from all trades in DB.
    Returns (holdings_list, by_symbol_map minimal data)
    """
    trades = db.query(InvestmentTradeDB).order_by(InvestmentTradeDB.date.asc(), InvestmentTradeDB.created_at.asc()).all()
    by_symbol: dict[str, dict] = {}
    for t in trades:
        sym = t.symbol.upper()
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
            entry["cost_basis_total"] += float(t.price) * float(t.quantity) + float(t.fees or 0.0)
        else:
            entry["quantity"] -= float(t.quantity)
            if entry["quantity"] < 0:
                entry["quantity"] = round(entry["quantity"], 6)
        if t.company_name:
            entry["company_name"] = t.company_name

    holdings: list[dict] = []
    symbols = [s for s, d in by_symbol.items() if d["quantity"] > 0]
    quotes = get_quotes(symbols) if symbols else {}
    for sym, data in by_symbol.items():
        qty = float(data["quantity"])
        if qty <= 0:
            continue
        cost_basis_total = float(data["cost_basis_total"]) if data["cost_basis_total"] > 0 else 0.0
        avg_cost = (cost_basis_total / qty) if qty > 0 and cost_basis_total > 0 else 0.0
        q = quotes.get(sym)
        current_price = float(q["price"]) if q else 0.0
        value = qty * current_price
        unrealized = (current_price - avg_cost) * qty
        unrealized_pct = ((current_price - avg_cost) / avg_cost * 100.0) if avg_cost > 0 else 0.0
        holdings.append({
            "symbol": sym,
            "company_name": data.get("company_name"),
            "quantity": qty,
            "average_cost": round(avg_cost, 6),
            "current_price": round(current_price, 6),
            "value": round(value, 2),
            "unrealized_gain": round(unrealized, 2),
            "unrealized_gain_percent": round(unrealized_pct, 4),
        })
    return holdings, by_symbol


@app.get("/api/investments/holdings", response_model=list[HoldingModel])
def get_investment_holdings(sort: str = "value", db: Session = Depends(get_db)):
    holdings, _ = _compute_holdings(db)
    if sort == "gain":
        holdings.sort(key=lambda h: h.get("unrealized_gain", 0.0), reverse=True)
    elif sort == "alpha":
        holdings.sort(key=lambda h: h.get("symbol", ""))
    else:
        holdings.sort(key=lambda h: h.get("value", 0.0), reverse=True)
    return holdings


@app.get("/api/investments/summary", response_model=PortfolioSummaryModel)
def get_portfolio_summary(db: Session = Depends(get_db)):
    holdings, _ = _compute_holdings(db)
    symbols = [h["symbol"] for h in holdings]
    quotes = get_quotes(symbols) if symbols else {}

    total_value = 0.0
    overall_gain = 0.0
    total_prev_value = 0.0
    for h in holdings:
        sym = h["symbol"]
        qty = float(h["quantity"])
        avg_cost = float(h["average_cost"]) if h["average_cost"] else 0.0
        q = quotes.get(sym)
        current_price = float(q["price"]) if q else 0.0
        prev_close = float(q["prev_close"]) if q else 0.0
        total_value += qty * current_price
        total_prev_value += qty * prev_close
        overall_gain += (current_price - avg_cost) * qty

    day_change = total_value - total_prev_value
    day_change_pct = (day_change / total_prev_value * 100.0) if total_prev_value > 0 else 0.0
    overall_gain_pct = (overall_gain / (total_value - overall_gain) * 100.0) if (total_value - overall_gain) > 0 else 0.0
    last_updated = 0.0
    for sym in symbols:
        q = quotes.get(sym)
        if q:
            last_updated = max(last_updated, float(q.get("last_updated", 0.0)))

    return PortfolioSummaryModel(
        total_value=round(total_value, 2),
        day_change=round(day_change, 2),
        day_change_percent=round(day_change_pct, 4),
        overall_gain=round(overall_gain, 2),
        overall_gain_percent=round(overall_gain_pct, 4),
        last_updated=last_updated,
    )


@app.get("/api/investments/trades", response_model=list[InvestmentTrade])
def list_trades(limit: int = 0, db: Session = Depends(get_db)):
    q = db.query(InvestmentTradeDB).order_by(InvestmentTradeDB.created_at.desc())
    if limit and limit > 0:
        q = q.limit(limit)
    items = q.all()
    result = []
    for t in items:
        result.append(InvestmentTrade(
            id=t.id,
            symbol=t.symbol,
            company_name=t.company_name,
            type=t.type.value,
            quantity=t.quantity,
            price=t.price,
            fees=t.fees,
            date=t.date,
        ))
    return result


@app.post("/api/investments/trades", response_model=InvestmentTrade)
def create_trade(payload: InvestmentTradeCreate, db: Session = Depends(get_db)):
    symbol = payload.symbol.upper().strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")
    if payload.quantity <= 0 or payload.price <= 0:
        raise HTTPException(status_code=400, detail="Quantity and price must be positive")

    # Validate sell against owned quantity
    if payload.type == "sell":
        trades = db.query(InvestmentTradeDB).filter(InvestmentTradeDB.symbol == symbol).order_by(InvestmentTradeDB.date.asc(), InvestmentTradeDB.created_at.asc()).all()
        owned = 0.0
        for t in trades:
            if t.type == TradeType.buy:
                owned += float(t.quantity)
            else:
                owned -= float(t.quantity)
        if payload.quantity > owned + 1e-9:
            raise HTTPException(status_code=400, detail="Cannot sell more shares than owned")

    trade_id = str(uuid.uuid4())
    db_trade = InvestmentTradeDB(
        id=trade_id,
        symbol=symbol,
        company_name=payload.company_name,
        type=TradeType(payload.type),
        quantity=float(payload.quantity),
        price=float(payload.price),
        fees=float(payload.fees or 0.0),
        date=payload.date,
    )
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)
    return InvestmentTrade(
        id=db_trade.id,
        symbol=db_trade.symbol,
        company_name=db_trade.company_name,
        type=db_trade.type.value,
        quantity=db_trade.quantity,
        price=db_trade.price,
        fees=db_trade.fees,
        date=db_trade.date,
    )


@app.put("/api/investments/trades/{trade_id}", response_model=InvestmentTrade)
def update_trade(trade_id: str, updates: InvestmentTradeUpdate, db: Session = Depends(get_db)):
    trade = db.query(InvestmentTradeDB).filter(InvestmentTradeDB.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    # Apply updates (symbol/type immutable in MVP)
    if updates.quantity is not None:
        if updates.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive")
        trade.quantity = float(updates.quantity)
    if updates.price is not None:
        if updates.price <= 0:
            raise HTTPException(status_code=400, detail="Price must be positive")
        trade.price = float(updates.price)
    if updates.fees is not None:
        trade.fees = float(updates.fees)
    if updates.date is not None:
        trade.date = updates.date

    # Validate sells post-update
    if trade.type == TradeType.sell:
        trades = db.query(InvestmentTradeDB).filter(InvestmentTradeDB.symbol == trade.symbol, InvestmentTradeDB.id != trade.id).order_by(InvestmentTradeDB.date.asc(), InvestmentTradeDB.created_at.asc()).all()
        owned = 0.0
        for t in trades:
            if t.type == TradeType.buy:
                owned += float(t.quantity)
            else:
                owned -= float(t.quantity)
        if trade.quantity > owned + 1e-9:
            raise HTTPException(status_code=400, detail="Cannot sell more shares than owned")

    db.add(trade)
    db.commit()
    db.refresh(trade)
    return InvestmentTrade(
        id=trade.id,
        symbol=trade.symbol,
        company_name=trade.company_name,
        type=trade.type.value,
        quantity=trade.quantity,
        price=trade.price,
        fees=trade.fees,
        date=trade.date,
    )


@app.delete("/api/investments/trades/{trade_id}")
def delete_trade(trade_id: str, db: Session = Depends(get_db)):
    trade = db.query(InvestmentTradeDB).filter(InvestmentTradeDB.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    db.delete(trade)
    db.commit()
    return {"message": "Trade deleted"}


@app.delete("/api/investments/holdings/{symbol}")
def remove_holding(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    db.query(InvestmentTradeDB).filter(InvestmentTradeDB.symbol == symbol).delete()
    db.commit()
    return {"message": f"Removed all trades for {symbol}"}


@app.get("/api/investments/watchlist", response_model=list[WatchlistItemModel])
def get_watchlist(db: Session = Depends(get_db)):
    items = db.query(WatchlistItemDB).order_by(WatchlistItemDB.created_at.desc()).all()
    return [WatchlistItemModel(id=i.id, symbol=i.symbol, company_name=i.company_name) for i in items]


@app.post("/api/investments/watchlist", response_model=WatchlistItemModel)
def add_watchlist_item(payload: dict = Body(...), db: Session = Depends(get_db)):
    symbol = (payload.get("symbol") or "").upper().strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")
    name = payload.get("company_name")
    existing = db.query(WatchlistItemDB).filter(WatchlistItemDB.symbol == symbol).first()
    if existing:
        return WatchlistItemModel(id=existing.id, symbol=existing.symbol, company_name=existing.company_name)
    item = WatchlistItemDB(id=str(uuid.uuid4()), symbol=symbol, company_name=name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return WatchlistItemModel(id=item.id, symbol=item.symbol, company_name=item.company_name)


@app.delete("/api/investments/watchlist/{identifier}")
def delete_watchlist_item(identifier: str, db: Session = Depends(get_db)):
    item = db.query(WatchlistItemDB).filter((WatchlistItemDB.id == identifier) | (WatchlistItemDB.symbol == identifier.upper())).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
    return {"message": "Watchlist item deleted"}


@app.get("/api/investments/quote/{symbol}", response_model=QuoteModel)
def get_symbol_quote(symbol: str):
    q = get_quote(symbol)
    if not q:
        raise HTTPException(status_code=404, detail="Quote not available")
    return QuoteModel(**q)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
