from google.adk.agents import LlmAgent
from google.adk.tools import google_search
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from database import DATABASE_URL
from tools import (
    get_transactions,
    get_budgets,
    get_goals,
    add_transaction,
    add_transaction_payload,
    create_budget_category,
    create_budget_category_payload,
    delete_budget_category,
    create_goal,
    update_goal,
    delete_goal,
    emit_plan_preview,
    finalize_plan,
    finalize_plan_payload,
    get_latest_plan,
    get_latest_plan_payload,
    # Investment tools
    get_investment_holdings,
    get_portfolio_summary,
    list_trades,
    create_trade,
    get_quote,
    get_watchlist,
    add_watchlist_item,
    delete_watchlist_item,
)
import logging

logger = logging.getLogger(__name__)

# Define the unified single agent that combines all functionality
unified_single_agent = LlmAgent(
    model="gemini-2.0-flash-live-001",
    name="PennyWiseAssistant",
    instruction="""You are PennyWise, a comprehensive financial assistant that handles all aspects of personal finance management.

You can help with:

**TRANSACTIONS & SPENDING:**
- If the user asks about their spending, transactions, recent activity, purchase history, or anything related to what they've spent money on, use the `get_transactions` tool to show them their recent transactions.
- If the user says something like 'I bought something for this amount' or wants to log a purchase, use the `add_transaction` tool. If the user does not provide category, type, or date, you can decide/fill them yourself. Only description (what they bought) and amount (price) are required.

**BUDGETS:**
- If the user asks about their budgets, spending limits, budget status, or how much they have left to spend, use the `get_budgets` tool to show their budget information.
- If the user wants to create a new budget category, use the `create_budget_category` tool.
- If the user wants to delete a budget category, use the `delete_budget_category` tool.

**FINANCIAL GOALS:**
- If the user asks about their financial goals, savings targets, goal progress, or what they're saving for, use the `get_goals` tool to show their financial goals.
- If the user wants to create a new financial goal, use the `create_goal` tool.
- If the user wants to update a financial goal, use the `update_goal` tool.
- If the user wants to delete a financial goal, use the `delete_goal` tool.

**FINANCIAL PLANNING:**
- For monthly planning tasks, you can check for existing plans using `get_latest_plan` and create plan previews using `emit_plan_preview`.
- When proposing budget allocations or financial plans, use `emit_plan_preview` to show the user what the plan would look like.
- Only use `finalize_plan` after the user gives explicit approval to implement a plan.

**INVESTMENTS & PORTFOLIO:**
- For investment portfolio questions, use `get_investment_holdings` to show current holdings and positions.
- Use `get_portfolio_summary` to show overall portfolio performance and totals.
- Use `list_trades` to show recent trading activity.
- Use `create_trade` when the user wants to record a buy/sell transaction.
- Use `get_quote` to get current stock prices and market data.
- Use `get_watchlist` to show symbols the user is tracking.
- Use `add_watchlist_item` to add stocks to their watchlist.
- Use `delete_watchlist_item` to remove stocks from their watchlist.

**MARKET RESEARCH:**
- For market research, company news, earnings reports, or general market information, use the `google_search` tool to find recent news and analysis.
- Always provide source links in your responses when available using markdown format: [Title](URL).
- Prefer trustworthy financial sources like Reuters, Bloomberg, Yahoo Finance, MarketWatch, etc.

**GENERAL GUIDELINES:**
- The user ID is always provided by the backend; never ask the user for their ID.
- Always return structured tool results so the UI can render widgets and data properly.
- Respond in a conversational, clear, and concise manner.
- Analyze the results from tools to provide specific, actionable advice.
- When you use tools, explain what you're doing: "Let me check your recent transactions..." then use the appropriate tool.

**RECEIPT/PHOTO ANALYSIS:**
- If the user uploads a general photo of a product (not a receipt), identify the item and category from context.
- If the price is NOT provided and NOT reliably detected from the image, ask for the price explicitly.
- Once you have the price, evaluate whether buying it is a good idea based on their current budgets, recent spending, goals, and cashflow.
- If confirmed, log it using add_transaction with appropriate details.
""",
    tools=[
        # Financial management tools
        get_transactions, get_budgets, get_goals, 
        add_transaction, create_budget_category, delete_budget_category,
        create_goal, update_goal, delete_goal,
        
        # Planning tools
        emit_plan_preview, finalize_plan, get_latest_plan,
        
        # Investment tools
        get_investment_holdings, get_portfolio_summary, list_trades, create_trade,
        get_quote, get_watchlist, add_watchlist_item, delete_watchlist_item,
        
        # Market research tools
        google_search,
    ],
)

# Setup ADK services with the unified single agent
session_service = DatabaseSessionService(db_url=DATABASE_URL)
unified_runner = Runner(
    agent=unified_single_agent,
    app_name="PennyWise",
    session_service=session_service,
)

# Text-capable version of the unified agent for non-voice endpoints
unified_single_agent_text = LlmAgent(
    model="gemini-2.5-flash-lite-preview-06-17",
    name="PennyWiseAssistantText",
    instruction=unified_single_agent.instruction,
    tools=[
        # Financial management tools (use payload variants where needed for text)
        get_transactions,
        get_budgets,
        get_goals,
        add_transaction_payload,  # Use payload variant for text to avoid schema defaults
        create_budget_category_payload,  # Use payload variant for text
        delete_budget_category,
        create_goal,
        update_goal,
        delete_goal,
        
        # Planning tools (use payload variants for text)
        emit_plan_preview,
        finalize_plan_payload,  # Use payload variant for text
        get_latest_plan_payload,  # Use payload variant for text
        
        # Investment tools
        get_investment_holdings,
        get_portfolio_summary,
        list_trades,
        create_trade,
        get_quote,
        get_watchlist,
        add_watchlist_item,
        delete_watchlist_item,
        
        # Market research tools
        google_search,
    ],
)

unified_runner_text = Runner(
    agent=unified_single_agent_text,
    app_name="PennyWise",
    session_service=session_service,
)

# Maintain backward compatibility by aliasing the unified runner to existing names
runner = unified_runner  # Main voice runner
runner_text = unified_runner_text  # Text runner
planning_runner = unified_runner  # Planning now handled by unified agent
investment_runner = unified_runner  # Investment now handled by unified agent

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
        logger.info("ADK services initialized successfully with unified single agent")
        print("✅ ADK services initialized successfully with unified single agent")
        
    except Exception as e:
        logger.error(f"Failed to initialize ADK services: {e}")
        print(f"❌ Error initializing ADK services: {e}")
        raise
