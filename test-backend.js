// Quick test script to verify backend API endpoints
const API_BASE = 'http://localhost:8000';

async function testAPI() {
  console.log('🧪 Testing PennyWise Backend API...\n');
  
  try {
    // Test health check
    console.log('1. Testing health check...');
    const health = await fetch(`${API_BASE}/`);
    const healthData = await health.json();
    console.log('✅ Health check:', healthData.message);
    
    // Test transactions
    console.log('\n2. Testing transactions...');
    const transactions = await fetch(`${API_BASE}/api/transactions`);
    const transactionData = await transactions.json();
    console.log(`✅ Transactions: Found ${transactionData.length} transactions`);
    
    // Test budgets
    console.log('\n3. Testing budgets...');
    const budgets = await fetch(`${API_BASE}/api/budgets`);
    const budgetData = await budgets.json();
    console.log(`✅ Budgets: Found ${budgetData.length} budgets`);
    
    // Test goals
    console.log('\n4. Testing goals...');
    const goals = await fetch(`${API_BASE}/api/goals`);
    const goalData = await goals.json();
    console.log(`✅ Goals: Found ${goalData.length} goals`);
    
    // Test analytics
    console.log('\n5. Testing analytics...');
    const balance = await fetch(`${API_BASE}/api/analytics/balance`);
    const balanceData = await balance.json();
    console.log(`✅ Balance: $${balanceData.balance}`);
    
    const income = await fetch(`${API_BASE}/api/analytics/income`);
    const incomeData = await income.json();
    console.log(`✅ Monthly Income: $${incomeData.monthly_income}`);
    
    const expenses = await fetch(`${API_BASE}/api/analytics/expenses`);
    const expenseData = await expenses.json();
    console.log(`✅ Monthly Expenses: $${expenseData.monthly_expenses}`);
    
    console.log('\n🎉 All API endpoints are working correctly!');
    console.log('\n📊 Visit http://localhost:8000/docs for interactive API documentation');
    
  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running:');
    console.log('   cd backend && python start.py');
  }
}

// Run the test
testAPI();