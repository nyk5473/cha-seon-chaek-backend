from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Book, ItemType, Purchase, PurchaseCreate, Tea

router = APIRouter(prefix="/purchases", tags=["retail"])


def _lookup_item(session: Session, item_type: ItemType, item_id: int):
    model = Tea if item_type == ItemType.tea else Book
    item = session.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    return item


@router.post("", response_model=Purchase)
def create_purchase(payload: PurchaseCreate, session: Session = Depends(get_session)):
    if payload.quantity < 1:
        raise HTTPException(status_code=400, detail="수량은 1개 이상이어야 합니다")

    item = _lookup_item(session, payload.item_type, payload.item_id)
    total_price = item.price * payload.quantity

    purchase = Purchase(
        user_id=payload.user_id,
        item_type=payload.item_type,
        item_id=payload.item_id,
        quantity=payload.quantity,
        unit_price=item.price,
        total_price=total_price,
    )
    session.add(purchase)
    session.commit()
    session.refresh(purchase)
    return purchase


@router.get("", response_model=list[Purchase])
def list_purchases(user_id: Optional[int] = None, session: Session = Depends(get_session)):
    query = select(Purchase)
    if user_id is not None:
        query = query.where(Purchase.user_id == user_id)
    return session.exec(query).all()
