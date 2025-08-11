from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from database import get_db
from models import BudgetDB, Budget, BudgetCreate, BudgetUpdate
from tools import create_budget_category, delete_budget_category

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("", response_model=List[Budget])
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


@router.get("/{budget_id}", response_model=Budget)
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


@router.post("", response_model=Budget)
def create_budget(budget: BudgetCreate, db: Session = Depends(get_db)):
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
    
    return Budget(
        id=db_budget.id,
        category=db_budget.category,
        limit=db_budget.limit,
        spent=db_budget.spent,
        period=db_budget.period
    )


@router.put("/{budget_id}", response_model=Budget)
def update_budget(budget_id: str, budget_update: BudgetUpdate, db: Session = Depends(get_db)):
    budget = db.query(BudgetDB).filter(BudgetDB.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    
    return Budget(
        id=budget.id,
        category=budget.category,
        limit=budget.limit,
        spent=budget.spent
    )


# Budget-Category combined operations
@router.post("/budget-category", response_model=Budget)
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


@router.delete("/budget-category/{category_name}")
def delete_category_and_budget(
    category_name: str,
    db: Session = Depends(get_db)
):
    try:
        return delete_budget_category(category_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))