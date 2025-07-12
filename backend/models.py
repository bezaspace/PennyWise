from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pydantic import BaseModel
from datetime import datetime
from typing import Literal, Optional
import enum

Base = declarative_base()

# SQLAlchemy Models (Database)
class TransactionType(enum.Enum):
    income = "income"
    expense = "expense"

class BudgetPeriod(enum.Enum):
    weekly = "weekly"
    monthly = "monthly"

class TransactionDB(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    date = Column(String, nullable=False)  # ISO string format
    type = Column(Enum(TransactionType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BudgetDB(Base):
    __tablename__ = "budgets"
    
    id = Column(String, primary_key=True)
    category = Column(String, nullable=False)
    limit = Column(Float, nullable=False)
    spent = Column(Float, default=0.0)
    period = Column(Enum(BudgetPeriod), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class GoalDB(Base):
    __tablename__ = "goals"
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    deadline = Column(String, nullable=False)  # ISO string format
    category = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Pydantic Models (API)
class TransactionBase(BaseModel):
    description: str
    amount: float
    category: str
    date: str
    type: Literal["income", "expense"]

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: str
    
    class Config:
        from_attributes = True

class BudgetBase(BaseModel):
    category: str
    limit: float
    period: Literal["weekly", "monthly"]

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    limit: Optional[float] = None
    spent: Optional[float] = None
    period: Optional[Literal["weekly", "monthly"]] = None

class Budget(BudgetBase):
    id: str
    spent: float
    
    class Config:
        from_attributes = True

class GoalBase(BaseModel):
    title: str
    target_amount: float
    current_amount: float
    deadline: str
    category: str

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[str] = None
    category: Optional[str] = None

class Goal(GoalBase):
    id: str
    
    class Config:
        from_attributes = True

# Analytics response models
class AnalyticsBalance(BaseModel):
    balance: float

class AnalyticsIncome(BaseModel):
    monthly_income: float

class AnalyticsExpenses(BaseModel):
    monthly_expenses: float

class AnalyticsSpending(BaseModel):
    spending_by_category: dict[str, float]