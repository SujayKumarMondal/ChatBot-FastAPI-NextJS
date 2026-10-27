"""Document ingestion and retrieval for ChatPaat's local vector index."""

import base64
import csv
import io
import json
import logging
import math
import os
import time
import zipfile
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Iterable
from uuid import uuid4
from xml.etree import ElementTree

import requests
from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.engine import Engine, URL
from sqlalchemy.orm import Session, sessionmaker

if __package__ == "fastapi_backend":
    from .db import engine as application_engine
    from .models import Base, RagChunk, RagDocument
else:
    from db import engine as application_engine
    from models import Base, RagChunk, RagDocument

BACKEND_DIR = Path(__file__).resolve().parent
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_DOCUMENT_CHARS = 1_000_000
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200
TOP_K = 5
EMBEDDING_RETRIES = 3
EMBEDDING_RETRY_MAX_DELAY = 15
logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".csv", ".docx", ".png", ".jpg", ".jpeg"}
IMAGE_CONTENT_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}


@lru_cache(maxsize=4)
def _sqlite_engine(path: str) -> Engine:
    from sqlalchemy import create_engine

    database_path = Path(path)
    if not database_path.is_absolute():
        database_path = BACKEND_DIR / database_path
    database_path.parent.mkdir(parents=True, exist_ok=True)
    return create_engine(
        URL.create("sqlite", database=str(database_path)),
        connect_args={"check_same_thread": False},
    )


def _get_engine() -> Engine:
    configured_path = os.getenv("RAG_DATABASE_PATH", "").strip()
    if configured_path:
        return _sqlite_engine(configured_path)
    return application_engine


@lru_cache(maxsize=4)
def _ensure_tables(database_engine: Engine) -> None:
    Base.metadata.create_all(
        bind=database_engine,
        tables=[RagDocument.__table__, RagChunk.__table__],
    )


def _session() -> Session:
    database_engine = _get_engine()
    _ensure_tables(database_engine)
    return sessionmaker(bind=database_engine)()


def _split_text(text: str) -> list[str]:
    text = "\n".join(line.strip() for line in text.replace("\x00", "").splitlines() if line.strip())
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        if end < len(text):
            boundary = text.rfind(" ", start + CHUNK_SIZE // 2, end)
            if boundary > start:
                end = boundary
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(text):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks


def _extract_docx(data: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            document_info = archive.getinfo("word/document.xml")
            if document_info.file_size > MAX_DOCUMENT_CHARS * 4:
                raise HTTPException(status_code=413, detail="The DOCX document contains too much text.")
            if document_info.compress_size and document_info.file_size / document_info.compress_size > 1000:
                raise HTTPException(status_code=413, detail="The DOCX document has an unsafe compression ratio.")
            document = ElementTree.fromstring(archive.read(document_info))
    except (KeyError, ElementTree.ParseError, zipfile.BadZipFile) as exc:
        raise HTTPException(status_code=422, detail="The uploaded DOCX file is invalid.") from exc
    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    return "\n".join(
        "".join(node.text or "" for node in paragraph.iter(f"{namespace}t"))
        for paragraph in document.iter(f"{namespace}p")
    )


def _extract_csv(data: bytes) -> str:
    try:
        text = data.decode("utf-8-sig")
        rows = csv.reader(io.StringIO(text))
        return "\n".join(" | ".join(cell.strip() for cell in row) for row in rows)
    except (UnicodeDecodeError, csv.Error) as exc:
        raise HTTPException(status_code=422, detail="The uploaded CSV must be valid UTF-8.") from exc


def _extract_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data), strict=False)
        page_texts = []
        character_count = 0
        for page in reader.pages:
            page_text = page.extract_text() or ""
            character_count += len(page_text)
            if character_count > MAX_DOCUMENT_CHARS:
                raise HTTPException(status_code=413, detail="The extracted PDF text exceeds the 1 MB character limit.")
            page_texts.append(page_text)
        return "\n".join(page_texts)
    except ImportError as exc:
        logger.exception("PDF support is not installed")
        raise HTTPException(status_code=503, detail="PDF processing is unavailable.") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="The uploaded PDF could not be read.") from exc


