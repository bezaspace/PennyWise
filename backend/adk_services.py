from google.adk.agents import LlmAgent
from google.adk.tools import google_search
from google.adk.tools import agent_tool
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from database import DATABASE_URL
from tools import (
    get_transactions,
    get_budgets,
    get_goals,
    add_transaction,
    create_budget_category,
    delete_budget_category,
    create_goal,
    update_goal,
    delete_goal,
    emit_plan_preview,
    finalize_plan,
    get_latest_plan,
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

# Define the financial agent
financial_agent = LlmAgent(
    model="gemini-2.0-flash-live-001",
    name="FinancialAgent",
    instruction="""You are a helpful and friendly financial assistant.
A user is asking for advice about their finances or wants to log a transaction.
- If the user asks about their spending, transactions, recent activity, purchase history, or anything related to what they've spent money on, use the `get_transactions` tool to show them their recent transactions.
- If the user asks about their budgets, spending limits, budget status, or how much they have left to spend, use the `get_budgets` tool to show their budget information.
- If the user asks about their financial goals, savings targets, goal progress, or what they're saving for, use the `get_goals` tool to show their financial goals.
- If the user says something like 'I bought something for this amount' or wants to log a purchase, use the `add_transaction` tool. If the user does not provide category, type, or date, you can decide/fill them yourself. Only description (what they bought) and amount (price) are required.
- For general financial advice, answer based on your knowledge.
- If the user wants to create a new budget category, use the `create_budget_category` tool.
- If the user wants to delete a budget category, use the `delete_budget_category` tool.
- If the user wants to create a new financial goal, use the `create_goal` tool.
- If the user wants to update a financial goal, use the `update_goal` tool.
- If the user wants to delete a financial goal, use the `delete_goal` tool.

When you use these tools, explain what you found in a conversational way. For example:
- "Let me check your recent transactions..." then use get_transactions
- "Here's a look at your current budgets..." then use get_budgets  
- "Let me show you your financial goals..." then use get_goals

The user ID is always provided by the backend; never ask the user for their ID. Assume all data you see is for the current user.
Respond in a conversational, clear, and concise manner.
Analyze the results from the tools to provide specific, actionable advice.
""",
    tools=[get_transactions, get_budgets, get_goals, add_transaction, create_budget_category, delete_budget_category, create_goal, update_goal, delete_goal],
)

# Setup ADK services
session_service = DatabaseSessionService(db_url=DATABASE_URL)
runner = Runner(
    agent=financial_agent,
    app_name="PennyWise",
    session_service=session_service,
)

# --- Text Chat Agent & Runner (for generate_content) ---
financial_agent_text = LlmAgent(
    model="gemini-2.5-flash-lite-preview-06-17",
    name="FinancialAgentText",
    instruction=financial_agent.instruction,
    tools=[get_transactions, get_budgets, get_goals, add_transaction, create_budget_category, delete_budget_category, create_goal, update_goal, delete_goal],
)

runner_text = Runner(
    agent=financial_agent_text,
    app_name="PennyWise",
    session_service=session_service,
)

# --- Planning Agent & Runner (voice/live) ---
planning_agent = LlmAgent(
    model="gemini-2.0-flash-live-001",
    name="PlanningAgent",
    instruction="""You are a financial planning assistant for monthly budgeting.
You will:
- On session start, determine the current month automatically. Without asking the user for the month,
  first check for an existing plan for the current month by CALLING get_latest_plan with that month (YYYY-MM).
  If a plan exists, acknowledge it and propose iterating on it rather than starting from scratch. Use emit_plan_preview with that plan.
- If no plan exists, greet the user and explain you'll ask a few questions to create a monthly plan.
- Ask clarifying questions: monthly net income, fixed obligations, savings target (amount or %), priorities (emergency fund, debt, travel), and typical spending categories.
- Use tools to read context if the user asks about current budgets or goals.
- When you have enough info, compute a proposal with allocations per category (monthly amounts) and optional goals. Then CALL the emit_plan_preview tool with a structured plan object (month, income, savings_rate, emergency_fund_target, allocations, goals).
- Iterate on feedback and adjust allocations/goals, calling emit_plan_preview each time you update the plan.
- ONLY after explicit approval (e.g., the user says "Approve this plan"), CALL finalize_plan with the current plan. Do not finalize before explicit consent.
- After finalize, summarize what changed.

Important:
- Never ask for user_id; it's provided by the backend.
- Keep responses concise and conversational. Summarize numbers clearly.
- For allocations, prefer well-known categories already in use if possible.
""",
    tools=[
        get_transactions,
        get_budgets,
        get_goals,
        get_latest_plan,
        emit_plan_preview,
        finalize_plan,
        create_budget_category,
        delete_budget_category,
        create_goal,
        update_goal,
        delete_goal,
    ],
)

planning_runner = Runner(
    agent=planning_agent,
    app_name="PennyWise",
    session_service=session_service,
)

# --- Investment Agent Team (Coordinator + Specialists) & Runner ---
# Specialist 1: Market Research with built-in Google Search (grounded, up-to-date)
market_research_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="MarketResearchAgent",
    description="Finds and summarizes latest company news, earnings, and market context using Google Search.",
    instruction=(
        "You are a market research specialist.\n"
        "- Use google_search to find recent news, earnings reports, analyst notes, and key events for tickers or companies mentioned.\n"
        "- Prefer trustworthy sources. Summarize concisely with citations if available.\n"
        "- Do not make portfolio-specific recommendations; only provide objective context and facts."
    ),
    tools=[google_search],
)

