"""
Verification script for realistic seed data
Validates data integrity and provides summary statistics
"""

from database import SessionLocal
from models import (
    TransactionDB, BudgetDB, GoalDB, CategoryDB, PlanDB,
    InvestmentTradeDB, WatchlistItemDB, TransactionType, TradeType
)
from sqlalchemy import func
from datetime import datetime
import json

def verify_seed_data():
    """Verify and analyze the seeded realistic data"""
    
    db = SessionLocal()
    try:
        print("🔍 VERIFYING REALISTIC SEED DATA")
        print("=" * 50)
        
        # 1. Categories Analysis
        print("\n📂 CATEGORIES")
        categories = db.query(CategoryDB).all()
        income_cats = [c for c in categories if c.type == "income"]
        expense_cats = [c for c in categories if c.type == "expense"]
        both_cats = [c for c in categories if c.type == "both"]
        
        print(f"Total Categories: {len(categories)}")
        print(f"  - Income: {len(income_cats)}")
        print(f"  - Expense: {len(expense_cats)}")
        print(f"  - Both: {len(both_cats)}")
        
        # 2. Transactions Analysis
        print("\n💳 TRANSACTIONS")
        transactions = db.query(TransactionDB).all()
        income_transactions = db.query(TransactionDB).filter(TransactionDB.type == TransactionType.income).all()
        expense_transactions = db.query(TransactionDB).filter(TransactionDB.type == TransactionType.expense).all()
        
        total_income = sum(t.amount for t in income_transactions)
        total_expenses = sum(abs(t.amount) for t in expense_transactions)
        net_income = total_income - total_expenses
        
        print(f"Total Transactions: {len(transactions)}")
        print(f"  - Income Transactions: {len(income_transactions)}")
        print(f"  - Expense Transactions: {len(expense_transactions)}")
        print(f"Total Income: ${total_income:,.2f}")
        print(f"Total Expenses: ${total_expenses:,.2f}")
        print(f"Net Income: ${net_income:,.2f}")
        print(f"Savings Rate: {(net_income/total_income)*100:.1f}%")
        
        # Top spending categories
        print("\n💰 TOP SPENDING CATEGORIES")
        category_spending = {}
        for t in expense_transactions:
            category = t.category
            amount = abs(t.amount)
            category_spending[category] = category_spending.get(category, 0) + amount
        
        sorted_spending = sorted(category_spending.items(), key=lambda x: x[1], reverse=True)
        for i, (category, amount) in enumerate(sorted_spending[:8]):
            print(f"  {i+1}. {category}: ${amount:,.2f}")
        
        # 3. Budgets Analysis
        print("\n🎯 BUDGETS")
        budgets = db.query(BudgetDB).all()
        total_budget_limit = sum(b.limit for b in budgets)
        total_budget_spent = sum(b.spent for b in budgets)
        
        print(f"Total Budget Categories: {len(budgets)}")
        print(f"Total Budget Limit: ${total_budget_limit:,.2f}")
        print(f"Total Budget Spent: ${total_budget_spent:,.2f}")
        print(f"Budget Utilization: {(total_budget_spent/total_budget_limit)*100:.1f}%")
        
        # Over/Under budget categories
        over_budget = [b for b in budgets if b.spent > b.limit]
        under_budget = [b for b in budgets if b.spent < b.limit * 0.8]  # Less than 80% used
        
        if over_budget:
            print(f"\n⚠️  OVER BUDGET ({len(over_budget)} categories):")
            for b in over_budget:
                overage = b.spent - b.limit
                print(f"  - {b.category}: ${b.spent:.2f} / ${b.limit:.2f} (+${overage:.2f})")
        
        if under_budget:
            print(f"\n✅ WELL UNDER BUDGET ({len(under_budget)} categories):")
            for b in under_budget[:5]:  # Show top 5
                remaining = b.limit - b.spent
                print(f"  - {b.category}: ${b.spent:.2f} / ${b.limit:.2f} (-${remaining:.2f})")
        
        # 4. Goals Analysis
        print("\n🎯 FINANCIAL GOALS")
        goals = db.query(GoalDB).all()
        print(f"Total Goals: {len(goals)}")
        
        for goal in goals:
            progress = (goal.current_amount / goal.target_amount) * 100
            remaining = goal.target_amount - goal.current_amount
            deadline = datetime.fromisoformat(goal.deadline).strftime("%b %Y")
            print(f"  - {goal.title}: {progress:.1f}% (${remaining:,.0f} remaining by {deadline})")
        
        # 5. Investment Analysis
        print("\n📈 INVESTMENTS")
        trades = db.query(InvestmentTradeDB).all()
        buy_trades = [t for t in trades if t.type == TradeType.buy]
        sell_trades = [t for t in trades if t.type == TradeType.sell]
        
        total_invested = sum(t.quantity * t.price for t in buy_trades)
        total_sold = sum(t.quantity * t.price for t in sell_trades)
        
        print(f"Total Trades: {len(trades)}")
        print(f"  - Buy Orders: {len(buy_trades)}")
        print(f"  - Sell Orders: {len(sell_trades)}")
        print(f"Total Invested: ${total_invested:,.2f}")
        print(f"Total Sold: ${total_sold:,.2f}")
        print(f"Net Investment: ${total_invested - total_sold:,.2f}")
        
        # Holdings by symbol
        holdings = {}
        for trade in trades:
            symbol = trade.symbol
            if symbol not in holdings:
                holdings[symbol] = {"quantity": 0, "total_cost": 0}
            
            if trade.type == TradeType.buy:
                holdings[symbol]["quantity"] += trade.quantity
                holdings[symbol]["total_cost"] += trade.quantity * trade.price
            else:
                holdings[symbol]["quantity"] -= trade.quantity
                holdings[symbol]["total_cost"] -= trade.quantity * trade.price
        
        print("\n📊 CURRENT HOLDINGS:")
        for symbol, data in holdings.items():
            if data["quantity"] > 0:
                avg_cost = data["total_cost"] / data["quantity"]
                print(f"  - {symbol}: {data['quantity']:.2f} shares @ ${avg_cost:.2f} avg")
        
        # 6. Watchlist
        print("\n👀 WATCHLIST")
        watchlist = db.query(WatchlistItemDB).all()
        print(f"Watchlist Items: {len(watchlist)}")
        for item in watchlist:
            print(f"  - {item.symbol}: {item.company_name}")
        
        # 7. Monthly Plan
        print("\n📋 MONTHLY PLAN")
        plans = db.query(PlanDB).all()
        if plans:
            plan = plans[0]  # Should be only one for August 2025
            allocations = json.loads(plan.allocations_json)
            total_allocated = sum(a["amount"] for a in allocations)
            
            print(f"Month: {plan.month}")
            print(f"Planned Income: ${plan.income:,.2f}")
            print(f"Savings Rate: {plan.savings_rate*100:.1f}%")
            print(f"Total Allocated: ${total_allocated:,.2f}")
            print(f"Emergency Fund Target: ${plan.emergency_fund_target:,.2f}")
            print(f"Status: {plan.status}")
        
        # 8. Data Integrity Checks
        print("\n🔍 DATA INTEGRITY CHECKS")
        
        # Check for orphaned transactions (categories that don't exist)
        all_category_names = {c.name for c in categories}
        transaction_categories = {t.category for t in transactions}
        orphaned_categories = transaction_categories - all_category_names
        
        if orphaned_categories:
            print(f"⚠️  Orphaned transaction categories: {orphaned_categories}")
        else:
            print("✅ All transaction categories have corresponding category records")
        
        # Check budget consistency
        budget_categories = {b.category for b in budgets}
        expense_categories_with_transactions = {t.category for t in expense_transactions}
        missing_budgets = expense_categories_with_transactions - budget_categories
        
        if missing_budgets:
            print(f"⚠️  Categories with expenses but no budget: {missing_budgets}")
        else:
            print("✅ All expense categories have corresponding budgets")
        
        # Check date ranges
        transaction_dates = [datetime.fromisoformat(t.date) for t in transactions]
        min_date = min(transaction_dates)
        max_date = max(transaction_dates)
        
        print(f"✅ Transaction date range: {min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}")
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 SUMMARY")
        print(f"✅ {len(categories)} categories created")
        print(f"✅ {len(transactions)} transactions created")
        print(f"✅ {len(budgets)} budgets created")
        print(f"✅ {len(goals)} goals created")
        print(f"✅ {len(trades)} investment trades created")
        print(f"✅ {len(watchlist)} watchlist items created")
        print(f"✅ {len(plans)} monthly plan created")
        print(f"\n💰 Monthly Profile: ${total_income:,.0f} income, ${total_expenses:,.0f} expenses")
        print(f"💾 Savings Rate: {(net_income/total_income)*100:.1f}%")
        print(f"📈 Investment Activity: ${total_invested:,.0f} invested")
        
        print("\n🎉 Realistic seed data verification complete!")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    verify_seed_data()