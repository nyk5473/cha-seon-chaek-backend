from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database import get_session
from models import (
    Book,
    BookRead,
    CurationLog,
    CurationRequest,
    CurationResponse,
    Environment,
    RitualLog,
    Tea,
    TeaRead,
)

router = APIRouter(tags=["curation"])

_RELAX_TAGS = {"번아웃", "이완", "밤", "수면", "사색", "고민"}
_FOCUS_TAGS = {"집중", "활력", "아침", "독서"}
_AFFINITY_WEIGHT = 2  # 취향 점수가 태그 매칭 점수를 얼마나 밀어붙일 수 있는지


@router.get("/teas", response_model=list[Tea])
def list_teas(session: Session = Depends(get_session)):
    return session.exec(select(Tea)).all()


@router.get("/books", response_model=list[Book])
def list_books(session: Session = Depends(get_session)):
    return session.exec(select(Book)).all()


def _tags_of(item_tags: str) -> set[str]:
    return {tag.strip() for tag in item_tags.split(",") if tag.strip()}


def _affinity_scores(session: Session, user_id: int | None, id_field: str) -> dict[int, float]:
    """지난 리추얼 기록(기분·집중도 평점)을 바탕으로 항목별 선호도(0~1)를 계산한다."""
    if user_id is None:
        return {}
    logs = session.exec(select(RitualLog).where(RitualLog.user_id == user_id)).all()
    ratings: dict[int, list[float]] = defaultdict(list)
    for log in logs:
        item_id = getattr(log, id_field)
        if item_id is None:
            continue
        ratings[item_id].append((log.mood_score + log.focus_score) / 9)
    return {item_id: sum(values) / len(values) for item_id, values in ratings.items()}


def _best_match(items: list, input_text: str, affinity: dict[int, float]) -> tuple[object, set[str], bool]:
    best_item = items[0]
    best_tags: set[str] = set()
    best_score = -1.0
    for item in items:
        tags = _tags_of(item.mood_tags)
        tag_score = sum(1 for tag in tags if tag in input_text)
        score = tag_score + affinity.get(item.id, 0.0) * _AFFINITY_WEIGHT
        if score > best_score:
            best_item, best_tags, best_score = item, tags, score
    matched = {tag for tag in best_tags if tag in input_text}
    personalized = affinity.get(best_item.id, 0.0) > 0
    return best_item, matched, personalized


def _environment_for(matched_tags: set[str]) -> Environment:
    if matched_tags & _RELAX_TAGS:
        return Environment(lighting="낮은 조도의 따뜻한 간접조명", sound="빗소리 ASMR")
    if matched_tags & _FOCUS_TAGS:
        return Environment(lighting="눈의 피로를 줄이는 중간 조도 백색광", sound="잔잔한 화이트 노이즈")
    return Environment(lighting="은은한 기본 조명", sound="잔잔한 어쿠스틱 연주")


@router.post("/curations", response_model=CurationResponse)
def create_curation(payload: CurationRequest, session: Session = Depends(get_session)):
    input_text = payload.mood_text or payload.keyword or ""

    teas = session.exec(select(Tea)).all()
    books = session.exec(select(Book)).all()

    tea_affinity = _affinity_scores(session, payload.user_id, "tea_id")
    book_affinity = _affinity_scores(session, payload.user_id, "book_id")

    tea, tea_tags, tea_personalized = _best_match(teas, input_text, tea_affinity)
    book, book_tags, book_personalized = _best_match(books, input_text, book_affinity)
    matched_tags = tea_tags | book_tags
    tea_read = TeaRead.model_validate(tea)
    book_read = BookRead.model_validate(book)

    log = CurationLog(
        user_id=payload.user_id,
        mode=payload.mode,
        input_text=input_text,
        tea_id=tea.id,
        book_id=book.id,
    )
    session.add(log)
    session.commit()

    return CurationResponse(
        tea=tea_read,
        book=book_read,
        environment=_environment_for(matched_tags),
        matched_tags=sorted(matched_tags),
        personalized=tea_personalized or book_personalized,
    )