# Specialist 2: Portfolio Insight with DB-backed tools
portfolio_insight_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="PortfolioInsightAgent",
    description="Analyzes user's portfolio, holdings, trades, and watchlist to surface insights and personalized metrics.",
    instruction=(
        "You are a portfolio analysis specialist.\n"
        "- Use tools to read holdings, portfolio summary, recent trades, watchlist, and quotes.\n"
        "- Provide exposure by sector/ticker, concentration risks, winners/laggards, and simple what-if checks (verbally).\n"
        "- You may add symbols to the watchlist or record trades when instructed.\n"
        "- Never ask for user_id."
    ),
    tools=[
        get_investment_holdings,
        get_portfolio_summary,
        list_trades,
        get_watchlist,
        get_quote,
        add_watchlist_item,
        delete_watchlist_item,
        create_trade,
    ],
)

# Coordinator: InvestmentAgent invokes MarketResearch via AgentTool, and calls portfolio tools directly
market_research_tool = agent_tool.AgentTool(agent=market_research_agent)

investment_agent = LlmAgent(
    model="gemini-2.0-flash-live-001",
    name="InvestmentAgent",
    description="Coordinator for investment Q&A and advice; delegates research vs. portfolio tasks to specialists.",
    instruction=(
        "You are the coordinator for investment advice.\n"
        "- If the user asks about latest news, earnings, or external info about a stock/index/sector, call the MarketResearchAgent tool.\n"
        "- If the user asks about their holdings, performance, gains, trades, watchlist, or quotes, CALL THE PROVIDED PORTFOLIO TOOLS DIRECTLY (do not delegate).\n"
        "- Combine specialist outputs into tailored advice considering diversification, risk, time horizon (if inferred), and concentration.\n"
        "- Be explicit about uncertainty and avoid guarantees. Offer next steps (rebalance, add/remove watchlist, or set alerts/goals).\n"
        "- Never ask for a user id. The backend provides context. Always return the structured tool results."
    ),
    tools=[
        # Research via AgentTool
        market_research_tool,
        # Portfolio tools directly for structured UI rendering
        get_investment_holdings,
        get_portfolio_summary,
        list_trades,
        create_trade,
        get_quote,
        get_watchlist,
        add_watchlist_item,
        delete_watchlist_item,
    ],
)

investment_runner = Runner(
    agent=investment_agent,
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
