import time
from datetime import datetime
from typing import Dict, List, Optional

import yfinance as yf


class Quote:
    def __init__(
        self,
        symbol: str,
        price: float,
        prev_close: float,
        company_name: Optional[str] = None,
        last_updated: Optional[float] = None,
    ) -> None:
        self.symbol = symbol.upper()
        self.price = float(price)
        self.prev_close = float(prev_close)
        self.company_name = company_name
        self.last_updated = last_updated or time.time()
        # optional extended fields
        self.open = None
        self.day_high = None
        self.day_low = None
        self.market_cap = None
        self.pe_ratio = None
        self.div_yield = None
        self.fifty_two_wk_high = None
        self.fifty_two_wk_low = None

    @property
    def change(self) -> float:
        return self.price - self.prev_close

    @property
    def change_percent(self) -> float:
        if self.prev_close == 0:
            return 0.0
        return (self.change / self.prev_close) * 100.0

    def to_dict(self) -> Dict:
        return {
            "symbol": self.symbol,
            "company_name": self.company_name,
            "price": self.price,
            "prev_close": self.prev_close,
            "change": self.change,
            "change_percent": self.change_percent,
            "last_updated": self.last_updated,
            "open": self.open,
            "day_high": self.day_high,
            "day_low": self.day_low,
            "market_cap": self.market_cap,
            "pe_ratio": self.pe_ratio,
            "div_yield": self.div_yield,
            "fifty_two_wk_high": self.fifty_two_wk_high,
            "fifty_two_wk_low": self.fifty_two_wk_low,
        }


class QuoteCache:
    def __init__(self, ttl_seconds: int = 90) -> None:
        self._cache: Dict[str, Quote] = {}
        self._ttl = ttl_seconds

    def get(self, symbol: str) -> Optional[Quote]:
        symbol = symbol.upper()
        quote = self._cache.get(symbol)
        if not quote:
            return None
        if (time.time() - quote.last_updated) > self._ttl:
            return None
        return quote

    def set(self, quote: Quote) -> None:
        self._cache[quote.symbol] = quote


_cache = QuoteCache(ttl_seconds=90)


def _fetch_quote_from_source(symbol: str) -> Optional[Quote]:
    """Fetch a fresh quote for the given symbol using yfinance.
    Returns None if unable to fetch.
    """
    try:
        ticker = yf.Ticker(symbol)

        # Try fast_info first for performance
        name: Optional[str] = None
        last_price: Optional[float] = None
        prev_close: Optional[float] = None

        try:
            fi = getattr(ticker, "fast_info", None)
            if fi:
                last_price = float(fi.get("last_price")) if fi.get("last_price") is not None else None
                prev_close = float(fi.get("previous_close")) if fi.get("previous_close") is not None else None
        except Exception:
            pass

        # Fallback to history if fast_info not sufficient
        if last_price is None or prev_close is None:
            hist = ticker.history(period="2d")
            if not hist.empty:
                closes = hist["Close"].tolist()
                if len(closes) == 1:
                    prev_close = float(closes[0])
                    last_price = float(closes[0])
                else:
                    prev_close = float(closes[-2])
                    last_price = float(closes[-1])

        # Attempt to get company name (non-critical)
        try:
            info = ticker.get_info()
            if isinstance(info, dict):
                name = info.get("shortName") or info.get("longName")
                # populate extended fields when available
                try:
                    # typical keys: open, dayHigh, dayLow, marketCap, trailingPE, dividendYield, fiftyTwoWeekHigh, fiftyTwoWeekLow
                    ext_open = info.get("open")
                    ext_day_high = info.get("dayHigh") or info.get("day_high")
                    ext_day_low = info.get("dayLow") or info.get("day_low")
                    ext_mcap = info.get("marketCap")
                    ext_pe = info.get("trailingPE") or info.get("pe")
                    ext_div = info.get("dividendYield")
                    ext_52_high = info.get("fiftyTwoWeekHigh") or info.get("52WeekHigh")
                    ext_52_low = info.get("fiftyTwoWeekLow") or info.get("52WeekLow")
                    # assign to variables in outer scope via locals of Quote
                    # We'll set these on the Quote instance after creation via returning them
                except Exception:
                    ext_open = ext_day_high = ext_day_low = ext_mcap = ext_pe = ext_div = ext_52_high = ext_52_low = None
        except Exception:
            pass

        if last_price is None or prev_close is None:
            return None

        q = Quote(symbol=symbol.upper(), price=last_price, prev_close=prev_close, company_name=name)
        # attach extended fields if available
        try:
            info = getattr(ticker, "get_info")()
            if isinstance(info, dict):
                q.open = info.get("open")
                q.day_high = info.get("dayHigh") or info.get("day_high")
                q.day_low = info.get("dayLow") or info.get("day_low")
                q.market_cap = info.get("marketCap")
                q.pe_ratio = info.get("trailingPE") or info.get("pe")
                # dividendYield may be a ratio (0.02) or None
                q.div_yield = info.get("dividendYield")
                q.fifty_two_wk_high = info.get("fiftyTwoWeekHigh") or info.get("52WeekHigh")
                q.fifty_two_wk_low = info.get("fiftyTwoWeekLow") or info.get("52WeekLow")
        except Exception:
            pass

        return q
    except Exception:
        return None


