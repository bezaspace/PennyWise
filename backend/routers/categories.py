from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from database import get_db
from models import (
    CategoryDB, TransactionDB, BudgetDB,
    Category, CategoryCreate, CategoryUpdate
)

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=List[Category])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(CategoryDB).order_by(CategoryDB.name).all()
    return [Category.from_orm(category) for category in categories]


@router.post("", response_model=Category)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(CategoryDB).filter(CategoryDB.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    category_id = str(int(datetime.now().timestamp() * 1000))
    
    db_category = CategoryDB(
        id=category_id,
        name=category.name
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return db_category


@router.put("/{category_id}", response_model=Category)
def update_category(category_id: str, category_update: CategoryUpdate, db: Session = Depends(get_db)):
    category = db.query(CategoryDB).filter(CategoryDB.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if category_update.name and category_update.name != category.name:
        existing = db.query(CategoryDB).filter(CategoryDB.name == category_update.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Category name already exists")
    
    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    return category


@router.delete("/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db)):
    category = db.query(CategoryDB).filter(CategoryDB.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Ensure 'Unknown' category exists
    unknown_category = db.query(CategoryDB).filter(CategoryDB.name == "Unknown").first()
    if not unknown_category:
        unknown_category_id = str(int(datetime.now().timestamp() * 1000))
        unknown_category = CategoryDB(id=unknown_category_id, name="Unknown", type="expense")
        db.add(unknown_category)
        db.flush()

    # Update transactions to 'Unknown' category
    db.query(TransactionDB).filter(TransactionDB.category == category.name).update({TransactionDB.category: "Unknown"})

    # Delete budgets for this category
    db.query(BudgetDB).filter(BudgetDB.category == category.name).delete()

    db.delete(category)
    db.commit()
    return {"detail": "Category deleted, transactions updated to 'Unknown', budgets removed."}