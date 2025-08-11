from database import SessionLocal, create_tables
from models import PlanDB
import uuid
from datetime import datetime
import json

# Create a mock plan
mock_plan = PlanDB(
    id=str(uuid.uuid4()),
    month="2025-08",
    income=8000.0,
    savings_rate=0.2,
    emergency_fund_target=5000.0,
    allocations_json=json.dumps([
        {"category": "Rent", "amount": 2000},
        {"category": "Groceries", "amount": 600},
        {"category": "Investments", "amount": 1000},
        {"category": "Entertainment", "amount": 400}
    ]),
    goals_json=json.dumps([
        {"title": "Vacation", "target_amount": 3000, "deadline": "2025-12-31", "current_amount": 500, "category": "Entertainment"},
        {"title": "Emergency Fund", "target_amount": 5000, "deadline": "2025-10-31", "current_amount": 2000, "category": "Savings"}
    ]),
    status="approved",
    created_at=datetime.now()
)


def main():
    create_tables()
    db = SessionLocal()
    db.add(mock_plan)
    db.commit()
    db.close()
    print("Mock financial plan seeded successfully.")

if __name__ == "__main__":
    main()
