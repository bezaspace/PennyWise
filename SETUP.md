# PennyWise Setup Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://www.python.org/downloads/)
- **Expo CLI** - Install with: `npm install -g @expo/cli`

### 1. Start the Backend

**Option A: Using the startup scripts (Recommended)**
```bash
# On Windows
./start-backend.bat

# On macOS/Linux
chmod +x start-backend.sh
./start-backend.sh
```

**Option B: Manual setup**
```bash
cd backend
pip install -r requirements.txt
python start.py
```

The backend will start at: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Database: SQLite (auto-created with sample data)

### 2. Start the Frontend

```bash
# Install dependencies
npm install

# Start the Expo development server
npm run dev
```

The app will be available at: http://localhost:8081

### 3. Connect Frontend to Backend

The frontend is already configured to connect to the backend at `http://localhost:8000`. 

If you need to change the backend URL, update the `.env` file:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 📱 Testing the Integration

1. **Start both servers** (backend on :8000, frontend on :8081)
2. **Open the app** in Expo Go or web browser
3. **Verify data persistence** - Add transactions, budgets, or goals
4. **Check the database** - Data should persist between app restarts
5. **Test API endpoints** - Visit http://localhost:8000/docs

## 🔧 Development Workflow

### Backend Development
- **Auto-reload**: Enabled by default
- **Database**: SQLite file `backend/finance_app.db`
- **Logs**: Console output shows API requests
- **Reset data**: Delete `finance_app.db` and restart server

### Frontend Development
- **Hot reload**: Enabled by default
- **Network requests**: Check browser/Metro console for API calls
- **Environment**: Uses `.env` for configuration

## 🐛 Troubleshooting

### Backend Issues
```bash
# Check Python installation
python --version

# Install dependencies manually
cd backend
pip install fastapi uvicorn sqlalchemy pydantic python-multipart python-dotenv

# Start server manually
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Issues
```bash
# Clear Expo cache
expo start --clear

# Reset Metro bundler
npx expo start --clear

# Check environment variables
echo $EXPO_PUBLIC_API_BASE_URL
```

### Network Issues
- **CORS errors**: Check `backend/.env` CORS_ORIGINS setting
- **Connection refused**: Ensure backend is running on port 8000
- **Mobile device**: Use your computer's IP address instead of localhost

## 📊 API Endpoints

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Create transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Budgets
- `GET /api/budgets` - List all budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/{id}` - Update budget

### Goals
- `GET /api/goals` - List all goals
- `POST /api/goals` - Create goal
- `PUT /api/goals/{id}` - Update goal

### Analytics
- `GET /api/analytics/balance` - Total balance
- `GET /api/analytics/income` - Monthly income
- `GET /api/analytics/expenses` - Monthly expenses
- `GET /api/analytics/spending` - Spending by category

## 🎯 Next Steps

Your PennyWise app now has:
- ✅ **Persistent data storage** with SQLite
- ✅ **RESTful API** with FastAPI
- ✅ **Real-time updates** between frontend and backend
- ✅ **Auto-generated API documentation**
- ✅ **Development-ready setup** with hot reload

Ready for future enhancements like:
- User authentication
- Multi-user support
- Cloud deployment
- Mobile app distribution