def _describe_image(data: bytes, content_type: str) -> str:
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    model = (os.getenv("GROQ_VISION_MODEL") or "qwen/qwen3.8-27b").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Image understanding is not configured; set GROQ_API_KEY.",
        )

    api_url = (os.getenv("GROQ_API_URL") or "https://api.groq.com/openai/v1/chat/completions").strip()
    image_url = f"data:{content_type};base64,{base64.b64encode(data).decode('ascii')}"
    try:
        response = requests.post(
            api_url,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this image and transcribe any readable text. Be concise and preserve important names, labels, and figures."},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }],
                "max_completion_tokens": 1024,
            },
            timeout=60,
        )
    except requests.RequestException as exc:
        logger.exception("Image understanding request failed")
        raise HTTPException(
            status_code=502,
            detail="Could not reach the vision service. Check GROQ_API_URL and the backend network connection.",
        ) from exc

    if not response.ok:
        provider_message = ""
        try:
            payload = response.json()
            error = payload.get("error", {}) if isinstance(payload, dict) else {}
            if isinstance(error, dict):
                provider_message = str(error.get("message") or error.get("code") or "")
            elif isinstance(error, str):
                provider_message = error
        except (ValueError, AttributeError):
            pass
        provider_message = " ".join(provider_message.split())
        if api_key:
            provider_message = provider_message.replace(api_key, "[redacted]")
        provider_message = provider_message[:300]
        if response.status_code == 401:
            detail = "Groq rejected GROQ_API_KEY. Verify the configured vision API key."
        elif response.status_code == 429:
            detail = "Groq vision rate limit or quota reached. Try again later or check the account quota."
        elif response.status_code == 400 and provider_message:
            detail = (
                f"Groq rejected the vision request: {provider_message} "
                "Check GROQ_VISION_MODEL; the default is qwen/qwen3.8-27b."
            )
        else:
            detail = f"Groq vision request failed (HTTP {response.status_code})."
            if provider_message:
                detail += f" Provider message: {provider_message}"
        logger.warning("Image understanding rejected by provider (HTTP %s): %s", response.status_code, provider_message)
        raise HTTPException(status_code=502, detail=detail)

    try:
        payload = response.json()
        description = payload["choices"][0]["message"]["content"]
        if not isinstance(description, str) or not description.strip():
            raise ValueError("The vision model returned no description.")
        return description.strip()
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.exception("Vision service returned an invalid image response")
        raise HTTPException(
            status_code=502,
            detail="The vision service returned an invalid response. Verify GROQ_VISION_MODEL supports image input.",
        ) from exc


def extract_text(filename: str, data: bytes) -> tuple[str, str]:
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Supported files are PDF, TXT, CSV, DOCX, PNG, and JPG.",
        )

    if extension in IMAGE_CONTENT_TYPES:
        text = _describe_image(data, IMAGE_CONTENT_TYPES[extension])
        return text, IMAGE_CONTENT_TYPES[extension]
    if extension == ".pdf":
        text = _extract_pdf(data)
        content_type = "application/pdf"
    elif extension == ".docx":
        text = _extract_docx(data)
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif extension == ".csv":
        text = _extract_csv(data)
        content_type = "text/csv"
    else:
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=422, detail="TXT files must be valid UTF-8.") from exc
        content_type = "text/plain"

    if len(text) > MAX_DOCUMENT_CHARS:
        raise HTTPException(status_code=413, detail="The extracted document text exceeds the 1 MB character limit.")
    if not text.strip():
        raise HTTPException(status_code=422, detail="No readable text was found in the uploaded file.")
    return text, content_type


def _embedding_config() -> tuple[str, str, str]:
    api_key = (os.getenv("EMBEDDING_API_KEY") or "").strip()
    api_url = (
        os.getenv("EMBEDDING_API_URL")
        or "https://api.openai.com/v1/embeddings"
    ).strip()
    model = (os.getenv("EMBEDDING_MODEL") or "text-embedding-3-small").strip()
    if not api_key or api_key.lower().startswith(("your-", "change-me", "placeholder")):
        raise HTTPException(
            status_code=503,
            detail="Semantic search is not configured with a usable key; set EMBEDDING_API_KEY for the selected provider.",
        )
    if not api_url.startswith(("https://", "http://")):
        raise HTTPException(status_code=500, detail="EMBEDDING_API_URL must be an HTTP(S) URL.")
    return api_key, api_url, model


def _post_with_rate_limit_retry(*args, **kwargs) -> requests.Response:
    for attempt in range(EMBEDDING_RETRIES + 1):
        response = requests.post(*args, **kwargs)
        if response.status_code != 429:
            return response
        try:
            error_body = response.json().get("error", {})
            error_code = str(error_body.get("code") or "").lower() if isinstance(error_body, dict) else ""
        except (ValueError, AttributeError):
            error_code = ""
        if error_code in {"insufficient_quota", "billing_hard_limit_reached"} or attempt == EMBEDDING_RETRIES:
            return response
        try:
            retry_after = float(response.headers.get("Retry-After", ""))
        except (TypeError, ValueError):
            retry_after = min(0.5 * (2 ** attempt), EMBEDDING_RETRY_MAX_DELAY)
        time.sleep(min(max(retry_after, 0), EMBEDDING_RETRY_MAX_DELAY))
    return response


