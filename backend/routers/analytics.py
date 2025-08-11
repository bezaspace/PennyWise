from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import AnalyticsBalance, AnalyticsIncome, AnalyticsExpenses, AnalyticsSpending
from services.analytics_service import (
    get_current_balance,
    get_current_month_income,
    get_current_month_expenses,
    get_spending_by_category
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/balance", response_model=AnalyticsBalance)
def get_total_balance(db: Session = Depends(get_db)):
    balance = get_current_balance(db)
    return AnalyticsBalance(balance=balance)


@router.get("/income", response_model=AnalyticsIncome)
def get_monthly_income(db: Session = Depends(get_db)):
    monthly_income = get_current_month_income(db)
    return AnalyticsIncome(monthly_income=monthly_income)


@router.get("/expenses", response_model=AnalyticsExpenses)
def get_monthly_expenses(db: Session = Depends(get_db)):
    monthly_expenses = get_current_month_expenses(db)
    return AnalyticsExpenses(monthly_expenses=monthly_expenses)


@router.get("/spending", response_model=AnalyticsSpending)
def get_spending_by_category_endpoint(days: int = 30, db: Session = Depends(get_db)):
    spending_by_category = get_spending_by_category(db, days)
    return AnalyticsSpending(spending_by_category=spending_by_category)