def get_quote(symbol: str) -> Optional[Dict]:
    """Get quote for a single symbol with caching. Returns a dict or None."""
    symbol = symbol.upper()
    quote = _cache.get(symbol)
    if not quote:
        fresh = _fetch_quote_from_source(symbol)
        if fresh:
            _cache.set(fresh)
            quote = fresh
        else:
            return None
    return quote.to_dict()


def get_quotes(symbols: List[str]) -> Dict[str, Dict]:
    """Batch get quotes for a list of symbols. Always returns a mapping; missing symbols are omitted."""
    result: Dict[str, Dict] = {}
    unique_symbols = list({s.upper() for s in symbols if s})
    for sym in unique_symbols:
        q = get_quote(sym)
        if q:
            result[sym] = q
    return result


def get_price_history(symbol: str, period: str = "7d") -> Optional[List[Dict]]:
    """Return list of {"t": unix_ms, "price": float} for the requested period.
    period examples: '1d','5d','7d','1mo','3mo'
    """
    try:
        ticker = yf.Ticker(symbol)
        # yfinance accepts period like '7d' or '1mo'. For short periods (like 1d)
        # request an intraday interval so we get multiple samples (5m) instead
        # of a single daily close.
        interval = None
        if period == '1d':
            interval = '5m'
        # other mappings could be added if needed
        if interval:
            hist = ticker.history(period=period, interval=interval)
        else:
            hist = ticker.history(period=period)
        if hist is None or hist.empty:
            return []
        out: List[Dict] = []
        # Use the Close prices
        for idx, row in hist.iterrows():
            # idx may be Timestamp; convert to unix ms
            try:
                ts = int(pd_to_unix_ms(idx))
            except Exception:
                # fallback: try timestamp attribute
                try:
                    ts = int(pd_to_unix_ms(row.name))
                except Exception:
                    ts = int(time.time() * 1000)
            price = float(row["Close"]) if "Close" in row else float(row[-1])
            out.append({"t": ts, "price": round(price, 6)})
        # ensure ascending
        out.sort(key=lambda x: x["t"])
        return out
    except Exception:
        return []


def pd_to_unix_ms(ts) -> int:
    """Helper to convert pandas Timestamp-like to unix ms."""
    try:
        # pandas Timestamp has .timestamp()
        return int(ts.timestamp() * 1000)
    except Exception:
        try:
            # datetime
            return int(datetime_to_unix_ms(ts))
        except Exception:
            return int(time.time() * 1000)


def datetime_to_unix_ms(dt) -> int:
    try:
        return int(dt.timestamp() * 1000)
    except Exception:
        return int(time.time() * 1000)


