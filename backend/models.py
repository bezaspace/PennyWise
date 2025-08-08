from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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

class CategoryType(enum.Enum):
    expense = "expense"
    income = "income"
    both = "both"

class CategoryDB(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    type = Column(String, nullable=False, default="expense")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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
    period = Column(String(7), nullable=False)
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

# Planning table (optional persistence for plans)
class PlanDB(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True)
    month = Column(String, nullable=False)  # e.g., "2025-08"
    income = Column(Float, nullable=True)
    savings_rate = Column(Float, nullable=True)  # 0..1
    emergency_fund_target = Column(Float, nullable=True)
    allocations_json = Column(String, nullable=False)  # JSON: [{category, amount}]
    goals_json = Column(String, nullable=True)  # JSON: [{title, target_amount, deadline, current_amount, category}]
    status = Column(String, nullable=False, default="draft")  # draft | approved
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
    period: str

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    limit: Optional[float] = None
    spent: Optional[float] = None
    period: Optional[str] = None

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

# Category Pydantic Models
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None

class Category(CategoryBase):
    id: str
    class Config:
        from_attributes = True

# ---------- Planning Pydantic Models ----------
class PlanAllocation(BaseModel):
    category: str
    amount: float

class PlanGoal(BaseModel):
    title: str
    target_amount: float
    current_amount: float
    deadline: str
    category: str

class PlanBase(BaseModel):
    month: str
    income: Optional[float] = None
    savings_rate: Optional[float] = None
    emergency_fund_target: Optional[float] = None
    allocations: list[PlanAllocation]
    goals: Optional[list[PlanGoal]] = None
    status: str = "draft"

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    income: Optional[float] = None
    savings_rate: Optional[float] = None
    emergency_fund_target: Optional[float] = None
    allocations: Optional[list[PlanAllocation]] = None
    goals: Optional[list[PlanGoal]] = None
    status: Optional[str] = None

class Plan(PlanBase):
    id: str
    class Config:
        from_attributes = True