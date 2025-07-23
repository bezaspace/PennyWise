import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_delete_category_updates_transactions_and_removes_budgets():
    # Create a category
    import datetime
    unique_name = f"TestCategory_{datetime.datetime.now().timestamp()}"
    response = client.post("/api/categories", json={"name": unique_name})
    assert response.status_code == 200
    category = response.json()
    category_id = category["id"]

    # Create a budget for the category
    response = client.post("/api/budget-category", json={"category": unique_name, "limit": 100, "period": "monthly"})
    assert response.status_code == 200
    budget = response.json()
    budget_id = budget["id"]

    # Create a transaction for the category
    import datetime
    response = client.post(
        "/api/transactions",
        json={
            "amount": 50,
            "category": unique_name,
            "description": "Test transaction",
            "date": datetime.datetime.now().isoformat(),
            "type": "expense"
        }
    )
    assert response.status_code == 200
    transaction = response.json()
    transaction_id = transaction["id"]

    # Delete the category
    response = client.delete(f"/api/categories/{category_id}")
    assert response.status_code == 200

    # Check that the budget is deleted
    response = client.get(f"/api/budgets/{budget_id}")
    assert response.status_code == 404

    # Check that the transaction's category is now 'Unknown'
    response = client.get(f"/api/transactions/{transaction_id}")
    assert response.status_code == 200
    transaction = response.json()
    assert transaction["category"] in ["Unknown", "Uncategorized"]
