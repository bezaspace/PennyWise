from google.adk.agents import LlmAgent
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
    exa_search_payload,
    exa_productsearch_tool,
)
import logging

logger = logging.getLogger(__name__)

# Setup ADK services
session_service = DatabaseSessionService(db_url=DATABASE_URL)

# --- Unified Agent (Voice/Live) ---
unified_agent_live = LlmAgent(
    model="gemini-2.0-flash-live-001",
    name="UnifiedAgent",
    description="Single agent that directly handles finance, planning, investments, and market research via tools.",
    instruction=(
        "You are the unified PennyWise assistant.\n"
        "- Handle general personal finance (transactions, budgets, goals, receipt logging) using the finance tools.\n"
        "- Handle monthly planning: retrieve existing plans, propose plan previews, and finalize only with explicit approval.\n"
        "- Handle investments: holdings, portfolio summary, trades, quotes, and watchlist.\n"
        "- Handle market research using Exa search and present sources succinctly.\n"
        "- Never ask for user_id; the backend provides it.\n"
        "- Keep responses concise and conversational, and always pass through structured tool results."
    ),
    tools=[
        # Finance
        get_transactions,
        get_budgets,
        get_goals,
        add_transaction,
        create_budget_category,
        delete_budget_category,
        create_goal,
        update_goal,
        delete_goal,
        # Planning
        get_latest_plan,
        emit_plan_preview,
        finalize_plan,
        # Investments
        get_investment_holdings,
        get_portfolio_summary,
        list_trades,
        create_trade,
        get_quote,
        get_watchlist,
        add_watchlist_item,
        delete_watchlist_item,
    # Market research
    exa_search_payload,
    exa_productsearch_tool,
    ],
)

unified_runner = Runner(
    agent=unified_agent_live,
    app_name="PennyWise",
    session_service=session_service,
)

# --- Unified Text Agent & Runners (for text chat and debug) ---
unified_agent_text = LlmAgent(
    model="gemini-2.5-flash-lite-preview-06-17",
    name="UnifiedAssistant",
    description=unified_agent_live.description,
    instruction=unified_agent_live.instruction,
    tools=[
        # Finance
        get_transactions,
        get_budgets,
        get_goals,
        # payload variants to avoid default values in schema when needed
        add_transaction_payload,
        create_budget_category_payload,
        delete_budget_category,
        create_goal,
        update_goal,
        delete_goal,
        # Planning
        get_latest_plan_payload,
        emit_plan_preview,
        finalize_plan_payload,
        # Investments
        get_investment_holdings,
        get_portfolio_summary,
        list_trades,
        create_trade,
        get_quote,
        get_watchlist,
        add_watchlist_item,
        delete_watchlist_item,
    # Market research
    exa_search_payload,
    exa_productsearch_tool,
    ],
)

runner_text = Runner(
    agent=unified_agent_text,
    app_name="PennyWise",
    session_service=session_service,
)

# Backward-compatible alias used elsewhere in the codebase
runner = Runner(
    agent=unified_agent_text,
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
        logger.info("ADK services initialized successfully")
        print("✅ ADK services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize ADK services: {e}")
        print(f"❌ Error initializing ADK services: {e}")
        raise
