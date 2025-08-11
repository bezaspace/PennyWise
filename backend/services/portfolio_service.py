from typing import Tuple, Dict, List
from sqlalchemy.orm import Session
from models import InvestmentTradeDB, TradeType
from stock_service import get_quotes


def compute_holdings(db: Session) -> Tuple[List[dict], Dict[str, dict]]:
    """
    Compute current holdings from all trades in DB.
    Returns (holdings_list, by_symbol_map minimal data)
    """
    trades = db.query(InvestmentTradeDB).order_by(
        InvestmentTradeDB.date.asc(), 
        InvestmentTradeDB.created_at.asc()
    ).all()
    
    by_symbol: Dict[str, dict] = {}
    
    for t in trades:
        sym = t.symbol.upper()
        if sym not in by_symbol:
            by_symbol[sym] = {
                "symbol": sym,
                "company_name": t.company_name,
                "quantity": 0.0,
                "cost_basis_total": 0.0,
            }
        
        entry = by_symbol[sym]
        if t.type == TradeType.buy:
            entry["quantity"] += float(t.quantity)
            entry["cost_basis_total"] += float(t.price) * float(t.quantity) + float(t.fees or 0.0)
        else:
            entry["quantity"] -= float(t.quantity)
            if entry["quantity"] < 0:
                entry["quantity"] = round(entry["quantity"], 6)
        
        if t.company_name:
            entry["company_name"] = t.company_name

    holdings: List[dict] = []
    symbols = [s for s, d in by_symbol.items() if d["quantity"] > 0]
    quotes = get_quotes(symbols) if symbols else {}
    
    for sym, data in by_symbol.items():
        qty = float(data["quantity"])
        if qty <= 0:
            continue
            
        cost_basis_total = float(data["cost_basis_total"]) if data["cost_basis_total"] > 0 else 0.0
        avg_cost = (cost_basis_total / qty) if qty > 0 and cost_basis_total > 0 else 0.0
        
        q = quotes.get(sym)
        current_price = float(q["price"]) if q else 0.0
        value = qty * current_price
        unrealized = (current_price - avg_cost) * qty
        unrealized_pct = ((current_price - avg_cost) / avg_cost * 100.0) if avg_cost > 0 else 0.0
        
        holdings.append({
            "symbol": sym,
            "company_name": data.get("company_name"),
            "quantity": qty,
            "average_cost": round(avg_cost, 6),
            "current_price": round(current_price, 6),
            "value": round(value, 2),
            "unrealized_gain": round(unrealized, 2),
            "unrealized_gain_percent": round(unrealized_pct, 4),
        })
    
    return holdings, by_symbol