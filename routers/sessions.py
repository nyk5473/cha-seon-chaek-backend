from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import CLOSE_HOUR, OPEN_HOUR, SESSION_MINUTES, get_session
from models import Booth, Membership, RitualSession, SessionCreate, SessionRead, SessionStatus

router = APIRouter(tags=["sessions"])


@router.get("/booths", response_model=list[Booth])
def list_booths(session: Session = Depends(get_session)):
    return session.exec(select(Booth)).all()


def _day_slots(day: date) -> list[datetime]:
    slots = []
    start = datetime.combine(day, datetime.min.time()).replace(hour=OPEN_HOUR)
    last_start = datetime.combine(day, datetime.min.time()).replace(hour=CLOSE_HOUR) - timedelta(minutes=SESSION_MINUTES)
    current = start
    while current <= last_start:
        slots.append(current)
        current += timedelta(minutes=30)
    return slots


@router.get("/booths/{booth_id}/available-times", response_model=list[datetime])
def available_times(booth_id: int, target_date: date, session: Session = Depends(get_session)):
    booth = session.get(Booth, booth_id)
    if booth is None:
        raise HTTPException(status_code=404, detail="부스를 찾을 수 없습니다")

    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    booked = session.exec(
        select(RitualSession).where(
            RitualSession.booth_id == booth_id,
            RitualSession.status == SessionStatus.confirmed,
            RitualSession.start_time < day_end,
            RitualSession.end_time > day_start,
        )
    ).all()

    available = []
    for slot_start in _day_slots(target_date):
        slot_end = slot_start + timedelta(minutes=SESSION_MINUTES)
        overlaps = any(b.start_time < slot_end and b.end_time > slot_start for b in booked)
        if not overlaps:
            available.append(slot_start)
    return available


@router.get("/sessions", response_model=list[SessionRead])
def list_sessions(target_date: Optional[date] = None, session: Session = Depends(get_session)):
    query = select(RitualSession)
    if target_date is not None:
        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        query = query.where(RitualSession.start_time >= day_start, RitualSession.start_time < day_end)
    return session.exec(query).all()


@router.get("/sessions/{session_id}", response_model=SessionRead)
def get_session_by_id(session_id: int, session: Session = Depends(get_session)):
    result = session.get(RitualSession, session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="예약을 찾을 수 없습니다")
    return result


def _consume_membership(session: Session, membership_id: int, user_id: Optional[int]) -> Membership:
    membership = session.get(Membership, membership_id)
    if membership is None:
        raise HTTPException(status_code=404, detail="멤버십을 찾을 수 없습니다")
    if user_id is not None and membership.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인의 멤버십만 사용할 수 있습니다")
    if membership.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="만료된 멤버십입니다")
    if membership.remaining_sessions < 1:
        raise HTTPException(status_code=400, detail="남은 세션 횟수가 없습니다")
    membership.remaining_sessions -= 1
    session.add(membership)
    return membership


def _check_booth_overlap(session: Session, booth_id: int, start_time: datetime, end_time: datetime) -> None:
    overlapping = session.exec(
        select(RitualSession).where(
            RitualSession.booth_id == booth_id,
            RitualSession.status == SessionStatus.confirmed,
            RitualSession.start_time < end_time,
            RitualSession.end_time > start_time,
        )
    ).first()
    if overlapping is not None:
        raise HTTPException(status_code=409, detail="해당 시간에 이미 예약이 존재합니다")


@router.post("/sessions", response_model=SessionRead)
def create_session(payload: SessionCreate, session: Session = Depends(get_session)):
    booth = session.get(Booth, payload.booth_id)
    if booth is None:
        raise HTTPException(status_code=404, detail="부스를 찾을 수 없습니다")

    if payload.start_time.hour < OPEN_HOUR or payload.start_time.minute % 30 != 0:
        raise HTTPException(status_code=400, detail="영업 시간 및 예약 단위(30분)를 확인해주세요")

    end_time = payload.start_time + timedelta(minutes=SESSION_MINUTES)
    if end_time.time() > datetime.min.time().replace(hour=CLOSE_HOUR) and end_time.date() == payload.start_time.date():
        raise HTTPException(status_code=400, detail="영업 종료 시간을 초과하는 예약입니다")

    _check_booth_overlap(session, payload.booth_id, payload.start_time, end_time)

    pair_booth = None
    if payload.pair_booth_id is not None:
        if payload.pair_booth_id == payload.booth_id:
            raise HTTPException(status_code=400, detail="페어 부스는 원래 부스와 달라야 합니다")
        pair_booth = session.get(Booth, payload.pair_booth_id)
        if pair_booth is None:
            raise HTTPException(status_code=404, detail="페어로 지정한 부스를 찾을 수 없습니다")
        _check_booth_overlap(session, payload.pair_booth_id, payload.start_time, end_time)

    if payload.membership_id is not None:
        _consume_membership(session, payload.membership_id, payload.user_id)

    new_session = RitualSession(
        booth_id=payload.booth_id,
        user_id=payload.user_id,
        membership_id=payload.membership_id,
        customer_name=payload.customer_name,
        phone=payload.phone,
        start_time=payload.start_time,
        end_time=end_time,
    )
    session.add(new_session)
    session.commit()
    session.refresh(new_session)

    if pair_booth is not None:
        pair_session = RitualSession(
            booth_id=payload.pair_booth_id,
            user_id=payload.user_id,
            customer_name=payload.customer_name,
            phone=payload.phone,
            start_time=payload.start_time,
            end_time=end_time,
            linked_session_id=new_session.id,
        )
        session.add(pair_session)
        session.commit()
        session.refresh(pair_session)

        new_session.linked_session_id = pair_session.id
        session.add(new_session)
        session.commit()
        session.refresh(new_session)

    return new_session


@router.delete("/sessions/{session_id}", response_model=SessionRead)
def cancel_session(session_id: int, session: Session = Depends(get_session)):
    result = session.get(RitualSession, session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="예약을 찾을 수 없습니다")

    if result.status == SessionStatus.confirmed and result.membership_id is not None:
        membership = session.get(Membership, result.membership_id)
        if membership is not None:
            membership.remaining_sessions += 1
            session.add(membership)

    if result.status == SessionStatus.confirmed and result.linked_session_id is not None:
        linked = session.get(RitualSession, result.linked_session_id)
        if linked is not None and linked.status == SessionStatus.confirmed:
            linked.status = SessionStatus.cancelled
            session.add(linked)

    result.status = SessionStatus.cancelled
    session.add(result)
    session.commit()
    session.refresh(result)
    return result
