from flask import current_app
from flask_mail import Message

from ..extensions import mail


def _require_smtp_config():
    sender = current_app.config.get("MAIL_DEFAULT_SENDER")
    username = current_app.config.get("MAIL_USERNAME")
    password = current_app.config.get("MAIL_PASSWORD")

    if not sender or not username or not password:
        raise ValueError("SMTP_EMAIL and SMTP_PASSWORD must be configured on the server before sending OTP emails.")


def send_otp_email(recipient, otp):
    _require_smtp_config()

    message = Message(
        subject="Your PageTurn verification code",
        recipients=[recipient],
    )

    message.body = f"""Hello,

We received a request to verify your email address for PageTurn Bookstore.

Your one-time password (OTP) is: {otp}

This code expires in 5 minutes.

If you did not request this code, you can safely ignore this email.

Regards,
PageTurn Bookstore
"""

    message.html = f"""
    <div style="font-family: Arial, sans-serif; background: #f6f7fb; padding: 32px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e5e7ef;">
        <div style="background: linear-gradient(135deg, #c9a84c, #8a6f2e); padding: 24px 28px; color: #0d1117;">
          <h1 style="margin: 0; font-size: 24px;">PageTurn Bookstore</h1>
          <p style="margin: 8px 0 0; font-size: 14px;">Email verification</p>
        </div>
        <div style="padding: 28px;">
          <p style="margin: 0 0 14px; color: #1f2937; font-size: 15px;">Hello,</p>
          <p style="margin: 0 0 18px; color: #4b5563; font-size: 15px; line-height: 1.7;">
            Use the verification code below to continue creating your PageTurn account.
          </p>
          <div style="margin: 20px 0; padding: 18px; border-radius: 14px; background: #f8fafc; border: 1px solid #e5e7eb; text-align: center;">
            <div style="font-size: 30px; letter-spacing: 10px; font-weight: 700; color: #111827;">{otp}</div>
          </div>
          <p style="margin: 0 0 10px; color: #4b5563; font-size: 14px;">This OTP expires in 5 minutes.</p>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">If you did not request this email, you can ignore it.</p>
        </div>
      </div>
    </div>
    """

    try:
        mail.send(message)
    except Exception as exc:
        raise ValueError("Could not send the OTP email. Please check your Gmail SMTP settings and App Password.") from exc
