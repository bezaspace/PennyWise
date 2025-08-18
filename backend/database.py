from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, TransactionDB, BudgetDB, GoalDB, CategoryDB, TransactionType, BudgetPeriod, CategoryType
from models import InvestmentTradeDB, WatchlistItemDB, TradeType
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
    """Initialize database with realistic financial data for a $6000/month earner"""
    db = SessionLocal()
    
    # Check if data already exists
    if db.query(TransactionDB).first():
        db.close()
        return
    
    try:
        # Import and run the realistic seed data function
        from seed_realistic import create_realistic_seed_data
        db.close()  # Close this connection since create_realistic_seed_data manages its own
        create_realistic_seed_data()
        
    except Exception as e:
        print(f"Error seeding database with realistic data: {e}")
        db.rollback()
        # Fallback to basic seed data if realistic seeding fails
        print("Falling back to basic seed data...")
        try:
            # Basic fallback categories
            categories = [
                CategoryDB(id="cat_1", name="Food & Dining", type="expense"),
                CategoryDB(id="cat_2", name="Shopping", type="expense"),
                CategoryDB(id="cat_3", name="Transportation", type="expense"),
                CategoryDB(id="cat_4", name="Entertainment", type="expense"),
                CategoryDB(id="cat_5", name="Salary", type="income"),
            ]
            
            # Basic fallback transactions
            transactions = [
                TransactionDB(
                    id="1", description="Salary deposit", amount=3000.00,
                    category="Salary", date=datetime.now().isoformat(),
                    type=TransactionType.income
                ),
                TransactionDB(
                    id="2", description="Grocery shopping", amount=-125.50,
                    category="Food & Dining", date=datetime.now().isoformat(),
                    type=TransactionType.expense
                ),
            ]
            
            db.add_all(categories)
            db.add_all(transactions)
            db.commit()
            print("Basic fallback seed data created successfully!")
            
        except Exception as fallback_error:
            print(f"Error with fallback seed data: {fallback_error}")
            db.rollback()
    finally:
        if not db.is_active:
            db = SessionLocal()
        db.close()