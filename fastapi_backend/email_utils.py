import os
from typing import Optional

import requests
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, From

load_dotenv()

def send_email(to: str, subject: str, body: str, reply_to: Optional[str] = None) -> None:
    """Send an email using SendGrid API. Raises exceptions on failure.

    Parameters:
    - to: recipient email address
    - subject: email subject
    - body: plain-text body
    - reply_to: optional reply-to address (recommended to be the user's email). The
      actual From address must be the verified `SENDER_EMAIL` configured in SendGrid.
    """
    api_key = os.getenv("SENDGRID_API_KEY")
    sender_email = os.getenv("SENDER_EMAIL")

    if not api_key:
        raise RuntimeError("SENDGRID_API_KEY is not configured")
    if not sender_email:
        raise RuntimeError("SENDER_EMAIL is not configured")

    message = Mail(
        from_email=From(sender_email),
        to_emails=to,
        subject=subject,
        plain_text_content=body,
    )

    if reply_to:
        message.reply_to = Email(reply_to)

    client = SendGridAPIClient(api_key)
    response = client.send(message)
    if response.status_code >= 400:
        raise RuntimeError(f"SendGrid send failed: {response.status_code} {response.body}")
