"""
Password reset utilities — OTP based flow.
Endpoints are registered directly in server.py.
"""
import os
import random
import time
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_EMAIL = "andhrapradeshgrp@gmail.com"
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

OTP_EXPIRY_SECONDS = 10 * 60  # 10 minutes

# In-memory OTP store: { email: {"otp": str, "expires": float} }
_otp_store: dict = {}


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def store_otp(email: str, otp: str) -> None:
    _otp_store[email] = {"otp": otp, "expires": time.time() + OTP_EXPIRY_SECONDS}


def verify_and_consume_otp(email: str, otp: str) -> bool:
    record = _otp_store.get(email)
    if not record:
        return False
    if time.time() > record["expires"]:
        _otp_store.pop(email, None)
        return False
    if record["otp"] != otp:
        return False
    _otp_store.pop(email, None)  # One-time use
    return True


async def send_otp_email(recipient_email: str, otp: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "GRP Portal — Your Password Reset OTP"
    msg["From"] = f"GRP Portal <{SMTP_EMAIL}>"
    msg["To"] = recipient_email

    html_body = f"""
    <html><body style="font-family:sans-serif;color:#0F172A;padding:24px;">
      <div style="text-align:center;margin-bottom:16px;">
        <img src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png"
             width="64" style="margin-bottom:8px;" />
        <h2 style="margin:0;">GRP Portal</h2>
        <p style="color:#475569;margin:4px 0 0;">Government Railway Police, Andhra Pradesh</p>
      </div>
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0;" />
      <p>Your One-Time Password (OTP) for password reset is:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#0F172A;
                     background:#F1F5F9;padding:16px 28px;border-radius:8px;display:inline-block;">
          {otp}
        </span>
      </div>
      <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <p style="color:#64748B;font-size:13px;">
        If you did not request this, you can safely ignore this email.
      </p>
    </body></html>
    """
    msg.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        msg,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_EMAIL,
        password=SMTP_PASSWORD,
        start_tls=True,
    )

