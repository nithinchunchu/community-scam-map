import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

import pytest
from app.db.init_db import init_db
from app.main import app

@pytest.fixture(scope="session", autouse=True)
def init_test_session():
    # Ensure default database tables and seeds are present
    init_db()
    yield
    app.dependency_overrides.clear()
