from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
import uuid

from database import get_db
from models import (
    InvestmentTradeDB, WatchlistItemDB, TradeType,
    InvestmentTrade, InvestmentTradeCreate, InvestmentTradeUpdate,
    Holding as HoldingModel, PortfolioSummary as PortfolioSummaryModel,
    WatchlistItem as WatchlistItemModel, Quote as QuoteModel,
)
from services.portfolio_service import compute_holdings
from services.validation_service import validate_sell_quantity, validate_positive_values
from stock_service import get_quote, get_quotes

router = APIRouter(prefix="/api/investments", tags=["investments"])


@router.get("/holdings", response_model=List[HoldingModel])
def get_investment_holdings(sort: str = "value", db: Session = Depends(get_db)):
    holdings, _ = compute_holdings(db)
    if sort == "gain":
        holdings.sort(key=lambda h: h.get("unrealized_gain", 0.0), reverse=True)
    elif sort == "alpha":
        holdings.sort(key=lambda h: h.get("symbol", ""))
    else:
        holdings.sort(key=lambda h: h.get("value", 0.0), reverse=True)
    return holdings


@router.get("/summary", response_model=PortfolioSummaryModel)
def get_portfolio_summary(db: Session = Depends(get_db)):
    holdings, _ = compute_holdings(db)
    symbols = [h["symbol"] for h in holdings]
    quotes = get_quotes(symbols) if symbols else {}

    total_value = 0.0
    overall_gain = 0.0
    total_prev_value = 0.0
    
    for h in holdings:
        sym = h["symbol"]
        qty = float(h["quantity"])
        avg_cost = float(h["average_cost"]) if h["average_cost"] else 0.0
        q = quotes.get(sym)
        current_price = float(q["price"]) if q else 0.0
        prev_close = float(q["prev_close"]) if q else 0.0
        total_value += qty * current_price
        total_prev_value += qty * prev_close
        overall_gain += (current_price - avg_cost) * qty

    day_change = total_value - total_prev_value
    day_change_pct = (day_change / total_prev_value * 100.0) if total_prev_value > 0 else 0.0
    overall_gain_pct = (overall_gain / (total_value - overall_gain) * 100.0) if (total_value - overall_gain) > 0 else 0.0
    
    last_updated = 0.0
    for sym in symbols:
        q = quotes.get(sym)
        if q:
            last_updated = max(last_updated, float(q.get("last_updated", 0.0)))

    return PortfolioSummaryModel(
        total_value=round(total_value, 2),
        day_change=round(day_change, 2),
        day_change_percent=round(day_change_pct, 4),
        overall_gain=round(overall_gain, 2),
        overall_gain_percent=round(overall_gain_pct, 4),
        last_updated=last_updated,
    )


@router.get("/trades", response_model=List[InvestmentTrade])
def list_trades(limit: int = 0, db: Session = Depends(get_db)):
    q = db.query(InvestmentTradeDB).order_by(InvestmentTradeDB.created_at.desc())
    if limit and limit > 0:
        q = q.limit(limit)
    items = q.all()
    result = []
    for t in items:
        result.append(InvestmentTrade(
            id=t.id,
            symbol=t.symbol,
            company_name=t.company_name,
            type=t.type.value,
            quantity=t.quantity,
            price=t.price,
            fees=t.fees,
            date=t.date,
        ))
    return result


