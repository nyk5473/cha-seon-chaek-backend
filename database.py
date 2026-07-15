from sqlmodel import SQLModel, Session, create_engine, select

from models import Book, Booth, MembershipPlan, Tea

DATABASE_URL = "sqlite:///./cha_seon_chaek.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SESSION_MINUTES = 90
OPEN_HOUR = 10
CLOSE_HOUR = 22
DEFAULT_BOOTH_COUNT = 10

DEFAULT_TEAS = [
    {"name": "고요 캐모마일", "description": "은은한 사과향의 캐모마일. 몸과 마음의 긴장을 풀어준다.", "mood_tags": "번아웃,이완,밤,수면", "brew_amount_g": 2, "brew_temp_c": 90, "brew_seconds": 240},
    {"name": "말차 라떼", "description": "진한 말차의 씁쓸함과 고소함. 집중력을 끌어올린다.", "mood_tags": "집중,활력,아침,독서", "brew_amount_g": 2, "brew_temp_c": 70, "brew_seconds": 60},
    {"name": "정산소종 홍차", "description": "훈연향이 감도는 깊은 홍차. 묵직한 사색에 어울린다.", "mood_tags": "사색,고민,가을,전통", "brew_amount_g": 3, "brew_temp_c": 95, "brew_seconds": 210},
    {"name": "자스민 백차", "description": "가볍고 화사한 꽃향. 산뜻한 기분 전환에 좋다.", "mood_tags": "설렘,기분전환,봄,가벼움", "brew_amount_g": 3, "brew_temp_c": 75, "brew_seconds": 90},
    {"name": "페퍼민트 허브차", "description": "화한 민트 향이 코끝을 뚫어주는 허브차. 답답한 머리를 환기시킨다.", "mood_tags": "상쾌함,두통,갑갑함,환기", "brew_amount_g": 2, "brew_temp_c": 90, "brew_seconds": 180},
    {"name": "얼그레이 홍차", "description": "베르가못 향이 우아하게 감도는 홍차. 나른한 오후를 깨운다.", "mood_tags": "우아함,오후,티타임,클래식", "brew_amount_g": 3, "brew_temp_c": 95, "brew_seconds": 200},
    {"name": "루이보스", "description": "카페인 없이 은은하게 달콤한 루이보스. 잠들기 전 편안함을 준다.", "mood_tags": "편안함,잠들기전,카페인프리,여유", "brew_amount_g": 3, "brew_temp_c": 100, "brew_seconds": 300},
    {"name": "히비스커스", "description": "새콤하고 붉은빛이 도는 허브차. 여름의 활기를 불어넣는다.", "mood_tags": "새콤함,활기,여름,다이어트", "brew_amount_g": 3, "brew_temp_c": 95, "brew_seconds": 300},
    {"name": "보이차", "description": "깊고 묵직한 흑차. 식후 소화를 돕고 사유를 깊게 한다.", "mood_tags": "묵직함,소화,식후,깊이", "brew_amount_g": 5, "brew_temp_c": 95, "brew_seconds": 90},
    {"name": "유자차", "description": "새콤달콤한 유자와 비타민 가득한 티. 몸을 따뜻하게 데워준다.", "mood_tags": "비타민,감기,따뜻함,겨울", "brew_amount_g": 2, "brew_temp_c": 80, "brew_seconds": 90},
]

DEFAULT_BOOKS = [
    {"title": "숨 고르기", "author": "김이완", "mood_tags": "번아웃,이완,밤,수면", "price": 14000},
    {"title": "몰입의 기술", "author": "박집중", "mood_tags": "집중,활력,아침,독서", "price": 16000},
    {"title": "사색의 계절", "author": "이가을", "mood_tags": "사색,고민,가을,전통", "price": 15000},
    {"title": "가벼운 산책", "author": "정봄날", "mood_tags": "설렘,기분전환,봄,가벼움", "price": 13000},
    {"title": "오늘의 두통", "author": "허민트", "mood_tags": "상쾌함,두통,갑갑함,환기", "price": 12000},
    {"title": "오후 세 시의 우아함", "author": "윤홍차", "mood_tags": "우아함,오후,티타임,클래식", "price": 15000},
    {"title": "잠들기 전 열 페이지", "author": "노루이", "mood_tags": "편안함,잠들기전,카페인프리,여유", "price": 13500},
    {"title": "여름을 걷는 법", "author": "하비스", "mood_tags": "새콤함,활기,여름,다이어트", "price": 14500},
    {"title": "깊은 밤의 사유", "author": "차보이", "mood_tags": "묵직함,소화,식후,깊이", "price": 17000},
    {"title": "겨울 편지", "author": "감유자", "mood_tags": "비타민,감기,따뜻함,겨울", "price": 13000},
]

DEFAULT_MEMBERSHIP_PLANS = [
    {"name": "라이트 4회권", "session_count": 4, "price": 96000, "valid_days": 30},
    {"name": "스탠다드 8회권", "session_count": 8, "price": 176000, "valid_days": 60},
]


def get_session():
    with Session(engine) as session:
        yield session


def init_db():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        if session.exec(select(Booth)).first() is None:
            for i in range(1, DEFAULT_BOOTH_COUNT + 1):
                session.add(Booth(name=f"부스 {i}", description="1인용 리추얼 부스"))

        if session.exec(select(Tea)).first() is None:
            for tea in DEFAULT_TEAS:
                session.add(Tea(**tea))

        if session.exec(select(Book)).first() is None:
            for book in DEFAULT_BOOKS:
                session.add(Book(**book))

        if session.exec(select(MembershipPlan)).first() is None:
            for plan in DEFAULT_MEMBERSHIP_PLANS:
                session.add(MembershipPlan(**plan))

        session.commit()
