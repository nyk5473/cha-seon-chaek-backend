from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Membership, MembershipCreate, MembershipPlan, MembershipRead, User

router = APIRouter(tags=["memberships"])


@router.get("/membership-plans", response_model=list[MembershipPlan])
def list_plans(session: Session = Depends(get_session)):
    return session.exec(select(MembershipPlan)).all()


@router.post("/memberships", response_model=MembershipRead)
def subscribe(payload: MembershipCreate, session: Session = Depends(get_session)):
    user = session.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    plan = session.get(MembershipPlan, payload.plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="멤버십 플랜을 찾을 수 없습니다")

    membership = Membership(
        user_id=payload.user_id,
        plan_id=payload.plan_id,
        remaining_sessions=plan.session_count,
        expires_at=datetime.utcnow() + timedelta(days=plan.valid_days),
    )
    session.add(membership)
    session.commit()
    session.refresh(membership)
    return membership


@router.get("/memberships", response_model=list[MembershipRead])
def list_memberships(user_id: Optional[int] = None, session: Session = Depends(get_session)):
    query = select(Membership)
    if user_id is not None:
        query = query.where(Membership.user_id == user_id)
    return session.exec(query).all()