@router.post("/trades", response_model=InvestmentTrade)
def create_trade(payload: InvestmentTradeCreate, db: Session = Depends(get_db)):
    symbol = payload.symbol.upper().strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")
    
    if not validate_positive_values(quantity=payload.quantity, price=payload.price):
        raise HTTPException(status_code=400, detail="Quantity and price must be positive")

    # Validate sell against owned quantity
    if payload.type == "sell":
        if not validate_sell_quantity(db, symbol, payload.quantity):
            raise HTTPException(status_code=400, detail="Cannot sell more shares than owned")

    trade_id = str(uuid.uuid4())
    db_trade = InvestmentTradeDB(
        id=trade_id,
        symbol=symbol,
        company_name=payload.company_name,
        type=TradeType(payload.type),
        quantity=float(payload.quantity),
        price=float(payload.price),
        fees=float(payload.fees or 0.0),
        date=payload.date,
    )
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)
    return InvestmentTrade(
        id=db_trade.id,
        symbol=db_trade.symbol,
        company_name=db_trade.company_name,
        type=db_trade.type.value,
        quantity=db_trade.quantity,
        price=db_trade.price,
        fees=db_trade.fees,
        date=db_trade.date,
    )


@router.put("/trades/{trade_id}", response_model=InvestmentTrade)
def update_trade(trade_id: str, updates: InvestmentTradeUpdate, db: Session = Depends(get_db)):
    trade = db.query(InvestmentTradeDB).filter(InvestmentTradeDB.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    # Apply updates (symbol/type immutable in MVP)
    if updates.quantity is not None:
        if not validate_positive_values(quantity=updates.quantity):
            raise HTTPException(status_code=400, detail="Quantity must be positive")
        trade.quantity = float(updates.quantity)
    if updates.price is not None:
        if not validate_positive_values(price=updates.price):
            raise HTTPException(status_code=400, detail="Price must be positive")
        trade.price = float(updates.price)
    if updates.fees is not None:
        trade.fees = float(updates.fees)
    if updates.date is not None:
        trade.date = updates.date

    # Validate sells post-update
    if trade.type == TradeType.sell:
        if not validate_sell_quantity(db, trade.symbol, trade.quantity, trade.id):
            raise HTTPException(status_code=400, detail="Cannot sell more shares than owned")

    db.add(trade)
    db.commit()
    db.refresh(trade)
    return InvestmentTrade(
        id=trade.id,
        symbol=trade.symbol,
        company_name=trade.company_name,
        type=trade.type.value,
        quantity=trade.quantity,
        price=trade.price,
        fees=trade.fees,
        date=trade.date,
    )


@router.delete("/trades/{trade_id}")
def delete_trade(trade_id: str, db: Session = Depends(get_db)):
    trade = db.query(InvestmentTradeDB).filter(InvestmentTradeDB.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    db.delete(trade)
    db.commit()
    return {"message": "Trade deleted"}


@router.delete("/holdings/{symbol}")
def remove_holding(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    db.query(InvestmentTradeDB).filter(InvestmentTradeDB.symbol == symbol).delete()
    db.commit()
    return {"message": f"Removed all trades for {symbol}"}


@router.get("/watchlist", response_model=List[WatchlistItemModel])
def get_watchlist(db: Session = Depends(get_db)):
    items = db.query(WatchlistItemDB).order_by(WatchlistItemDB.created_at.desc()).all()
    return [WatchlistItemModel(id=i.id, symbol=i.symbol, company_name=i.company_name) for i in items]


@router.post("/watchlist", response_model=WatchlistItemModel)
def add_watchlist_item(payload: dict = Body(...), db: Session = Depends(get_db)):
    symbol = (payload.get("symbol") or "").upper().strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")
    name = payload.get("company_name")
    existing = db.query(WatchlistItemDB).filter(WatchlistItemDB.symbol == symbol).first()
    if existing:
        return WatchlistItemModel(id=existing.id, symbol=existing.symbol, company_name=existing.company_name)
    item = WatchlistItemDB(id=str(uuid.uuid4()), symbol=symbol, company_name=name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return WatchlistItemModel(id=item.id, symbol=item.symbol, company_name=item.company_name)


@router.delete("/watchlist/{identifier}")
def delete_watchlist_item(identifier: str, db: Session = Depends(get_db)):
    item = db.query(WatchlistItemDB).filter((WatchlistItemDB.id == identifier) | (WatchlistItemDB.symbol == identifier.upper())).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
    return {"message": "Watchlist item deleted"}


@router.get("/quote/{symbol}", response_model=QuoteModel)
def get_symbol_quote(symbol: str):
    q = get_quote(symbol)
    if not q:
        raise HTTPException(status_code=404, detail="Quote not available")
    return QuoteModel(**q)
@router.put("/trades/{trade_id}", response_model=InvestmentTrade)
def update_trade(trade_id: str, updates: InvestmentTradeUpdate, db: Session = Depends(get_db)):
    trade = db.query(InvestmentTradeDB).filter(InvestmentTradeDB.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    # Apply updates (symbol/type immutable in MVP)
    if updates.quantity is not None:
        if not validate_positive_values(quantity=updates.quantity):
            raise HTTPException(status_code=400, detail="Quantity must be positive")
        trade.quantity = float(updates.quantity)
    if updates.price is not None:
        if not validate_positive_values(price=updates.price):
            raise HTTPException(status_code=400, detail="Price must be positive")
        trade.price = float(updates.price)
    if updates.fees is not None:
        trade.fees = float(updates.fees)
    if updates.date is not None:
        trade.date = updates.date

    # Validate sells post-update
    if trade.type == TradeType.sell:
        if not validate_sell_quantity(db, trade.symbol, trade.quantity, trade.id):
            raise HTTPException(status_code=400, detail="Cannot sell more shares than owned")

    db.add(trade)
    db.commit()
    db.refresh(trade)
    return InvestmentTrade(
        id=trade.id,
        symbol=trade.symbol,
        company_name=trade.company_name,
        type=trade.type.value,
        quantity=trade.quantity,
        price=trade.price,
        fees=trade.fees,
        date=trade.date,
    )


@router.delete("/trades/{trade_id}")
def delete_trade(trade_id: str, db: Session = Depends(get_db)):
    trade = db.query(InvestmentTradeDB).filter(InvestmentTradeDB.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    db.delete(trade)
    db.commit()
    return {"message": "Trade deleted"}


@router.delete("/holdings/{symbol}")
def remove_holding(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    db.query(InvestmentTradeDB).filter(InvestmentTradeDB.symbol == symbol).delete()
    db.commit()
    return {"message": f"Removed all trades for {symbol}"}


@router.get("/watchlist", response_model=List[WatchlistItemModel])
def get_watchlist(db: Session = Depends(get_db)):
    items = db.query(WatchlistItemDB).order_by(WatchlistItemDB.created_at.desc()).all()
    return [WatchlistItemModel(id=i.id, symbol=i.symbol, company_name=i.company_name) for i in items]


@router.post("/watchlist", response_model=WatchlistItemModel)
def add_watchlist_item(payload: dict = Body(...), db: Session = Depends(get_db)):
    symbol = (payload.get("symbol") or "").upper().strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")
    name = payload.get("company_name")
    existing = db.query(WatchlistItemDB).filter(WatchlistItemDB.symbol == symbol).first()
    if existing:
        return WatchlistItemModel(id=existing.id, symbol=existing.symbol, company_name=existing.company_name)
    item = WatchlistItemDB(id=str(uuid.uuid4()), symbol=symbol, company_name=name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return WatchlistItemModel(id=item.id, symbol=item.symbol, company_name=item.company_name)


@router.delete("/watchlist/{identifier}")
def delete_watchlist_item(identifier: str, db: Session = Depends(get_db)):
    item = db.query(WatchlistItemDB).filter((WatchlistItemDB.id == identifier) | (WatchlistItemDB.symbol == identifier.upper())).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
    return {"message": "Watchlist item deleted"}


@router.get("/quote/{symbol}", response_model=QuoteModel)
def get_symbol_quote(symbol: str):
    q = get_quote(symbol)
    if not q:
        raise HTTPException(status_code=404, detail="Quote not available")
    return QuoteModel(**q)