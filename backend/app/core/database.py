from collections.abc import Callable
from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


SessionFactory = Callable[[], Session]


def create_engine_for_settings(settings) -> Engine:
    if str(settings.database_path) == ":memory:":
        return create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
    database_path = Path(settings.database_path).expanduser().resolve()
    database_path.parent.mkdir(parents=True, exist_ok=True)
    database_url = f"sqlite:///{database_path.as_posix()}"
    return create_engine(
        database_url,
        connect_args={"check_same_thread": False},
        future=True,
    )


def create_session_factory(engine: Engine) -> sessionmaker:
    return sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


def init_db(engine: Engine) -> None:
    from app.models import Article, Source  # noqa: F401

    Base.metadata.create_all(bind=engine)

