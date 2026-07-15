import secrets
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class SessionStatus(str, Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class ToneStyle(str, Enum):
    calm_mentor = "calm_mentor"
    friendly = "friendly"


class BrewLevel(str, Enum):
    guided = "guided"  # 도전형 리추얼 — AI가 단계별로 자세히 안내
    independent = "independent"  # 독립형 리추얼 — 간섭을 최소화하고 나만의 속도로


class ItemType(str, Enum):
    tea = "tea"
    book = "book"


def generate_token() -> str:
    return secrets.token_hex(24)


# ---------- 부스 / 예약 ----------


class Booth(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""


class RitualSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booth_id: int = Field(foreign_key="booth.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    membership_id: Optional[int] = Field(default=None, foreign_key="membership.id")
    linked_session_id: Optional[int] = Field(default=None, foreign_key="ritualsession.id")
    customer_name: str
    phone: str
    start_time: datetime
    end_time: datetime
    status: SessionStatus = Field(default=SessionStatus.confirmed)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SessionCreate(SQLModel):
    booth_id: int
    customer_name: str
    phone: str
    start_time: datetime
    user_id: Optional[int] = None
    membership_id: Optional[int] = None
    pair_booth_id: Optional[int] = None  # 지정하면 '페어 모드'로 두 부스를 함께 예약


class SessionRead(SQLModel):
    id: int
    booth_id: int
    user_id: Optional[int]
    membership_id: Optional[int]
    linked_session_id: Optional[int]
    customer_name: str
    phone: str
    start_time: datetime
    end_time: datetime
    status: SessionStatus


# ---------- 사용자 / 온보딩 ----------


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    phone: str
    password_hash: str
    tone_preference: Optional[ToneStyle] = Field(default=None)
    brew_level: Optional[BrewLevel] = Field(default=None)
    auth_token: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(SQLModel):
    name: str
    email: str
    phone: str
    password: str
    tone_preference: Optional[ToneStyle] = None
    brew_level: Optional[BrewLevel] = None


class UserRead(SQLModel):
    id: int
    name: str
    email: str
    phone: str
    tone_preference: Optional[ToneStyle]
    brew_level: Optional[BrewLevel]
    created_at: datetime


class UserLogin(SQLModel):
    email: str
    password: str


class LoginResponse(SQLModel):
    user: UserRead
    auth_token: str


class ToneUpdate(SQLModel):
    tone_preference: ToneStyle


class BrewLevelUpdate(SQLModel):
    brew_level: BrewLevel


class ToneSuggestRequest(SQLModel):
    mood_text: str


class ToneSuggestResponse(SQLModel):
    suggested_tone: ToneStyle
    reason: str


# ---------- 차 / 책 카탈로그 ----------


class Tea(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    mood_tags: str = ""  # 쉼표로 구분된 키워드, 예: "번아웃,이완,밤"
    price: int = 8000
    brew_amount_g: int = 3
    brew_temp_c: int = 80
    brew_seconds: int = 90


class Book(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    author: str = ""
    mood_tags: str = ""
    price: int = 15000


class TeaRead(SQLModel):
    id: int
    name: str
    description: str
    mood_tags: str
    price: int
    brew_amount_g: int
    brew_temp_c: int
    brew_seconds: int


class BookRead(SQLModel):
    id: int
    title: str
    author: str
    mood_tags: str
    price: int


# ---------- AI 큐레이션 ----------


class CurationMode(str, Enum):
    chat = "chat"
    scan = "scan"


class CurationRequest(SQLModel):
    mode: CurationMode
    mood_text: Optional[str] = None
    keyword: Optional[str] = None
    user_id: Optional[int] = None


class Environment(SQLModel):
    lighting: str
    sound: str


class CurationResponse(SQLModel):
    tea: TeaRead
    book: BookRead
    environment: Environment
    matched_tags: list[str]
    personalized: bool = False


class CurationLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    mode: CurationMode
    input_text: str
    tea_id: int = Field(foreign_key="tea.id")
    book_id: int = Field(foreign_key="book.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- 리테일 ----------


class Purchase(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    item_type: ItemType
    item_id: int
    quantity: int = 1
    unit_price: int
    total_price: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PurchaseCreate(SQLModel):
    user_id: Optional[int] = None
    item_type: ItemType
    item_id: int
    quantity: int = 1


# ---------- 멤버십 / 구독 ----------


class MembershipPlan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    session_count: int
    price: int
    valid_days: int = 30


class Membership(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    plan_id: int = Field(foreign_key="membershipplan.id")
    remaining_sessions: int
    purchased_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime


class MembershipCreate(SQLModel):
    user_id: int
    plan_id: int


class MembershipRead(SQLModel):
    id: int
    user_id: int
    plan_id: int
    remaining_sessions: int
    purchased_at: datetime
    expires_at: datetime


# ---------- 리추얼 기록 ----------


class RitualLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: Optional[int] = Field(default=None, foreign_key="ritualsession.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    tea_id: Optional[int] = Field(default=None, foreign_key="tea.id")
    book_id: Optional[int] = Field(default=None, foreign_key="book.id")
    mood_score: int  # 1~4 (mockup의 표정 아이콘에 대응)
    focus_score: int  # 1~5 (별점)
    note: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RitualLogCreate(SQLModel):
    session_id: Optional[int] = None
    user_id: Optional[int] = None
    tea_id: Optional[int] = None
    book_id: Optional[int] = None
    mood_score: int
    focus_score: int
    note: str = ""
