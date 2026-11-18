import os
import base64
import logging
import requests
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from apps.notifications.models import EmailLog

logger = logging.getLogger(__name__)


def _send_via_resend_https(api_key, from_email, recipient_email, subject, text_content, html_content=None, attachments=None):
    """
    Sends email via Resend HTTPS REST API (port 443).
    Works reliably on Render Free Tier and cloud hosts that block outbound SMTP port 587.
    """
    payload = {
        "from": from_email,
        "to": [recipient_email],
        "subject": subject,
        "text": text_content,
    }
    if html_content:
        payload["html"] = html_content

    if attachments:
        encoded_attachments = []
        for attachment in attachments:
            if isinstance(attachment, (list, tuple)):
                if len(attachment) == 3:
                    filename, content_bytes, _ = attachment
                    if isinstance(content_bytes, str):
                        content_bytes = content_bytes.encode("utf-8")
                    encoded_attachments.append({
                        "filename": filename,
                        "content": base64.b64encode(content_bytes).decode("ascii"),
                    })
                elif len(attachment) == 2:
                    filename, filepath = attachment
                    if filepath and os.path.exists(filepath):
                        with open(filepath, "rb") as f:
                            encoded_attachments.append({
                                "filename": filename,
                                "content": base64.b64encode(f.read()).decode("ascii"),
                            })
        if encoded_attachments:
            payload["attachments"] = encoded_attachments

    resp = requests.post(
        "https://api.resend.com/emails",
        json=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "BuildOps/1.0",
        },
        timeout=12,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Resend API error {resp.status_code}: {resp.text}")
    return resp.json()


def send_email_notification(recipient_email, email_type, subject, text_content, html_content=None, attachments=None):
    """
    Sends an email and records it in EmailLog.
    Uses Resend HTTPS API automatically when a Resend API key (re_...) is configured,
    avoiding outbound SMTP port 587 blocks on cloud hosts like Render.
    Never crashes the caller if email delivery fails.
    """
    email_log = EmailLog.objects.create(
        recipient_email=recipient_email,
        email_type=email_type,
        subject=subject,
        status='PENDING'
    )

    try:
        from_email = settings.DEFAULT_FROM_EMAIL
        resend_key = os.getenv('RESEND_API_KEY') or (
            settings.EMAIL_HOST_PASSWORD
            if str(getattr(settings, 'EMAIL_HOST_PASSWORD', '')).startswith('re_')
            else ''
        )
        use_console = 'console' in str(getattr(settings, 'EMAIL_BACKEND', '')).lower()

        if resend_key and not use_console:
            _send_via_resend_https(
                api_key=resend_key,
                from_email=from_email,
                recipient_email=recipient_email,
                subject=subject,
                text_content=text_content,
                html_content=html_content,
                attachments=attachments,
            )
        else:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=[recipient_email]
            )
            if html_content:
                msg.attach_alternative(html_content, "text/html")

            if attachments:
                for attachment in attachments:
                    # attachment: (filename, content_bytes, mimetype) or (filename, filepath)
                    if isinstance(attachment, (list, tuple)):
                        if len(attachment) == 3:
                            msg.attach(attachment[0], attachment[1], attachment[2])
                        elif len(attachment) == 2:
                            msg.attach_file(attachment[1])

            msg.send(fail_silently=False)

        email_log.status = 'SENT'
        email_log.sent_at = timezone.now()
        email_log.save(update_fields=['status', 'sent_at'])
        logger.info(f"Email sent successfully to {recipient_email} [{email_type}]")
        return True, email_log

    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {str(e)}", exc_info=True)
        email_log.status = 'FAILED'
        email_log.error_message = str(e)
        email_log.save(update_fields=['status', 'error_message'])
        return False, email_log


