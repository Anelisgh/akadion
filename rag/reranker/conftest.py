import os
import pytest
import sentence_transformers

os.environ["RAG_SERVICE_USERNAME"] = "akadion-spring-backend"
os.environ["RAG_SERVICE_PASSWORD"] = "test_password"

class FakeCrossEncoder:
    def __init__(self, *args, **kwargs):
        pass
    def predict(self, pairs):
        return [0.0] * len(pairs)

sentence_transformers.CrossEncoder = FakeCrossEncoder

import main
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    return TestClient(main.app)