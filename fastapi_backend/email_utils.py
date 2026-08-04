import os
import smtplib
from email.message import EmailMessage
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def send_email(to: str, subject: str, body: str, reply_to: Optional[str] = None) -> None:
    """Send an email using SMTP with the configured Gmail credentials."""
    host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()
    port = int(os.getenv("SMTP_PORT") or "587")
    username = (os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL") or "").strip()
    password = (os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD") or "").strip()
    sender_email = (os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL") or os.getenv("SENDER_EMAIL") or "").strip()

    if not username or not password:
        raise RuntimeError("SMTP credentials are not configured")
    if not sender_email:
        raise RuntimeError("SMTP sender is not configured")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender_email
    message["To"] = to
    if reply_to:
        message["Reply-To"] = reply_to
    message.set_content(body)

    with smtplib.SMTP(host, port, timeout=20) as smtp:
        smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(message)
