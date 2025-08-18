"""
Realistic seed data for PennyWise Finance App
Creates comprehensive financial data for a person earning $6000/month over one month period
"""

from database import SessionLocal, create_tables
from models import (
    TransactionDB, BudgetDB, GoalDB, CategoryDB, PlanDB,
    InvestmentTradeDB, WatchlistItemDB, TransactionType, TradeType
)
import uuid
from datetime import datetime, timedelta
import json
import random

def create_realistic_seed_data():
    """Create realistic financial data for August 2025"""
    
    # Clear existing data first
    db = SessionLocal()
    try:
        # Clear all existing data
        db.query(InvestmentTradeDB).delete()
        db.query(WatchlistItemDB).delete()
        db.query(PlanDB).delete()
        db.query(TransactionDB).delete()
        db.query(BudgetDB).delete()
        db.query(GoalDB).delete()
        db.query(CategoryDB).delete()
        db.commit()
        print("Cleared existing data")
    except Exception as e:
        print(f"Error clearing data: {e}")
        db.rollback()
    finally:
        db.close()

    # Create fresh data
    db = SessionLocal()
    try:
        # 1. Create Categories
        categories = create_categories(db)
        print(f"Created {len(categories)} categories")
        
        # 2. Create Transactions (80-120 realistic transactions for August 2025)
        transactions = create_transactions(db)
        print(f"Created {len(transactions)} transactions")
        
        # 3. Create Budgets with realistic spent amounts
        budgets = create_budgets(db)
        print(f"Created {len(budgets)} budgets")
        
        # 4. Create Financial Goals
        goals = create_goals(db)
        print(f"Created {len(goals)} goals")
        
        # 5. Create Monthly Plan
        plan = create_monthly_plan(db)
        print("Created monthly financial plan")
        
        # 6. Create Investment Trades
        trades = create_investment_trades(db)
        print(f"Created {len(trades)} investment trades")
        
        # 7. Create Watchlist
        watchlist = create_watchlist(db)
        print(f"Created {len(watchlist)} watchlist items")
        
        db.commit()
        print("\n✅ Realistic seed data created successfully!")
        print("📊 Profile: Young professional earning $6000/month")
        print("📅 Time period: August 2025 (30 days)")
        print("💰 Total monthly income: $6000")
        print("🎯 Savings rate: ~15%")
        
    except Exception as e:
        print(f"❌ Error creating seed data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_categories(db):
    """Create realistic expense and income categories"""
    categories_data = [
        # Income categories
        {"name": "Salary", "type": "income"},
        {"name": "Freelance", "type": "income"},
        {"name": "Investment Returns", "type": "income"},
        
        # Essential expense categories
        {"name": "Housing & Rent", "type": "expense"},
        {"name": "Utilities", "type": "expense"},
        {"name": "Groceries", "type": "expense"},
        {"name": "Transportation", "type": "expense"},
        {"name": "Healthcare", "type": "expense"},
        {"name": "Insurance", "type": "expense"},
        
        # Lifestyle categories
        {"name": "Dining Out", "type": "expense"},
        {"name": "Entertainment", "type": "expense"},
        {"name": "Shopping", "type": "expense"},
        {"name": "Personal Care", "type": "expense"},
        {"name": "Fitness", "type": "expense"},
        {"name": "Travel", "type": "expense"},
        {"name": "Education", "type": "expense"},
        {"name": "Subscriptions", "type": "expense"},
        
        # Financial categories
        {"name": "Savings", "type": "both"},
        {"name": "Emergency Fund", "type": "both"},
        {"name": "Investments", "type": "both"},
        {"name": "Debt Payment", "type": "expense"},
        
        # Miscellaneous
        {"name": "Gifts & Donations", "type": "expense"},
        {"name": "Miscellaneous", "type": "expense"},
    ]
    
    categories = []
    for cat_data in categories_data:
        category = CategoryDB(
            id=str(uuid.uuid4()),
            name=cat_data["name"],
            type=cat_data["type"]
        )
        db.add(category)
        categories.append(category)
    
    db.flush()
    return categories

def create_transactions(db):
    """Create realistic transactions for August 2025"""
    
    # Base date: August 1, 2025
    base_date = datetime(2025, 8, 1)
    transactions = []
    
    # Monthly recurring transactions
    recurring_transactions = [
        # Income - 1st and 15th
        {"date": 1, "desc": "Software Engineer Salary - Biweekly", "amount": 3000, "category": "Salary", "type": "income"},
        {"date": 15, "desc": "Software Engineer Salary - Biweekly", "amount": 3000, "category": "Salary", "type": "income"},
        
        # Fixed expenses - early month
        {"date": 1, "desc": "Rent Payment - Downtown Apartment", "amount": -1800, "category": "Housing & Rent", "type": "expense"},
        {"date": 3, "desc": "Car Insurance - Monthly Premium", "amount": -125, "category": "Insurance", "type": "expense"},
        {"date": 5, "desc": "Health Insurance Premium", "amount": -180, "category": "Healthcare", "type": "expense"},
        
        # Utilities - mid month
        {"date": 12, "desc": "Electric & Gas Bill", "amount": -95, "category": "Utilities", "type": "expense"},
        {"date": 14, "desc": "Internet & Cable", "amount": -85, "category": "Utilities", "type": "expense"},
        {"date": 16, "desc": "Water & Sewer", "amount": -45, "category": "Utilities", "type": "expense"},
        {"date": 18, "desc": "Cell Phone Bill", "amount": -75, "category": "Utilities", "type": "expense"},
        
        # Subscriptions throughout month
        {"date": 2, "desc": "Netflix Subscription", "amount": -15.99, "category": "Subscriptions", "type": "expense"},
        {"date": 7, "desc": "Spotify Premium", "amount": -9.99, "category": "Subscriptions", "type": "expense"},
        {"date": 10, "desc": "Adobe Creative Suite", "amount": -52.99, "category": "Subscriptions", "type": "expense"},
        {"date": 22, "desc": "Gym Membership", "amount": -45, "category": "Fitness", "type": "expense"},
        {"date": 25, "desc": "Amazon Prime", "amount": -14.98, "category": "Subscriptions", "type": "expense"},
        
        # Savings transfers
        {"date": 2, "desc": "Emergency Fund Transfer", "amount": -200, "category": "Emergency Fund", "type": "expense"},
        {"date": 16, "desc": "Investment Account Transfer", "amount": -500, "category": "Investments", "type": "expense"},
        {"date": 30, "desc": "High-Yield Savings Transfer", "amount": -200, "category": "Savings", "type": "expense"},
    ]
    
    # Add recurring transactions
    for trans in recurring_transactions:
        transaction_date = base_date + timedelta(days=trans["date"] - 1)
        transaction = TransactionDB(
            id=str(uuid.uuid4()),
            description=trans["desc"],
            amount=trans["amount"],
            category=trans["category"],
            date=transaction_date.isoformat(),
            type=TransactionType(trans["type"])
        )
        transactions.append(transaction)
        db.add(transaction)
    
    # Variable transactions - groceries (2-3 times per week)
    grocery_days = [3, 6, 10, 13, 17, 20, 24, 27, 31]
    grocery_stores = ["Whole Foods Market", "Trader Joe's", "Safeway", "Target Grocery", "Costco"]
    grocery_amounts = [85, 120, 95, 110, 75, 140, 65, 90, 180]  # Costco trip is higher
    
    for i, day in enumerate(grocery_days):
        if day <= 31:  # August has 31 days
            transaction_date = base_date + timedelta(days=day - 1)
            store = grocery_stores[i % len(grocery_stores)]
            amount = grocery_amounts[i % len(grocery_amounts)]
            
            transaction = TransactionDB(
                id=str(uuid.uuid4()),
                description=f"Grocery Shopping - {store}",
                amount=-amount,
                category="Groceries",
                date=transaction_date.isoformat(),
                type=TransactionType.expense
            )
            transactions.append(transaction)
            db.add(transaction)
    
    # Transportation - gas, parking, rideshare
    transportation_transactions = [
        {"date": 4, "desc": "Shell Gas Station", "amount": -45, "category": "Transportation"},
        {"date": 8, "desc": "Downtown Parking Meter", "amount": -12, "category": "Transportation"},
        {"date": 11, "desc": "Uber to Airport", "amount": -35, "category": "Transportation"},
        {"date": 15, "desc": "Chevron Gas Station", "amount": -48, "category": "Transportation"},
        {"date": 19, "desc": "Monthly Parking Pass", "amount": -150, "category": "Transportation"},
        {"date": 23, "desc": "Lyft Downtown", "amount": -18, "category": "Transportation"},
        {"date": 26, "desc": "BP Gas Station", "amount": -42, "category": "Transportation"},
        {"date": 29, "desc": "Airport Parking", "amount": -25, "category": "Transportation"},
    ]
    
    for trans in transportation_transactions:
        transaction_date = base_date + timedelta(days=trans["date"] - 1)
        transaction = TransactionDB(
            id=str(uuid.uuid4()),
            description=trans["desc"],
            amount=trans["amount"],
            category=trans["category"],
            date=transaction_date.isoformat(),
            type=TransactionType.expense
        )
        transactions.append(transaction)
        db.add(transaction)
    
    # Dining out - realistic frequency and amounts
    dining_transactions = [
        {"date": 2, "desc": "Starbucks Coffee", "amount": -8.75, "category": "Dining Out"},
        {"date": 4, "desc": "Chipotle Lunch", "amount": -12.50, "category": "Dining Out"},
        {"date": 6, "desc": "Friday Night Dinner - Italian Bistro", "amount": -85, "category": "Dining Out"},
        {"date": 9, "desc": "Dunkin' Donuts", "amount": -6.25, "category": "Dining Out"},
        {"date": 11, "desc": "Sushi Date Night", "amount": -120, "category": "Dining Out"},
        {"date": 13, "desc": "Local Coffee Shop", "amount": -7.50, "category": "Dining Out"},
        {"date": 15, "desc": "Thai Takeout", "amount": -28, "category": "Dining Out"},
        {"date": 18, "desc": "Weekend Brunch", "amount": -45, "category": "Dining Out"},
        {"date": 20, "desc": "Starbucks Coffee", "amount": -9.25, "category": "Dining Out"},
        {"date": 22, "desc": "Pizza Night with Friends", "amount": -32, "category": "Dining Out"},
        {"date": 25, "desc": "Fine Dining Anniversary", "amount": -180, "category": "Dining Out"},
        {"date": 27, "desc": "Quick Lunch - Panera", "amount": -14, "category": "Dining Out"},
        {"date": 30, "desc": "Ice Cream Shop", "amount": -12, "category": "Dining Out"},
    ]
    
    for trans in dining_transactions:
        transaction_date = base_date + timedelta(days=trans["date"] - 1)
        transaction = TransactionDB(
            id=str(uuid.uuid4()),
            description=trans["desc"],
            amount=trans["amount"],
            category=trans["category"],
            date=transaction_date.isoformat(),
            type=TransactionType.expense
        )
        transactions.append(transaction)
        db.add(transaction)
    
    # Entertainment - movies, events, hobbies
    entertainment_transactions = [
        {"date": 5, "desc": "Movie Theater - AMC", "amount": -28, "category": "Entertainment"},
        {"date": 8, "desc": "Concert Tickets", "amount": -85, "category": "Entertainment"},
        {"date": 12, "desc": "Bowling Night", "amount": -35, "category": "Entertainment"},
        {"date": 17, "desc": "Mini Golf & Arcade", "amount": -42, "category": "Entertainment"},
        {"date": 21, "desc": "Baseball Game Tickets", "amount": -65, "category": "Entertainment"},
        {"date": 24, "desc": "Escape Room", "amount": -30, "category": "Entertainment"},
        {"date": 28, "desc": "Board Game Cafe", "amount": -25, "category": "Entertainment"},
    ]
    
    for trans in entertainment_transactions:
        transaction_date = base_date + timedelta(days=trans["date"] - 1)
        transaction = TransactionDB(
            id=str(uuid.uuid4()),
            description=trans["desc"],
            amount=trans["amount"],
            category=trans["category"],
            date=transaction_date.isoformat(),
            type=TransactionType.expense
        )
        transactions.append(transaction)
        db.add(transaction)
    
    # Shopping - clothing, electronics, household
    shopping_transactions = [
        {"date": 3, "desc": "Target - Household Items", "amount": -67, "category": "Shopping"},
        {"date": 7, "desc": "Amazon - Electronics", "amount": -89, "category": "Shopping"},
        {"date": 14, "desc": "Macy's - Summer Clothes", "amount": -145, "category": "Shopping"},
        {"date": 19, "desc": "Best Buy - Phone Accessories", "amount": -35, "category": "Shopping"},
        {"date": 23, "desc": "Home Depot - Garden Supplies", "amount": -78, "category": "Shopping"},
        {"date": 26, "desc": "Bookstore - Professional Books", "amount": -52, "category": "Education"},
    ]
    
    for trans in shopping_transactions:
        transaction_date = base_date + timedelta(days=trans["date"] - 1)
        transaction = TransactionDB(
            id=str(uuid.uuid4()),
            description=trans["desc"],
            amount=trans["amount"],
            category=trans["category"],
            date=transaction_date.isoformat(),
            type=TransactionType.expense
        )
        transactions.append(transaction)
        db.add(transaction)
    
    # Healthcare & Personal Care
    health_transactions = [
        {"date": 9, "desc": "Dentist Cleaning", "amount": -85, "category": "Healthcare"},
        {"date": 16, "desc": "Pharmacy - Prescriptions", "amount": -25, "category": "Healthcare"},
        {"date": 21, "desc": "Haircut & Style", "amount": -45, "category": "Personal Care"},
        {"date": 28, "desc": "Eye Exam", "amount": -120, "category": "Healthcare"},
    ]
    
    for trans in health_transactions:
        transaction_date = base_date + timedelta(days=trans["date"] - 1)
        transaction = TransactionDB(
            id=str(uuid.uuid4()),
            description=trans["desc"],
            amount=trans["amount"],
            category=trans["category"],
            date=transaction_date.isoformat(),
            type=TransactionType.expense
        )
        transactions.append(transaction)
        db.add(transaction)
    
    # Miscellaneous & Gifts
    misc_transactions = [
        {"date": 6, "desc": "Friend's Birthday Gift", "amount": -35, "category": "Gifts & Donations"},
        {"date": 13, "desc": "Charity Donation", "amount": -50, "category": "Gifts & Donations"},
        {"date": 18, "desc": "Dry Cleaning", "amount": -28, "category": "Personal Care"},
        {"date": 24, "desc": "Pet Supplies", "amount": -45, "category": "Miscellaneous"},
        {"date": 31, "desc": "Bank ATM Fee", "amount": -3, "category": "Miscellaneous"},
    ]
    
    for trans in misc_transactions:
        transaction_date = base_date + timedelta(days=trans["date"] - 1)
        transaction = TransactionDB(
            id=str(uuid.uuid4()),
            description=trans["desc"],
            amount=trans["amount"],
            category=trans["category"],
            date=transaction_date.isoformat(),
            type=TransactionType.expense
        )
        transactions.append(transaction)
        db.add(transaction)
    
    # Small freelance income
    freelance_transaction = TransactionDB(
        id=str(uuid.uuid4()),
        description="Freelance Web Design Project",
        amount=800,
        category="Freelance",
        date=(base_date + timedelta(days=20)).isoformat(),
        type=TransactionType.income
    )
    transactions.append(freelance_transaction)
    db.add(freelance_transaction)
    
    db.flush()
    return transactions

def create_budgets(db):
    """Create realistic monthly budgets with calculated spent amounts"""
    
    # Calculate actual spending by category from transactions
    spent_by_category = {}
    transactions = db.query(TransactionDB).filter(TransactionDB.type == TransactionType.expense).all()
    
    for transaction in transactions:
        category = transaction.category
        amount = abs(transaction.amount)
        spent_by_category[category] = spent_by_category.get(category, 0) + amount
    
    # Budget data with realistic limits
    budget_data = [
        {"category": "Housing & Rent", "limit": 1800},
        {"category": "Groceries", "limit": 500},
        {"category": "Dining Out", "limit": 400},
        {"category": "Transportation", "limit": 350},
        {"category": "Entertainment", "limit": 250},
        {"category": "Shopping", "limit": 300},
        {"category": "Utilities", "limit": 250},
        {"category": "Healthcare", "limit": 200},
        {"category": "Personal Care", "limit": 100},
        {"category": "Subscriptions", "limit": 150},
        {"category": "Fitness", "limit": 60},
        {"category": "Education", "limit": 100},
        {"category": "Gifts & Donations", "limit": 100},
        {"category": "Miscellaneous", "limit": 75},
        {"category": "Insurance", "limit": 350},
        {"category": "Investments", "limit": 500},
        {"category": "Emergency Fund", "limit": 200},
        {"category": "Savings", "limit": 200},
    ]
    
    budgets = []
    for budget_info in budget_data:
        category = budget_info["category"]
        spent = spent_by_category.get(category, 0)
        
        budget = BudgetDB(
            id=str(uuid.uuid4()),
            category=category,
            limit=budget_info["limit"],
            spent=round(spent, 2),
            period="2025-08"  # August 2025
        )
        budgets.append(budget)
        db.add(budget)
    
    db.flush()
    return budgets

def create_goals(db):
    """Create realistic financial goals with varying progress"""
    
    goals_data = [
        {
            "title": "Emergency Fund",
            "target_amount": 15000,
            "current_amount": 8500,
            "deadline": "2026-06-30",
            "category": "Emergency Fund"
        },
        {
            "title": "European Vacation",
            "target_amount": 4500,
            "current_amount": 1800,
            "deadline": "2026-05-15",
            "category": "Travel"
        },
        {
            "title": "New MacBook Pro",
            "target_amount": 2800,
            "current_amount": 1200,
            "deadline": "2025-12-01",
            "category": "Shopping"
        },
        {
            "title": "Investment Portfolio Growth",
            "target_amount": 25000,
            "current_amount": 12500,
            "deadline": "2027-08-01",
            "category": "Investments"
        },
        {
            "title": "Professional Certification Course",
            "target_amount": 1500,
            "current_amount": 600,
            "deadline": "2025-11-30",
            "category": "Education"
        }
    ]
    
    goals = []
    for goal_data in goals_data:
        goal = GoalDB(
            id=str(uuid.uuid4()),
            title=goal_data["title"],
            target_amount=goal_data["target_amount"],
            current_amount=goal_data["current_amount"],
            deadline=goal_data["deadline"],
            category=goal_data["category"]
        )
        goals.append(goal)
        db.add(goal)
    
    db.flush()
    return goals

def create_monthly_plan(db):
    """Create a realistic monthly financial plan for August 2025"""
    
    allocations = [
        {"category": "Housing & Rent", "amount": 1800},
        {"category": "Groceries", "amount": 500},
        {"category": "Dining Out", "amount": 400},
        {"category": "Transportation", "amount": 350},
        {"category": "Utilities", "amount": 250},
        {"category": "Entertainment", "amount": 250},
        {"category": "Shopping", "amount": 300},
        {"category": "Healthcare", "amount": 200},
        {"category": "Subscriptions", "amount": 150},
        {"category": "Personal Care", "amount": 100},
        {"category": "Fitness", "amount": 60},
        {"category": "Emergency Fund", "amount": 200},
        {"category": "Investments", "amount": 500},
        {"category": "Savings", "amount": 200},
        {"category": "Miscellaneous", "amount": 100}
    ]
    
    plan_goals = [
        {
            "title": "Emergency Fund",
            "target_amount": 15000,
            "current_amount": 8500,
            "deadline": "2026-06-30",
            "category": "Emergency Fund"
        },
        {
            "title": "European Vacation",
            "target_amount": 4500,
            "current_amount": 1800,
            "deadline": "2026-05-15",
            "category": "Travel"
        }
    ]
    
    plan = PlanDB(
        id=str(uuid.uuid4()),
        month="2025-08",
        income=6800.0,  # Including freelance
        savings_rate=0.15,
        emergency_fund_target=15000.0,
        allocations_json=json.dumps(allocations),
        goals_json=json.dumps(plan_goals),
        status="approved"
    )
    
    db.add(plan)
    db.flush()
    return plan

def create_investment_trades(db):
    """Create realistic investment trades for a beginner investor"""
    
    # Base dates for trades throughout August
    base_date = datetime(2025, 8, 1)
    
    trades_data = [
        # Early month - starting to invest
        {"date": 5, "symbol": "AAPL", "company": "Apple Inc.", "type": "buy", "quantity": 2.5, "price": 185.50, "fees": 0},
        {"date": 8, "symbol": "MSFT", "company": "Microsoft Corporation", "type": "buy", "quantity": 1.8, "price": 420.25, "fees": 0},
        {"date": 12, "symbol": "VTI", "company": "Vanguard Total Stock Market ETF", "type": "buy", "quantity": 4.0, "price": 245.80, "fees": 0},
        
        # Mid month - diversifying
        {"date": 16, "symbol": "GOOGL", "company": "Alphabet Inc.", "type": "buy", "quantity": 0.75, "price": 165.30, "fees": 0},
        {"date": 20, "symbol": "NVDA", "company": "NVIDIA Corporation", "type": "buy", "quantity": 1.2, "price": 125.75, "fees": 0},
        
        # Late month - some profit taking
        {"date": 25, "symbol": "AAPL", "company": "Apple Inc.", "type": "sell", "quantity": 0.5, "price": 188.20, "fees": 0},
        
        # Month end - adding to ETF position
        {"date": 28, "symbol": "VTI", "company": "Vanguard Total Stock Market ETF", "type": "buy", "quantity": 2.0, "price": 248.15, "fees": 0},
        {"date": 30, "symbol": "SPY", "company": "SPDR S&P 500 ETF Trust", "type": "buy", "quantity": 1.5, "price": 520.40, "fees": 0},
    ]
    
    trades = []
    for trade_data in trades_data:
        trade_date = base_date + timedelta(days=trade_data["date"] - 1)
        
        trade = InvestmentTradeDB(
            id=str(uuid.uuid4()),
            symbol=trade_data["symbol"],
            company_name=trade_data["company"],
            type=TradeType(trade_data["type"]),
            quantity=trade_data["quantity"],
            price=trade_data["price"],
            fees=trade_data["fees"],
            date=trade_date.isoformat()
        )
        trades.append(trade)
        db.add(trade)
    
    db.flush()
    return trades

def create_watchlist(db):
    """Create a realistic watchlist for monitoring stocks"""
    
    watchlist_data = [
        {"symbol": "TSLA", "company": "Tesla, Inc."},
        {"symbol": "AMD", "company": "Advanced Micro Devices, Inc."},
        {"symbol": "AMZN", "company": "Amazon.com, Inc."},
        {"symbol": "META", "company": "Meta Platforms, Inc."},
        {"symbol": "NFLX", "company": "Netflix, Inc."},
        {"symbol": "DIS", "company": "The Walt Disney Company"},
    ]
    
    watchlist_items = []
    for item_data in watchlist_data:
        item = WatchlistItemDB(
            id=str(uuid.uuid4()),
            symbol=item_data["symbol"],
            company_name=item_data["company"]
        )
        watchlist_items.append(item)
        db.add(item)
    
    db.flush()
    return watchlist_items

if __name__ == "__main__":
    create_tables()
    create_realistic_seed_data()