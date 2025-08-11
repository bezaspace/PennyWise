from sqlalchemy.orm import Session
from models import InvestmentTradeDB, TradeType


def validate_sell_quantity(db: Session, symbol: str, sell_quantity: float, exclude_trade_id: str = None) -> bool:
    """
    Validate that a sell order doesn't exceed owned quantity.
    
    Args:
        db: Database session
        symbol: Stock symbol
        sell_quantity: Quantity to sell
        exclude_trade_id: Trade ID to exclude from calculation (for updates)
    
    Returns:
        True if valid, False otherwise
    """
    query = db.query(InvestmentTradeDB).filter(InvestmentTradeDB.symbol == symbol)
    
    if exclude_trade_id:
        query = query.filter(InvestmentTradeDB.id != exclude_trade_id)
    
    trades = query.order_by(
        InvestmentTradeDB.date.asc(), 
        InvestmentTradeDB.created_at.asc()
    ).all()
    
    owned = 0.0
    for t in trades:
        if t.type == TradeType.buy:
            owned += float(t.quantity)
        else:
            owned -= float(t.quantity)
    
    return sell_quantity <= owned + 1e-9


def validate_positive_values(**kwargs) -> bool:
    """Validate that all provided values are positive."""
    for key, value in kwargs.items():
        if value is not None and value <= 0:
            return False
    return True