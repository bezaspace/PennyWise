"""
Investment News Tracker Script using GoogleADK
------------------------------------------------
Run this script in the terminal to get a detailed set of news about a stock from several sources using Google Search.
No external tools required; uses built-in Google Search tool from ADK.
"""

import sys
import os
import asyncio
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools import google_search
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types

from polygon import RESTClient

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# --- AGENT DEFINITIONS ---

"""
EventDetectionAgent uses only Polygon.io REST API endpoints for daily aggregates.
Compatible with free/basic plan (no WebSockets or Flat Files required).
"""
class EventDetectionAgent:
    def __init__(self, api_key):
        self.client = RESTClient(api_key=api_key)

    def get_price_events(self, ticker, lookback_days=30, num_events=15):
        # Fetch daily aggregates for the last N days (free plan: limited window)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=lookback_days)
        aggs = []
        for a in self.client.list_aggs(
            ticker=ticker,
            multiplier=1,
            timespan="day",
            from_=start_date.strftime("%Y-%m-%d"),
            to=end_date.strftime("%Y-%m-%d"),
            limit=500
        ):
            # Polygon.io returns timestamp as milliseconds since epoch
            ts = a.timestamp / 1000 if a.timestamp > 1e12 else a.timestamp
            date_str = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
            aggs.append({
                "date": date_str,
                "close": a.close,
                "volume": a.volume
            })
        if not aggs or len(aggs) < 10:
            return []
        df = pd.DataFrame(aggs)
        df["price_diff"] = df["close"].pct_change() * 100
        df["volume_z"] = (df["volume"] - df["volume"].rolling(5).mean()) / df["volume"].rolling(5).std()
        df["price_z"] = (df["price_diff"] - df["price_diff"].rolling(5).mean()) / df["price_diff"].rolling(5).std()
        # Find top N events by absolute price_z
        df = df.dropna()
        df["abs_price_z"] = df["price_z"].abs()
        events = df.sort_values("abs_price_z", ascending=False).head(num_events)
        return events[["date", "close", "price_diff", "abs_price_z"]].to_dict("records")

## NewsCorrelationAgent removed; Google Search agent will be used for news summaries.

# Orchestrator Agent (ADK)
class OrchestratorAgent:
    def __init__(self, polygon_api_key):
        self.event_agent = EventDetectionAgent(polygon_api_key)

    async def run(self, ticker, company_name=None):
        print(f"Detecting price-changing events for {ticker}...")
        events = self.event_agent.get_price_events(ticker, lookback_days=90, num_events=15)
        if not events:
            print("No significant price events found.")
            return []
        print(f"Found {len(events)} significant price events.")

        # Create a ParallelAgent with gemini-2.0-flash-lite for each event
        from google.adk.agents import ParallelAgent, Agent

        app_name = "investment_news_tracker"
        user_id = "cli_user"
        session_service = InMemorySessionService()
        session = await session_service.create_session(app_name=app_name, user_id=user_id)

        # Create a dedicated agent for each event
        sub_agents = []
        for event in events:
            date = event["date"]
            safe_date = date.replace("-", "_")
            search_query = f"{company_name or ticker} investment news {date}"
            agent = Agent(
                name=f"news_agent_{safe_date}",
                model="gemini-2.0-flash-lite",
                description="Agent that aggregates recent news about a stock using Google Search.",
                instruction=(
                    f"You are an expert financial news aggregator. "
                    f"Use the google_search tool to find and summarize investment news articles about {company_name or ticker} for {date} from reputable sources. "
                    "List headlines, sources, and dates, and provide a readable summary. If no news is found, state that clearly."
                ),
                tools=[google_search]
            )
            sub_agents.append(agent)

        # Prepare ParallelAgent
        parallel_agent = ParallelAgent(
            name="parallel_news_gatherer",
            sub_agents=sub_agents
        )

        runner = Runner(agent=parallel_agent, app_name=app_name, session_service=session_service)

        # Prepare a mapping of agent name to its query
        queries = {}
        for event in events:
            date = event["date"]
            safe_date = date.replace("-", "_")
            agent_name = f"news_agent_{safe_date}"
            queries[agent_name] = f"Use Google Search to find and summarize investment news articles about {company_name or ticker} for {date} from reputable sources. List headlines, sources, and dates, and provide a readable summary. If no news is found, state that clearly."

        # Create a single Content object with all queries
        content = types.Content(
            role="user",
            parts=[types.Part(text=str(queries))]
        )

        results = []
        for idx, agent in enumerate(sub_agents):
            print(f"Fetching news for {company_name or ticker} {events[idx]['date']}...")
        async for event_obj in runner.run_async(session_id=session.id, user_id=user_id, new_message=content):
            if event_obj.is_final_response():
                agent_name = event_obj.author
                for i, agent in enumerate(sub_agents):
                    if agent.name == agent_name:
                        results.append({"event": events[i], "news_summary": event_obj.content.parts[0].text if event_obj.content and event_obj.content.parts else None})
                        break
        return results

# --- ADK Agent for readable summary (fallback)
investment_news_agent = Agent(
    name="investment_news_agent",
    model="gemini-2.0-flash",
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

async def main():
    if len(sys.argv) < 2:
        print("Usage: python investment_news_tracker.py <stock_ticker>")
        sys.exit(1)
    ticker = sys.argv[1].upper()
    polygon_api_key = os.getenv("POLYGON_API_KEY")
    if not polygon_api_key:
        print("Error: POLYGON_API_KEY not set in environment.")
        sys.exit(1)
    if RESTClient is None:
        print("Error: polygon-api-client not installed. Please run 'pip install -U polygon-api-client'.")
        sys.exit(1)

    print(f"\nInvestment News Tracker for: {ticker}\n{'-'*50}")

    orchestrator = OrchestratorAgent(polygon_api_key)
    # Optionally, you can provide a company name for better Google Search results
    company_name = ticker  # You can map ticker to company name if desired
    results = await orchestrator.run(ticker, company_name=company_name)

    if not results:
        print("No events/news found.\n")
        return

    print("\n--- Price Events and News Summaries ---\n")
    for idx, item in enumerate(results, 1):
        event = item["event"]
        print(f"Event {idx}: {event['date']} | Close: {event['close']:.2f} | Price Change: {event['price_diff']:.2f}% | Z-Score: {event['abs_price_z']:.2f}")
        print(f"News Summary:\n{item['news_summary']}")
        print()

if __name__ == "__main__":
    asyncio.run(main())
