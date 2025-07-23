from fastapi import FastAPI, Depends, HTTPException, Body
app = FastAPI(title="PennyWise Finance API", version="1.0.0")
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import List, Dict
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
    TransactionType, CategoryType
)
from ai import router as ai_router
from adk_services import initialize_adk_services

load_dotenv()


@app.post("/api/budget-category", response_model=Budget)
def create_category_and_budget(
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    category_name = data.get("category", "").strip()
    limit = data.get("limit")
    period = data.get("period", "monthly")
    if not category_name or limit is None or not period:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # Check if category exists
    category = db.query(CategoryDB).filter(CategoryDB.name == category_name).first()
    if not category:
        # Create category with default type
        category_id = str(int(datetime.now().timestamp() * 1000))
        category = CategoryDB(id=category_id, name=category_name, type="expense")
        db.add(category)
        db.commit()
        db.refresh(category)

    # Check if budget for this category already exists
    existing_budget = db.query(BudgetDB).filter(BudgetDB.category == category_name, BudgetDB.period == period).first()
    if existing_budget:
        raise HTTPException(status_code=400, detail="Budget for this category and period already exists")

    # Create budget
    budget_id = str(int(datetime.now().timestamp() * 1000))
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

    return Budget(
        id=db_budget.id,
        category=db_budget.category,
        limit=db_budget.limit,
        spent=db_budget.spent,
        period=db_budget.period
    )

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
