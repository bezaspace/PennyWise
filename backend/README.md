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

## AI Assistant

PennyWise includes an advanced AI assistant powered by Google's Gemini model that provides:

### Unified Agent Architecture
- **Single Agent**: One unified AI assistant handles all financial tasks
- **Comprehensive Tools**: Direct access to all financial, planning, investment, and market research tools
- **Simplified Structure**: Streamlined from previous multi-agent coordinator pattern

### Capabilities
- **Financial Management**: Transactions, budgets, goals, and expense tracking
- **Planning**: Monthly budget planning and financial goal setting  
- **Investments**: Portfolio analysis, trade tracking, watchlist management
- **Market Research**: Real-time stock quotes and financial news

### AI Endpoints
- `WebSocket /api/ai/unified/voice/ws/{user_id}` - Main voice chat endpoint
- `POST /api/ai/chat/stream` - Text-based chat with streaming responses
- `POST /api/ai/receipt/upload` - Receipt/photo analysis and processing
- `GET /api/ai/health` - AI service health check

### Voice Chat Features
- Real-time bidirectional audio communication
- Automatic voice activity detection
- Interruption support for natural conversations
- Multi-modal support (text, audio, images)

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