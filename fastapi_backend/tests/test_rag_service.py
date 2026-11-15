import pytest
import requests
from fastapi import HTTPException
from sqlalchemy import create_engine, event

from fastapi_backend.rag_service import (
    _cosine_similarity,
    _embed,
    _get_engine,
    _split_text,
    delete_document,
    delete_user_documents,
    document_ids_for_user,
    extract_text,
    index_document,
    list_documents,
    retrieve_context,
)
from fastapi_backend import rag_service
from fastapi_backend.models import CustomUser


def test_chunking_preserves_text_and_bounds_chunk_size():
    text = " ".join(f"word{index}" for index in range(600))

    chunks = _split_text(text)

    assert len(chunks) > 1
    assert all(0 < len(chunk) <= 1200 for chunk in chunks)
    assert chunks[0].split()[0] == "word0"
    assert chunks[-1].split()[-1] == "word599"
    assert _cosine_similarity([1, 0], [1, 0]) == 1
    assert _cosine_similarity([1, 0], [0, 1]) == 0


def test_index_retrieval_is_scoped_to_owner_and_deletes_chunks(monkeypatch, tmp_path):
    monkeypatch.setenv("RAG_DATABASE_PATH", str(tmp_path / "rag.sqlite3"))
    rag_engine = _get_engine()

    def enable_foreign_keys(connection, _connection_record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    event.listen(rag_engine, "connect", enable_foreign_keys)
    CustomUser.__table__.create(bind=rag_engine)
    with rag_engine.begin() as connection:
        connection.execute(
            CustomUser.__table__.insert(),
            {
                "id": 10,
                "username": "rag-test-user",
                "email": "rag-test-user@example.com",
                "oauth_provider": "test",
                "oauth_subject": "rag-test-user",
            },
        )
    monkeypatch.setattr(
        "fastapi_backend.rag_service._embed",
        lambda texts, task_type="RETRIEVAL_DOCUMENT": [
            [1.0, 0.0] if "alpha" in text.lower() else [0.0, 1.0]
            for text in texts
        ],
    )

    first = index_document(10, "alpha.txt", "text/plain", "alpha knowledge")
    second = index_document(10, "beta.txt", "text/plain", "beta knowledge")

    results = retrieve_context(10, "alpha question", [first["id"], second["id"]])
    assert results[0]["filename"] == "alpha.txt"
    assert document_ids_for_user(11, [first["id"]]) == set()
    assert [document["filename"] for document in list_documents(10)] == ["beta.txt", "alpha.txt"]

    assert delete_document(10, first["id"])
    assert retrieve_context(10, "alpha question", [first["id"]]) == []
    assert not delete_document(11, second["id"])
    assert delete_user_documents(10) == 1
    assert list_documents(10) == []


def test_text_and_csv_file_parsing():
    text, media_type = extract_text("notes.txt", b"\xef\xbb\xbfHello\nChatPaat")
    assert text == "Hello\nChatPaat"
    assert media_type == "text/plain"

    text, media_type = extract_text("data.csv", b"name,value\nChatPaat,1\n")
    assert "name | value" in text
    assert "ChatPaat | 1" in text
    assert media_type == "text/csv"


def test_rag_uses_application_database_when_no_sqlite_override(monkeypatch):
    configured_engine = create_engine("sqlite:///:memory:")
    monkeypatch.delenv("RAG_DATABASE_PATH", raising=False)
    monkeypatch.setattr(rag_service, "application_engine", configured_engine)
    monkeypatch.setattr(
        "fastapi_backend.rag_service._embed",
        lambda texts, task_type="RETRIEVAL_DOCUMENT": [[1.0, 0.0] for _ in texts],
    )

    document = index_document(10, "configured-db.txt", "text/plain", "application database content")
    results = retrieve_context(10, "application database query", [document["id"]])

    assert _get_engine() is configured_engine
    assert results[0]["filename"] == "configured-db.txt"


def test_retrieval_without_selected_documents_skips_embedding(monkeypatch, tmp_path):
    monkeypatch.setenv("RAG_DATABASE_PATH", str(tmp_path / "rag.sqlite3"))
    monkeypatch.setattr(
        "fastapi_backend.rag_service._embed",
        lambda texts, task_type="RETRIEVAL_DOCUMENT": [[1.0, 0.0] for _ in texts],
    )
    index_document(10, "existing.txt", "text/plain", "existing knowledge")
    monkeypatch.setattr(
        "fastapi_backend.rag_service._embed",
        lambda _texts: pytest.fail("unattached chats should not call the embedding provider"),
    )

    assert retrieve_context(10, "unrelated question") == []


def test_embedding_auth_error_is_actionable_and_does_not_expose_key(monkeypatch):
    secret = "test-embedding-secret"
    response = requests.Response()
    response.status_code = 401
    response._content = b'{"error":{"message":"Invalid API key"}}'
    monkeypatch.setattr(rag_service, "_embedding_config", lambda: (secret, "https://embed.test/v1", "test-model"))
    monkeypatch.setattr(rag_service.requests, "post", lambda *args, **kwargs: response)

    with pytest.raises(HTTPException) as exc_info:
        _embed(["safe test input"])

    assert exc_info.value.status_code == 502
    assert "rejected the configured API key" in exc_info.value.detail
    assert secret not in exc_info.value.detail


def test_embedding_retries_temporary_rate_limit(monkeypatch):
    class EmbeddingResponse:
        def __init__(self, status_code, payload):
            self.status_code = status_code
            self._payload = payload
            self.headers = {"Retry-After": "0"}

        def json(self):
            return self._payload

        def raise_for_status(self):
            if self.status_code >= 400:
                raise requests.HTTPError(response=self)

    responses = iter([
        EmbeddingResponse(429, {"error": {"code": "rate_limit_exceeded"}}),
        EmbeddingResponse(200, {"data": [{"index": 0, "embedding": [0.25, 0.75]}]}),
    ])
    calls = []
    monkeypatch.setattr(rag_service, "_embedding_config", lambda: ("key", "https://embed.test/v1", "test-model"))
    monkeypatch.setattr(rag_service.requests, "post", lambda *args, **kwargs: (calls.append(1), next(responses))[1])
    monkeypatch.setattr(rag_service.time, "sleep", lambda _delay: None)

    assert _embed(["content"]) == [[0.25, 0.75]]
    assert len(calls) == 2


def test_embedding_quota_error_does_not_retry(monkeypatch):
    response = requests.Response()
    response.status_code = 429
    response._content = b'{"error":{"code":"insufficient_quota"}}'
    calls = []
    monkeypatch.setattr(rag_service, "_embedding_config", lambda: ("key", "https://embed.test/v1", "test-model"))
    monkeypatch.setattr(rag_service.requests, "post", lambda *args, **kwargs: (calls.append(1), response)[1])
    monkeypatch.setattr(rag_service.time, "sleep", lambda _delay: pytest.fail("quota errors should not be retried"))

    with pytest.raises(HTTPException) as exc_info:
        _embed(["content"])

    assert exc_info.value.status_code == 502
    assert "exhausted its API quota" in exc_info.value.detail
    assert len(calls) == 1


def test_gemini_embedding_uses_batch_api_and_task_type(monkeypatch):
    class GeminiResponse:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {
                "embeddings": [
                    {"values": [0.1, 0.2]},
                    {"values": [0.3, 0.4]},
                ],
            }

    calls = []
    monkeypatch.setattr(
        rag_service,
        "_embedding_config",
        lambda: (
            "gemini-test-key",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents",
            "gemini-embedding-001",
        ),
    )
    monkeypatch.setattr(
        rag_service.requests,
        "post",
        lambda *args, **kwargs: (calls.append((args, kwargs)), GeminiResponse())[1],
    )

    assert _embed(["first", "second"], task_type="RETRIEVAL_QUERY") == [
        [0.1, 0.2],
        [0.3, 0.4],
    ]
    assert calls[0][1]["headers"] == {"x-goog-api-key": "gemini-test-key"}
    assert calls[0][1]["json"] == {
        "requests": [
            {
                "model": "models/gemini-embedding-001",
                "content": {"parts": [{"text": "first"}]},
                "taskType": "RETRIEVAL_QUERY",
            },
            {
                "model": "models/gemini-embedding-001",
                "content": {"parts": [{"text": "second"}]},
                "taskType": "RETRIEVAL_QUERY",
            },
        ],
    }


def test_image_description_uses_current_groq_vision_model_by_default(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.delenv("GROQ_VISION_MODEL", raising=False)
    response = requests.Response()
    response.status_code = 200
    response._content = b'{"choices":[{"message":{"content":"A chart with two bars."}}]}'
    calls = []
    monkeypatch.setattr(
        rag_service.requests,
        "post",
        lambda *args, **kwargs: (calls.append((args, kwargs)), response)[1],
    )

    assert rag_service._describe_image(b"image bytes", "image/png") == "A chart with two bars."
    payload = calls[0][1]["json"]
    assert payload["model"] == "qwen/qwen3.8-27b"
    assert payload["max_completion_tokens"] == 1024
    assert payload["messages"][0]["content"][1]["image_url"]["url"].startswith("data:image/png;base64,")


def test_image_description_reports_provider_model_error_without_leaking_key(monkeypatch):
    secret = "test-groq-secret"
    monkeypatch.setenv("GROQ_API_KEY", secret)
    monkeypatch.setenv("GROQ_VISION_MODEL", "retired-model")
    response = requests.Response()
    response.status_code = 400
    response._content = b'{"error":{"message":"Model retired-model is no longer available"}}'
    monkeypatch.setattr(rag_service.requests, "post", lambda *args, **kwargs: response)

    with pytest.raises(HTTPException) as exc_info:
        rag_service._describe_image(b"image bytes", "image/png")

    assert exc_info.value.status_code == 502
    assert "Model retired-model is no longer available" in exc_info.value.detail
    assert "qwen/qwen3.8-27b" in exc_info.value.detail
    assert secret not in exc_info.value.detail
