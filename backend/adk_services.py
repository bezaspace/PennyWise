from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from database import DATABASE_URL
from tools import get_transactions, get_budgets, get_goals, add_transaction
import logging

logger = logging.getLogger(__name__)

# Define the financial agent
financial_agent = LlmAgent(
    model="gemini-2.5-flash-lite-preview-06-17",
    name="FinancialAgent",
    instruction="""You are a helpful and friendly financial assistant.
A user is asking for advice about their finances or wants to log a transaction.
- If the user asks about their spending, transactions, or recent activity, use the `get_transactions` tool.
- If the user asks about their budgets, use the `get_budgets` tool.
- If the user asks about their financial goals, use the `get_goals` tool.
- If the user says something like 'I bought something for this amount' or wants to log a purchase, use the `add_transaction` tool. If the user does not provide category, type, or date, you can decide/fill them yourself. Only description (what they bought) and amount (price) are required.
- For general financial advice, answer based on your knowledge.
The user ID is always provided by the backend; never ask the user for their ID. Assume all data you see is for the current user.
Respond in a conversational, clear, and concise manner.
Analyze the results from the tools to provide specific, actionable advice.
""",
    tools=[get_transactions, get_budgets, get_goals, add_transaction],
)

# Setup ADK services
session_service = DatabaseSessionService(db_url=DATABASE_URL)
runner = Runner(
    agent=financial_agent,
    app_name="PennyWise",
    session_service=session_service,
)

def initialize_adk_services(engine):
    """
    Initializes the ADK services, ensuring database tables are created.
    """
    try:
        print("Initializing ADK services and creating tables...")
        print(f"Database URL: {DATABASE_URL}")
        
        # Create ADK tables
        if hasattr(session_service, "metadata"):
            session_service.metadata.create_all(bind=engine)
            print("ADK service tables created successfully.")
        else:
            print("Warning: DatabaseSessionService does not have a 'metadata' attribute. Tables may not be created.")
            
        # Test the session service connection
        logger.info("ADK services initialized successfully")
        print("✅ ADK services initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize ADK services: {e}")
        print(f"❌ Error initializing ADK services: {e}")
        raise
