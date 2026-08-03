import asyncio
import json

from app.core.config import Settings
from app.core.database import create_engine_for_settings, create_session_factory, init_db
from app.ingestion.pipeline import run_ingestion


def main() -> None:
    settings = Settings()
    engine = create_engine_for_settings(settings)
    init_db(engine)
    session_factory = create_session_factory(engine)
    result = asyncio.run(run_ingestion(session_factory, settings=settings))
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

