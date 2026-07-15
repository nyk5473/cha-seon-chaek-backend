from typing import Optional

from fastapi import Depends, Header
from sqlmodel import Session, select

from database import get_session
from models import User


def get_current_user(
    x_auth_token: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
) -> Optional[User]:
    if not x_auth_token:
        return None
    return session.exec(select(User).where(User.auth_token == x_auth_token)).first()
