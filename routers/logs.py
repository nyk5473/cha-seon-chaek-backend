from typing import Optional

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database import get_session
from models import RitualLog, RitualLogCreate

router = APIRouter(prefix="/logs", tags=["logs"])


@router.post("", response_model=RitualLog)
def create_log(payload: RitualLogCreate, session: Session = Depends(get_session)):
    log = RitualLog(**payload.model_dump())
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


@router.get("", response_model=list[RitualLog])
def list_logs(user_id: Optional[int] = None, session: Session = Depends(get_session)):
    query = select(RitualLog).order_by(RitualLog.created_at.desc())
    if user_id is not None:
        query = query.where(RitualLog.user_id == user_id)
    return session.exec(query).all()
