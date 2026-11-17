import os
import io
import qrcode
from PIL import Image
from django.conf import settings
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from apps.tickets.models import Ticket, generate_qr_token
from apps.notifications.services import send_ticket_email


def generate_ticket_for_team(team):
    """
    Idempotently creates a Ticket record and generates a PDF ticket for a confirmed team.
    """
    ticket, created = Ticket.objects.get_or_create(
        team=team,
        defaults={'qr_token': generate_qr_token(), 'ticket_status': 'ACTIVE'}
    )

    # Ensure media directory exists
    tickets_dir = os.path.join(settings.MEDIA_ROOT, 'tickets')
    os.makedirs(tickets_dir, exist_ok=True)

    pdf_filename = f"ticket_{team.registration_id}.pdf"
    pdf_filepath = os.path.join(tickets_dir, pdf_filename)

    # Generate QR Code image in-memory
    qr_data = ticket.qr_token
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    # Build PDF with ReportLab
    doc = SimpleDocTemplate(
        pdf_filepath,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TicketTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0f766e'),
        alignment=1
    )
    subtitle_style = ParagraphStyle(
        'TicketSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#475569'),
        alignment=1
    )
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1e293b')
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#1e293b')
    )
    bold_body = ParagraphStyle(
        'BoldBody',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0f172a')
    )
    token_style = ParagraphStyle(
        'Token',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0369a1'),
        alignment=1
    )

    story = []

    # Header Card
    story.append(Paragraph(f"{settings.EVENT_NAME}", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("OFFICIAL ENTRY E-TICKET & PASS", ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#0284c7'), alignment=1)))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"Date: <b>{settings.EVENT_DATE}</b> | Venue: <b>{settings.EVENT_VENUE}</b>", subtitle_style))
    story.append(Spacer(1, 15))

    # Details Table
    members = list(team.members.all())
    leader_name = members[0].full_name if len(members) > 0 else 'N/A'
    leader_contact = f"{members[0].email} / {members[0].mobile_number}" if len(members) > 0 else 'N/A'
    member2_name = members[1].full_name if len(members) > 1 else 'N/A'
    member2_contact = f"{members[1].email} / {members[1].mobile_number}" if len(members) > 1 else 'N/A'

    details_data = [
        [Paragraph("Registration ID", bold_body), Paragraph(f"<b>{team.registration_id}</b>", bold_body)],
        [Paragraph("Team Name", bold_body), Paragraph(team.team_name, body_style)],
        [Paragraph("Institution / College", bold_body), Paragraph(team.college_name, body_style)],
        [Paragraph("Team Leader (Participant 1)", bold_body), Paragraph(f"{leader_name}<br/>{leader_contact}", body_style)],
        [Paragraph("Team Member (Participant 2)", bold_body), Paragraph(f"{member2_name}<br/>{member2_contact}", body_style)],
        [Paragraph("Registration Status", bold_body), Paragraph("<font color='#16a34a'><b>CONFIRMED & PAID</b></font>", body_style)],
        [Paragraph("Total Amount Paid", bold_body), Paragraph(f"INR {settings.REGISTRATION_FEE_INR}", body_style)],
    ]

    t1 = Table(details_data, colWidths=[2.2 * inch, 4.8 * inch])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t1)
    story.append(Spacer(1, 15))

    # QR Code & Verification Block
    rl_qr = RLImage(qr_buffer, width=1.6 * inch, height=1.6 * inch)
    
    qr_side_text = [
        Paragraph("SECURITY VERIFICATION & CHECK-IN", ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#0f766e'))),
        Spacer(1, 4),
        Paragraph("Present this QR code at the event registration counter for gate check-in.", body_style),
        Spacer(1, 4),
        Paragraph(f"Secure Token: <code>{ticket.qr_token}</code>", token_style),
        Spacer(1, 4),
        Paragraph("<b>Important Instructions:</b><br/>"
                  "• Both participants must carry valid college photo IDs.<br/>"
                  "• One ticket covers both team members.<br/>"
                  "• Participation certificates will be unlocked upon arrival verification.",
                  ParagraphStyle('Small', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#475569')))
    ]

    qr_table = Table([[rl_qr, qr_side_text]], colWidths=[2.0 * inch, 5.0 * inch])
    qr_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#86efac')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(qr_table)

    doc.build(story)

    # Save relative path
    relative_path = os.path.relpath(pdf_filepath, settings.MEDIA_ROOT)
    ticket.pdf_path = relative_path
    ticket.save(update_fields=['pdf_path'])

    # Deliver emails to both team members
    send_ticket_email(team, ticket, pdf_path=pdf_filepath)

    return ticket
