import time
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
        except Exception:
            pass

        if last_price is None or prev_close is None:
            return None

        return Quote(symbol=symbol.upper(), price=last_price, prev_close=prev_close, company_name=name)
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


