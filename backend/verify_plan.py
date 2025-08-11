from database import SessionLocal
from models import PlanDB

# Query the plans table

def main():
    db = SessionLocal()
    plans = db.query(PlanDB).all()
    for plan in plans:
        print(f"ID: {plan.id}, Month: {plan.month}, Income: {plan.income}, Status: {plan.status}")
    db.close()

if __name__ == "__main__":
    main()
