from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import (
    BrewLevelUpdate,
    LoginResponse,
    ToneStyle,
    ToneSuggestRequest,
    ToneSuggestResponse,
    ToneUpdate,
    User,
    UserCreate,
    UserLogin,
    UserRead,
    generate_token,
)
from security import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["users"])

# 온보딩 단계에서 사용자가 말투를 못 정할 때, 기분 키워드로 톤을 제안하기 위한 규칙
_FRIENDLY_KEYWORDS = ["힘들", "지친", "위로", "피곤", "번아웃", "슬프"]
_CALM_MENTOR_KEYWORDS = ["집중", "차분", "명상", "고민", "정리", "몰입"]


@router.post("", response_model=UserRead)
def signup(payload: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다")

    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        tone_preference=payload.tone_preference,
        brew_level=payload.brew_level,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse)
def login(payload: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    user.auth_token = generate_token()
    session.add(user)
    session.commit()
    session.refresh(user)
    return LoginResponse(user=user, auth_token=user.auth_token)


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return user


@router.patch("/{user_id}/tone", response_model=UserRead)
def set_tone(user_id: int, payload: ToneUpdate, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user.tone_preference = payload.tone_preference
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.patch("/{user_id}/brew-level", response_model=UserRead)
def set_brew_level(user_id: int, payload: BrewLevelUpdate, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user.brew_level = payload.brew_level
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/suggest-tone", response_model=ToneSuggestResponse)
def suggest_tone(payload: ToneSuggestRequest):
    text = payload.mood_text
    if any(keyword in text for keyword in _FRIENDLY_KEYWORDS):
        return ToneSuggestResponse(
            suggested_tone=ToneStyle.friendly,
            reason="지금 당신에겐 따뜻한 위로가 필요해 보여요. 친구 같은 말투로 시작해볼까요?",
        )
    if any(keyword in text for keyword in _CALM_MENTOR_KEYWORDS):
        return ToneSuggestResponse(
            suggested_tone=ToneStyle.calm_mentor,
            reason="지금은 차분히 몰입할 시간이 필요해 보여요. 정중한 스승의 말투로 안내해볼까요?",
        )
    return ToneSuggestResponse(
        suggested_tone=ToneStyle.friendly,
        reason="오늘 하루가 어땠는지 편하게 이야기해주는 친구 같은 말투로 시작해볼까요?",
    )
