import pytest
import mongomock

@pytest.fixture
def db():
    client = mongomock.MongoClient()
    return client.get_database("tradexa_test")
