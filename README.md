# PennyWise - Personal Finance App

A modern personal finance tracking app built with React Native (Expo) frontend and FastAPI backend.

## 🏗️ Architecture

### Frontend (React Native + Expo)
- **Framework**: React Native with Expo
- **Navigation**: Expo Router with tabs
- **UI**: Custom components with Lucide icons
- **AI Integration**: Google Gemini API for financial advice
- **State Management**: React hooks with API integration

### Backend (FastAPI + SQLite)
- **Framework**: FastAPI with automatic API documentation
- **Database**: SQLite with SQLAlchemy ORM
- **API**: RESTful endpoints for all CRUD operations
- **Data Models**: Transaction, Budget, Goal with analytics

## 🚀 Quick Start

### 1. Start the Backend
```bash
# Option A: Use startup script (Windows)
./start-backend.bat

# Option B: Use startup script (macOS/Linux)
chmod +x start-backend.sh && ./start-backend.sh

# Option C: Manual setup
cd backend
pip install -r requirements.txt
python start.py
```

Backend will be available at: http://localhost:8000

### 2. Start the Frontend
```bash
npm install
npm run dev
```

Frontend will be available at: http://localhost:8081

## 📱 Features

### Dashboard
- Balance overview with visibility toggle
- Quick stats (income, expenses, budget, savings)
- Recent transactions
- Financial goals progress

### Transactions
- Add/delete transactions
- Search and filter functionality
- AI-powered category suggestions
- Real-time balance updates

### Budget Management
- Create and manage budgets by category
- Progress tracking with visual indicators
- AI-generated budget insights
- Spending alerts

### Financial Goals
- Set savings goals with deadlines
- Progress tracking
- AI-powered goal advice
- Category-based organization

### AI Assistant
- Chat interface with financial advisor
- Personalized advice based on spending patterns
- Budget recommendations
- Goal achievement strategies

## 🔧 API Endpoints

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Create new transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Budgets
- `GET /api/budgets` - List all budgets
- `POST /api/budgets` - Create new budget
- `PUT /api/budgets/{id}` - Update budget

### Goals
- `GET /api/goals` - List all goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/{id}` - Update goal

### Analytics
- `GET /api/analytics/balance` - Total balance
- `GET /api/analytics/income` - Monthly income
- `GET /api/analytics/expenses` - Monthly expenses
- `GET /api/analytics/spending?days=30` - Spending by category

## 🧪 Testing

### Test Backend API
```bash
node test-backend.js
```

### API Documentation
Visit http://localhost:8000/docs for interactive Swagger UI documentation.

## 📁 Project Structure

```
PennyWise/
├── app/                    # React Native screens
│   ├── (tabs)/            # Tab navigation screens
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
├── services/             # API and storage services
├── constants/            # Colors and styles
├── backend/              # FastAPI backend
│   ├── main.py          # FastAPI app
│   ├── models.py        # Data models
│   ├── database.py      # Database setup
│   └── requirements.txt # Python dependencies
└── README.md            # This file
```

## 🔄 Data Flow

1. **Frontend** makes HTTP requests to FastAPI backend
2. **Backend** processes requests and interacts with SQLite database
3. **Database** stores persistent data (transactions, budgets, goals)
4. **AI Service** provides financial insights via Google Gemini API

## 🛠️ Development

### Backend Development
- Auto-reload enabled for Python files
- SQLite database auto-created with sample data
- CORS configured for React Native development

### Frontend Development
- Hot reload enabled for React Native
- Environment variables for API configuration
- Error handling for network requests

## 🚀 Deployment Ready

The app is structured for easy deployment:
- **Backend**: Can be deployed to any Python hosting service
- **Frontend**: Can be built for web, iOS, or Android
- **Database**: SQLite for development, easily upgradeable to PostgreSQL

## 📋 Next Steps

Your PennyWise app now has:
- ✅ **Complete backend API** with FastAPI
- ✅ **Persistent data storage** with SQLite
- ✅ **Real-time synchronization** between frontend and backend
- ✅ **Auto-generated API documentation**
- ✅ **Development environment** ready

Ready for enhancements like:
- User authentication and multi-user support
- Cloud deployment (Vercel, Railway, etc.)
- Mobile app distribution
- Advanced analytics and reporting
- Bank account integration
- Expense categorization with ML

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both frontend and backend
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.