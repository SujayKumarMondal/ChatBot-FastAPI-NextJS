import os
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()


def _resolve_sender_email() -> str:
    """Resolve the sender email for outgoing mail."""
    return (
        os.getenv("RESEND_FROM_EMAIL")
        or os.getenv("SENDER_EMAIL")
        or ""
    ).strip()


def send_email(
    to: str,
    subject: str,
    body: str,
    reply_to: Optional[str] = None
) -> None:
    """Send an email via Resend API."""

    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    sender_email = _resolve_sender_email()

    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not configured")

    if not sender_email:
        raise RuntimeError("No sender email is configured")

    payload = {
        "from": sender_email,
        "to": [to],
        "subject": subject,
        "text": body,
    }

    if reply_to:
        payload["reply_to"] = [reply_to]

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=20,
    )

    print("Resend status:", response.status_code)
    print("Resend response:", response.text)

    if response.status_code >= 400:
        raise RuntimeError(
            f"Resend send failed: "
            f"{response.status_code} {response.text}"
        )