from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, TransactionDB, BudgetDB, GoalDB, TransactionType, BudgetPeriod
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

# Use absolute path for SQLite database to avoid path issues
import os
DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "finance_app.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_database():
    """Initialize database with mock data matching the React Native app"""
    db = SessionLocal()
    
    # Check if data already exists
    if db.query(TransactionDB).first():
        db.close()
        return
    
    try:
        # Mock transactions (matching the original data)
        transactions = [
            TransactionDB(
                id="1",
                description="Grocery shopping at Whole Foods",
                amount=-125.50,
                category="Food & Dining",
                date=(datetime.now() - timedelta(days=1)).isoformat(),
                type=TransactionType.expense
            ),
            TransactionDB(
                id="2",
                description="Salary deposit",
                amount=3500.00,
                category="Income",
                date=(datetime.now() - timedelta(days=2)).isoformat(),
                type=TransactionType.income
            ),
            TransactionDB(
                id="3",
                description="Netflix subscription",
                amount=-15.99,
                category="Entertainment",
                date=(datetime.now() - timedelta(days=3)).isoformat(),
                type=TransactionType.expense
            ),
            TransactionDB(
                id="4",
                description="Uber ride to airport",
                amount=-45.20,
                category="Transportation",
                date=(datetime.now() - timedelta(days=4)).isoformat(),
                type=TransactionType.expense
            ),
            TransactionDB(
                id="5",
                description="Coffee shop",
                amount=-8.75,
                category="Food & Dining",
                date=(datetime.now() - timedelta(days=5)).isoformat(),
                type=TransactionType.expense
            ),
        ]
        
        # Mock budgets
        budgets = [
            BudgetDB(
                id="1",
                category="Food & Dining",
                limit=400,
                spent=134.25,
                period=BudgetPeriod.monthly
            ),
            BudgetDB(
                id="2",
                category="Transportation",
                limit=200,
                spent=45.20,
                period=BudgetPeriod.monthly
            ),
            BudgetDB(
                id="3",
                category="Entertainment",
                limit=100,
                spent=15.99,
                period=BudgetPeriod.monthly
            ),
            BudgetDB(
                id="4",
                category="Shopping",
                limit=300,
                spent=0,
                period=BudgetPeriod.monthly
            ),
        ]
        
        # Mock goals
        goals = [
            GoalDB(
                id="1",
                title="Emergency Fund",
                target_amount=10000,
                current_amount=2500,
                deadline=(datetime.now() + timedelta(days=365)).isoformat(),
                category="Savings"
            ),
            GoalDB(
                id="2",
                title="Vacation to Japan",
                target_amount=5000,
                current_amount=1200,
                deadline=(datetime.now() + timedelta(days=180)).isoformat(),
                category="Travel"
            ),
            GoalDB(
                id="3",
                title="New MacBook",
                target_amount=2500,
                current_amount=800,
                deadline=(datetime.now() + timedelta(days=90)).isoformat(),
                category="Technology"
            ),
        ]
        
        # Add all data to database
        db.add_all(transactions)
        db.add_all(budgets)
        db.add_all(goals)
        db.commit()
        
        print("Database seeded with mock data successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()