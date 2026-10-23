FastAPI backend for ChatPaat

Google OAuth setup

Required environment variables (use a .env file or system env):

- GOOGLE_CLIENT_ID: your Google OAuth client ID
- GOOGLE_CLIENT_SECRET: your Google OAuth client secret
- FRONTEND_URL: e.g. http://localhost:5173
- JWT_SECRET_KEY: secret for signing local JWTs

How it works

1. Frontend redirects user to Google consent page with `response_type=code`.
2. Google redirects back to the frontend `/oauth-callback` with a `code`.
3. Frontend sends the `code` to `/api/auth/google/exchange/` on the FastAPI backend.
4. Backend exchanges the code with Google, fetches userinfo, upserts a local user, and returns local JWT tokens.

Frontend

- Set `VITE_GOOGLE_CLIENT_ID` in the frontend environment (or edit `SignIn.tsx` fallback).
- The frontend includes `/oauth-callback` which exchanges the code and signs the user in.

Retrieval-augmented chat

- Upload an authenticated file to `POST /api/rag/documents/` as multipart field `file`. Supported types are PDF, TXT, CSV, DOCX, PNG, JPG, and JPEG; each upload is limited to 10 MB.
- `POST /prompt_gpt/` accepts an optional `document_ids` array. The response includes `reply` and `sources`; each source identifies a filename and chunk used as prompt context.
- `GET /api/rag/documents/` lists only the signed-in user's indexed documents. `DELETE /api/rag/documents/{id}/` deletes only a document owned by that user.
- Set `EMBEDDING_API_URL`, `EMBEDDING_MODEL`, and `EMBEDDING_API_KEY` for embeddings. For Gemini, use `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents`, model `gemini-embedding-001`, and a Google AI Studio API key. The backend sends Gemini's native batch request format and uses `RETRIEVAL_DOCUMENT` and `RETRIEVAL_QUERY` task types. For an OpenAI-compatible provider, use its embeddings endpoint/model instead. `GROQ_API_KEY` is for chat/image requests and is not used as an embedding key. Re-index existing files when changing embedding providers or models; vectors from different models cannot be compared reliably.
- Image uploads use the configured `GROQ_API_URL` with `GROQ_API_KEY` and the vision-capable model in `GROQ_VISION_MODEL` (default: `qwen/qwen3.8-27b`). Set a model supported by the selected API account; provider rejection details are returned without exposing the key.
- RAG documents and chunks use the same SQLAlchemy database configured by `DATABASE_URL` (or the `USE_POSTGRES` settings in `.env`). The backend creates missing RAG tables on first use. Leave `RAG_DATABASE_PATH` unset in normal deployments; setting it explicitly opts into an isolated SQLite index, mainly for tests or local experiments.
- The index stores extracted text and vectors, not original files. Deleting the document removes its chunks and vectors. Existing indexed content is private to the user that uploaded it.
