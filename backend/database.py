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
    """Initialize database with mock data matching the React Native app"""
    db = SessionLocal()
    
    # Check if data already exists
    if db.query(TransactionDB).first():
        db.close()
        return
    
    try:
        # Default categories
        categories = [
            CategoryDB(
                id="cat_1",
                name="Food & Dining",
                type="expense"
            ),
            CategoryDB(
                id="cat_2",
                name="Shopping",
                type="expense"
            ),
            CategoryDB(
                id="cat_3",
                name="Transportation",
                type="expense"
            ),
            CategoryDB(
                id="cat_4",
                name="Entertainment",
                type="expense"
            ),
            CategoryDB(
                id="cat_5",
                name="Healthcare",
                type="expense"
            ),
            CategoryDB(
                id="cat_6",
                name="Bills & Utilities",
                type="expense"
            ),
            CategoryDB(
                id="cat_7",
                name="Income",
                type="income"
            ),
            CategoryDB(
                id="cat_8",
                name="Savings",
                type="both"
            ),
            CategoryDB(
                id="cat_9",
                name="Travel",
                type="expense"
            ),
            CategoryDB(
                id="cat_10",
                name="Technology",
                type="expense"
            ),
        ]
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
                period="monthly"
            ),
            BudgetDB(
                id="2",
                category="Transportation",
                limit=200,
                spent=45.20,
                period="monthly"
            ),
            BudgetDB(
                id="3",
                category="Entertainment",
                limit=100,
                spent=15.99,
                period="monthly"
            ),
            BudgetDB(
                id="4",
                category="Shopping",
                limit=300,
                spent=0,
                period="monthly"
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
        db.add_all(categories)
        db.add_all(transactions)
        db.add_all(budgets)
        db.add_all(goals)
        # Optional: seed a couple of trades and watchlist items for demo
        try:
            demo_trades = []
            from datetime import datetime as _dt
            now_iso = _dt.now().isoformat()
            demo_trades.append(InvestmentTradeDB(id="t1", symbol="AAPL", company_name="Apple Inc.", type=TradeType.buy, quantity=5.0, price=190.0, fees=0.0, date=now_iso))
            demo_trades.append(InvestmentTradeDB(id="t2", symbol="GOOGL", company_name="Alphabet Inc.", type=TradeType.buy, quantity=2.0, price=2800.0, fees=0.0, date=now_iso))
            db.add_all(demo_trades)
            demo_watch = [
                WatchlistItemDB(id="w1", symbol="MSFT", company_name="Microsoft Corporation"),
                WatchlistItemDB(id="w2", symbol="TSLA", company_name="Tesla, Inc."),
            ]
            db.add_all(demo_watch)
        except Exception:
            pass
        db.commit()
        
        print("Database seeded with mock data successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()