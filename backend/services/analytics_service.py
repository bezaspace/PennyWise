from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import TransactionDB, TransactionType


def get_current_balance(db: Session) -> float:
    """Calculate total balance from all transactions."""
    total = db.query(func.sum(TransactionDB.amount)).scalar() or 0.0
    return total


def get_current_month_income(db: Session) -> float:
    """Calculate income for the current month."""
    current_month = datetime.now().month
    current_year = datetime.now().year
    
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
    
    return monthly_income


def get_current_month_expenses(db: Session) -> float:
    """Calculate expenses for the current month."""
    current_month = datetime.now().month
    current_year = datetime.now().year
    
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
    
    return monthly_expenses


def get_spending_by_category(db: Session, days: int = 30) -> dict:
    """Calculate spending by category for the specified number of days."""
    cutoff_date = datetime.now() - timedelta(days=days)
    
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
    
    return spending_by_category