def _embed(
    texts: list[str],
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> list[list[float]]:
    if not texts:
        return []
    api_key, api_url, model = _embedding_config()
    embeddings = []
    try:
        for start in range(0, len(texts), 64):
            batch = texts[start:start + 64]
            is_gemini = "generativelanguage.googleapis.com" in api_url
            if is_gemini:
                model_name = model.removeprefix("models/")
                request_body = {
                    "requests": [
                        {
                            "model": f"models/{model_name}",
                            "content": {"parts": [{"text": text}]},
                            "taskType": task_type,
                        }
                        for text in batch
                    ],
                }
                request_headers = {"x-goog-api-key": api_key}
            else:
                request_body = {"model": model, "input": batch}
                request_headers = {"Authorization": f"Bearer {api_key}"}
            response = _post_with_rate_limit_retry(
                api_url,
                headers=request_headers,
                json=request_body,
                timeout=60,
            )
            response.raise_for_status()
            payload = response.json()
            data = payload["embeddings"] if is_gemini else payload["data"]
            if len(data) != len(batch):
                raise ValueError("Embedding service returned an unexpected number of vectors.")
            if is_gemini:
                embeddings.extend(
                    [float(value) for value in item["values"]]
                    for item in data
                )
            else:
                ordered = sorted(data, key=lambda item: item.get("index", 0))
                embeddings.extend(
                    [float(value) for value in item["embedding"]]
                    for item in ordered
                )
        dimensions = len(embeddings[0])
        if dimensions == 0 or any(
            len(vector) != dimensions
            or not all(math.isfinite(float(value)) for value in vector)
            for vector in embeddings
        ):
            raise ValueError("Embedding service returned invalid vectors.")
        return embeddings
    except requests.HTTPError as exc:
        logger.exception("Embedding service request failed")
        response = exc.response
        status_code = response.status_code if response is not None else "unknown"
        if status_code in (401, 403):
            detail = (
                f"The embedding provider rejected the configured API key (HTTP {status_code}). "
                "Verify EMBEDDING_API_KEY belongs to the provider configured by EMBEDDING_API_URL."
            )
        elif status_code == 404:
            detail = (
                "The embedding endpoint or model was not found (HTTP 404). "
                "Verify EMBEDDING_API_URL and EMBEDDING_MODEL."
            )
        elif status_code == 429:
            error_code = ""
            if response is not None:
                try:
                    error_payload = response.json().get("error", {})
                    if isinstance(error_payload, dict):
                        error_code = str(error_payload.get("code") or "").lower()
                except (ValueError, AttributeError):
                    pass
            if error_code in {"insufficient_quota", "billing_hard_limit_reached"}:
                detail = (
                    "The embedding provider account has exhausted its API quota (HTTP 429). "
                    "Check API billing, available credits, and usage limits for the account owning EMBEDDING_API_KEY."
                )
            else:
                detail = (
                    "The embedding provider rate limit persisted after automatic retries (HTTP 429). "
                    "Wait for the provider limit window to reset or reduce concurrent indexing requests."
                )
        else:
            provider_message = ""
            if response is not None:
                try:
                    error_payload = response.json().get("error", {})
                    if isinstance(error_payload, dict):
                        provider_message = str(error_payload.get("message") or "")
                    elif error_payload:
                        provider_message = str(error_payload)
                except (ValueError, AttributeError):
                    provider_message = ""
            provider_message = provider_message.replace(api_key, "[redacted]")[:300]
            detail = f"The embedding provider returned HTTP {status_code}."
            if provider_message:
                detail += f" Provider message: {provider_message}"
        raise HTTPException(status_code=502, detail=detail) from exc
    except requests.RequestException as exc:
        logger.exception("Embedding service connection failed")
        raise HTTPException(
            status_code=502,
            detail="Could not reach the embedding provider. Verify EMBEDDING_API_URL and backend network access.",
        ) from exc
    except (KeyError, TypeError, ValueError) as exc:
        logger.exception("Embedding service returned an invalid response")
        raise HTTPException(
            status_code=502,
            detail="The embedding provider returned an invalid response. Verify EMBEDDING_MODEL and endpoint compatibility.",
        ) from exc


def index_document(user_id: int, filename: str, media_type: str, text: str) -> dict:
    chunks = _split_text(text)
    if not chunks:
        raise HTTPException(status_code=422, detail="No indexable text was found in the uploaded file.")
    vectors = _embed(chunks, task_type="RETRIEVAL_DOCUMENT")
    document_id = str(uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    session = _session()
    try:
        session.add(RagDocument(
            id=document_id,
            user_id=user_id,
            filename=Path(filename).name[:255],
            media_type=media_type,
            created_at=datetime.fromisoformat(created_at),
        ))
        session.flush()
        session.add_all(
            RagChunk(
                document_id=document_id,
                user_id=user_id,
                chunk_index=index,
                content=chunk,
                embedding=json.dumps(vector),
            )
            for index, (chunk, vector) in enumerate(zip(chunks, vectors))
        )
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
    return {
        "id": document_id,
        "filename": Path(filename).name[:255],
        "media_type": media_type,
        "chunk_count": len(chunks),
        "created_at": created_at,
    }


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right):
        return 0.0
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return sum(a * b for a, b in zip(left, right)) / (left_norm * right_norm)


def retrieve_context(user_id: int, query: str, document_ids: list[str] | None = None) -> list[dict]:
    if not document_ids:
        return []

    statement = (
        select(
            RagChunk.document_id,
            RagDocument.filename,
            RagChunk.chunk_index,
            RagChunk.content,
            RagChunk.embedding,
        )
        .join(RagDocument, RagDocument.id == RagChunk.document_id)
        .where(RagChunk.user_id == user_id)
        .order_by(RagDocument.created_at.desc())
        .limit(10000)
    )
    statement = statement.where(RagChunk.document_id.in_(document_ids))

    session = _session()
    try:
        rows = session.execute(statement).all()
    finally:
        session.close()

    if not rows:
        return []
    query_vector = _embed([query], task_type="RETRIEVAL_QUERY")[0]
    ranked = []
    for row in rows:
        try:
            vector = json.loads(row.embedding)
            if len(vector) != len(query_vector):
                raise HTTPException(
                    status_code=409,
                    detail="The embedding model changed; re-index documents before searching them.",
                )
            score = _cosine_similarity(query_vector, vector)
        except HTTPException:
            raise
        except (json.JSONDecodeError, TypeError, ValueError):
            logger.warning("Skipping malformed vector for indexed document %s", row.document_id)
            continue
        ranked.append({
            "document_id": row.document_id,
            "filename": row.filename,
            "chunk_index": row.chunk_index,
            "content": row.content,
            "score": score,
        })
    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked[:TOP_K]


def document_ids_for_user(user_id: int, document_ids: Iterable[str]) -> set[str]:
    ids = list(dict.fromkeys(document_ids))
    if not ids:
        return set()
    session = _session()
    try:
        rows = session.execute(
            select(RagDocument.id).where(
                RagDocument.user_id == user_id,
                RagDocument.id.in_(ids),
            )
        ).scalars().all()
        return set(rows)
    finally:
        session.close()


def list_documents(user_id: int) -> list[dict]:
    session = _session()
    try:
        rows = session.execute(
            select(
                RagDocument.id,
                RagDocument.filename,
                RagDocument.media_type,
                RagDocument.created_at,
                func.count(RagChunk.id).label("chunk_count"),
            )
            .outerjoin(RagChunk, RagChunk.document_id == RagDocument.id)
            .where(RagDocument.user_id == user_id)
            .group_by(RagDocument.id)
            .order_by(RagDocument.created_at.desc())
        ).all()
        return [
            {
                "id": row.id,
                "filename": row.filename,
                "media_type": row.media_type,
                "created_at": row.created_at.isoformat() if isinstance(row.created_at, datetime) else row.created_at,
                "chunk_count": row.chunk_count,
            }
            for row in rows
        ]
    finally:
        session.close()


def delete_document(user_id: int, document_id: str) -> bool:
    session = _session()
    try:
        with session.begin():
            owned_document = session.scalar(
                select(RagDocument.id).where(
                    RagDocument.id == document_id,
                    RagDocument.user_id == user_id,
                )
            )
            if not owned_document:
                return False
            session.execute(delete(RagChunk).where(RagChunk.document_id == document_id))
            session.execute(delete(RagDocument).where(RagDocument.id == document_id))
        return True
    finally:
        session.close()


def delete_user_documents(user_id: int) -> int:
    session = _session()
    try:
        with session.begin():
            document_ids = session.scalars(
                select(RagDocument.id).where(RagDocument.user_id == user_id)
            ).all()
            if document_ids:
                session.execute(
                    delete(RagChunk).where(RagChunk.document_id.in_(document_ids))
                )
            result = session.execute(
                delete(RagDocument).where(RagDocument.user_id == user_id)
            )
        return result.rowcount
    finally:
        session.close()
