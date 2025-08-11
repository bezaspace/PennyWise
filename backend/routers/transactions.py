from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from database import get_db
from models import (
    TransactionDB, Transaction, TransactionCreate, TransactionType
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=List[Transaction])
def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(TransactionDB).order_by(TransactionDB.created_at.desc()).all()
    result = []
    for t in transactions:
        result.append(Transaction(
            id=t.id,
            description=t.description,
            amount=t.amount,
            category=t.category,
            date=t.date,
            type=t.type.value
        ))
    return result


@router.get("/{transaction_id}", response_model=Transaction)
def get_transaction_by_id(transaction_id: str, db: Session = Depends(get_db)):
    transaction = db.query(TransactionDB).filter(TransactionDB.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Transaction(
        id=transaction.id,
        description=transaction.description,
        amount=transaction.amount,
        category=transaction.category,
        date=transaction.date,
        type=transaction.type.value
    )


@router.post("", response_model=Transaction)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    transaction_id = str(int(datetime.now().timestamp() * 1000))
    
    db_transaction = TransactionDB(
        id=transaction_id,
        description=transaction.description,
        amount=transaction.amount,
        category=transaction.category,
        date=transaction.date,
        type=TransactionType(transaction.type)
    )
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    return Transaction(
        id=db_transaction.id,
        description=db_transaction.description,
        amount=db_transaction.amount,
        category=db_transaction.category,
        date=db_transaction.date,
        type=db_transaction.type.value
    )


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db)):
    transaction = db.query(TransactionDB).filter(TransactionDB.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(transaction)
    db.commit()
    
    return {"message": "Transaction deleted successfully"}