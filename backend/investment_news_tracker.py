"""
Investment News Tracker Script using GoogleADK
------------------------------------------------
Run this script in the terminal to get a detailed set of news about a stock from several sources using Google Search.
No external tools required; uses built-in Google Search tool from ADK.
"""

import sys
from google.adk.agents import Agent
from google.adk.tools import google_search

# Define the agent for investment news tracking

"""
Investment News Tracker Script using GoogleADK
------------------------------------------------
Run this script in the terminal to get a detailed set of news about a stock from several sources using Google Search.
No external tools required; uses built-in Google Search tool from ADK.
"""

# Standard library imports
import os
import sys
import asyncio

# Third-party imports
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools import google_search
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types

# Load environment variables from .env
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Agent definition
investment_news_agent = Agent(
    name="investment_news_agent",
    model="gemini-2.0-flash",  # Use the latest supported model for your setup
    description="Agent that aggregates recent news about a stock using Google Search.",
    instruction=(
        "You are an expert financial news aggregator. "
        "When given a stock ticker or company name, use the google_search tool to find recent news articles "
        "from multiple reputable sources (e.g., Reuters, Bloomberg, CNBC, Yahoo Finance, MarketWatch, Financial Times). "
        "Summarize the news in a detailed, readable format for investment tracking. "
        "If no news is found, state that clearly."
    ),
    tools=[google_search]
)

# Main async function
async def main():
    if len(sys.argv) < 2:
        print("Usage: python investment_news_tracker.py <stock_ticker_or_company_name>")
        sys.exit(1)
    query = " ".join(sys.argv[1:])
    print(f"\nFetching investment news for: {query}\n{'-'*50}")

    # Create session and runner
    app_name = "investment_news_tracker"
    user_id = "cli_user"
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=app_name, user_id=user_id)
    runner = Runner(agent=investment_news_agent, app_name=app_name, session_service=session_service)

    # Prepare user prompt
    content = types.Content(
        role="user",
        parts=[types.Part(text=f"Use Google Search to find and summarize the latest investment news articles about {query} from reputable sources like Reuters, Bloomberg, CNBC, Yahoo Finance, MarketWatch, and Financial Times. List headlines, sources, and dates, and provide a readable summary. If no news is found, state that clearly.")]
    )

    # Run agent and print debug output
    final_response = None
    print("\n--- Debug: Agent Events ---")
    async for event in runner.run_async(session_id=session.id, user_id=user_id, new_message=content):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    print(f"Event: {part.text}\n")
        if event.is_final_response():
            if event.content and event.content.parts:
                final_response = event.content.parts[0].text
    print("\nInvestment News Summary:\n")
    print(final_response or "No news found or unable to retrieve news at this time.")

# Entry point
if __name__ == "__main__":
    asyncio.run(main())
