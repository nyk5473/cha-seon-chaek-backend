from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import curation, logs, memberships, retail, sessions, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="차선책 예약 API", lifespan=lifespan)

app.include_router(sessions.router)
app.include_router(users.router)
app.include_router(curation.router)
app.include_router(retail.router)
app.include_router(memberships.router)
app.include_router(logs.router)


@app.get("/health")
def health():
    return {"status": "ok"}


app.mount("/app", StaticFiles(directory="static", html=True), name="app")