def send_verification_email(user, token_str):
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token_str}"
    subject = f"Verify Your Email - {settings.EVENT_NAME}"
    text_content = (
        f"Hello {user.full_name},\n\n"
        f"Thank you for signing up for {settings.EVENT_NAME}!\n\n"
        f"Please verify your email address by clicking the link below:\n"
        f"{verify_url}\n\n"
        f"Or enter your verification token: {token_str}\n\n"
        f"This link expires in 24 hours.\n\n"
        f"Best regards,\n"
        f"{settings.EVENT_NAME} Team"
    )
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b; margin-top: 0;">Welcome to {settings.EVENT_NAME}!</h2>
        <p>Hello <strong>{user.full_name}</strong>,</p>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <div style="margin: 25px 0; text-align: center;">
            <a href="{verify_url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 14px; color: #64748b;">If the button does not work, copy and paste this link into your browser:<br/>
        <a href="{verify_url}" style="color: #2563eb;">{verify_url}</a></p>
        <p style="font-size: 14px; color: #64748b;">Verification Token: <code>{token_str}</code></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">This link will expire in 24 hours.</p>
    </div>
    """
    return send_email_notification(
        recipient_email=user.email,
        email_type='VERIFICATION',
        subject=subject,
        text_content=text_content,
        html_content=html_content
    )


def send_ticket_email(team, ticket, pdf_path=None):
    download_url = f"{settings.BACKEND_URL}/api/tickets/{ticket.id}/download/"
    portal_url = f"{settings.FRONTEND_URL}/student/dashboard"
    subject = f"Registration Confirmed & E-Ticket - {team.team_name} [{team.registration_id}]"

    members = team.members.all()
    member_names = ", ".join([m.full_name for m in members])
    whatsapp_link = getattr(settings, 'WHATSAPP_GROUP_LINK', '').strip()

    whatsapp_text_block = (
        f"\nJoin the Official {settings.EVENT_NAME} Participants WhatsApp Group for live announcements & updates:\n"
        f"{whatsapp_link}\n"
        if whatsapp_link
        else ""
    )

    whatsapp_html_block = (
        f"""
        <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 16px; margin: 22px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #065f46; font-weight: bold;">Join the Official Participants WhatsApp Group</p>
            <p style="margin: 0 0 14px 0; font-size: 13px; color: #047857;">All live event announcements, check-in alerts, and track briefings will be shared here.</p>
            <a href="{whatsapp_link}" style="background-color: #16a34a; color: #ffffff; padding: 11px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Join WhatsApp Group</a>
        </div>
        """
        if whatsapp_link
        else ""
    )

    text_content = (
        f"Congratulations Team {team.team_name}!\n\n"
        f"Your registration for {settings.EVENT_NAME} has been confirmed.\n\n"
        f"Registration ID: {team.registration_id}\n"
        f"Team Name: {team.team_name}\n"
        f"Members: {member_names}\n"
        f"Venue: {settings.EVENT_VENUE}\n"
        f"Date: {settings.EVENT_DATE}\n\n"
        f"Your shareable E-Ticket Pass (PNG) is attached to this email. You can also view or download it anytime from your dashboard:\n"
        f"{portal_url}\n"
        f"{whatsapp_text_block}\n"
        f"Direct Ticket Download: {download_url}\n\n"
        f"Save this pass to your phone gallery and present the QR code at the event check-in desk.\n\n"
        f"See you at {settings.EVENT_NAME}!\n"
    )

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f766e; margin-top: 0;">Registration Confirmed!</h2>
        <p>Dear Team <strong>{team.team_name}</strong>,</p>
        <p>Your payment has been successfully verified and your registration for <strong>{settings.EVENT_NAME}</strong> is confirmed.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Registration ID:</strong> {team.registration_id}</p>
            <p style="margin: 4px 0;"><strong>Team Name:</strong> {team.team_name}</p>
            <p style="margin: 4px 0;"><strong>College:</strong> {team.college_name}</p>
            <p style="margin: 4px 0;"><strong>Participants:</strong> {member_names}</p>
            <p style="margin: 4px 0;"><strong>Event Date:</strong> {settings.EVENT_DATE}</p>
            <p style="margin: 4px 0;"><strong>Venue:</strong> {settings.EVENT_VENUE}</p>
        </div>

        <p>Your official <strong>Build Ops Gate Pass (PNG image)</strong> with check-in QR code is attached — save it to your gallery or share it with your teammate!</p>
        {whatsapp_html_block}
        <div style="text-align: center; margin: 25px 0;">
            <a href="{portal_url}" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open Team Portal</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Direct PNG pass link: <a href="{download_url}">{download_url}</a></p>
    </div>
    """

    attachments = []
    if pdf_path:
        ext = os.path.splitext(pdf_path)[1].lower() or '.png'
        attachments.append((f"BuildOps_Pass_{team.registration_id}{ext}", pdf_path))

    results = []
    for member in members:
        success, log = send_email_notification(
            recipient_email=member.email,
            email_type='TICKET',
            subject=subject,
            text_content=text_content,
            html_content=html_content,
            attachments=attachments
        )
        results.append((member.email, success))
    return results
