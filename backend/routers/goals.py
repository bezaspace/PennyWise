from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from database import get_db
from models import GoalDB, Goal, GoalCreate, GoalUpdate

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("", response_model=List[Goal])
def get_goals(db: Session = Depends(get_db)):
    goals = db.query(GoalDB).all()
    result = []
    for g in goals:
        result.append(Goal(
            id=g.id,
            title=g.title,
            target_amount=g.target_amount,
            current_amount=g.current_amount,
            deadline=g.deadline,
            category=g.category
        ))
    return result


@router.post("", response_model=Goal)
def create_goal(goal: GoalCreate, db: Session = Depends(get_db)):
    goal_id = str(int(datetime.now().timestamp() * 1000))
    db_goal = GoalDB(
        id=goal_id,
        title=goal.title,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        deadline=goal.deadline,
        category=goal.category
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return Goal(
        id=db_goal.id,
        title=db_goal.title,
        target_amount=db_goal.target_amount,
        current_amount=db_goal.current_amount,
        deadline=db_goal.deadline,
        category=db_goal.category
    )


@router.put("/{goal_id}", response_model=Goal)
def update_goal(goal_id: str, goal_update: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(GoalDB).filter(GoalDB.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    update_data = goal_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return Goal(
        id=goal.id,
        title=goal.title,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        deadline=goal.deadline,
        category=goal.category
    )


@router.delete("/{goal_id}")
def delete_goal(goal_id: str, db: Session = Depends(get_db)):
    goal = db.query(GoalDB).filter(GoalDB.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}