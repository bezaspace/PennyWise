import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_goal():
    goal_data = {
        "title": "Test Goal",
        "target_amount": 1000.0,
        "current_amount": 100.0,
        "deadline": "2025-12-31",
        "category": "Savings"
    }
    response = client.post("/api/goals", json=goal_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Goal"
    assert data["target_amount"] == 1000.0
    assert data["current_amount"] == 100.0
    assert data["deadline"] == "2025-12-31"
    assert data["category"] == "Savings"
    return data["id"]

def test_update_goal():
    # Create a goal first
    goal_id = test_create_goal()
    updates = {"title": "Updated Goal", "target_amount": 2000.0}
    response = client.put(f"/api/goals/{goal_id}", json=updates)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Goal"
    assert data["target_amount"] == 2000.0

def test_delete_goal():
    # Create a goal first
    goal_id = test_create_goal()
    response = client.delete(f"/api/goals/{goal_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Goal deleted successfully"

def test_get_goals():
    response = client.get("/api/goals")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
