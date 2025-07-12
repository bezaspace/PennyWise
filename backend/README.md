# PennyWise FastAPI Backend

A RESTful API backend for the PennyWise personal finance app built with FastAPI and SQLite.

## Quick Start

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start the Server**
   ```bash
   python start.py
   ```
   
   Or alternatively:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **API Documentation**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Endpoints

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Budgets
- `GET /api/budgets` - Get all budgets
- `POST /api/budgets` - Create new budget
- `PUT /api/budgets/{id}` - Update budget

### Goals
- `GET /api/goals` - Get all goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/{id}` - Update goal

### Analytics
- `GET /api/analytics/balance` - Get total balance
- `GET /api/analytics/income` - Get monthly income
- `GET /api/analytics/expenses` - Get monthly expenses
- `GET /api/analytics/spending?days=30` - Get spending by category

## Database

- **Type**: SQLite
- **File**: `finance_app.db` (auto-created)
- **Auto-seeded**: Yes, with sample data matching the React Native app

## Environment Variables

Create a `.env` file with:
```
DATABASE_URL=sqlite:///./finance_app.db
CORS_ORIGINS=http://localhost:8081,exp://192.168.1.100:8081,http://localhost:19006
```

## Development

The server runs with auto-reload enabled, so changes to Python files will automatically restart the server.

## Frontend Integration

Update your React Native app's `.env` file:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```