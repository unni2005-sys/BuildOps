import os
import logging
from django.conf import settings
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from apps.certificates.models import Certificate, generate_certificate_id

logger = logging.getLogger(__name__)


def generate_certificate_for_member(member):
    """
    Idempotently creates a Certificate model and generates a landscape PDF certificate.
    """
    certificate, created = Certificate.objects.get_or_create(
        member=member,
        defaults={'certificate_id': generate_certificate_id()}
    )

    certs_dir = os.path.join(settings.MEDIA_ROOT, 'certificates')
    os.makedirs(certs_dir, exist_ok=True)

    pdf_filename = f"cert_{certificate.certificate_id}.pdf"
    pdf_filepath = os.path.join(certs_dir, pdf_filename)

    # Document in landscape orientation
    doc = SimpleDocTemplate(
        pdf_filepath,
        pagesize=landscape(letter),
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    org_style = ParagraphStyle(
        'OrgHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0f766e'),
        alignment=1
    )

    main_title = ParagraphStyle(
        'CertMainTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor('#1e293b'),
        alignment=1
    )

    subtitle = ParagraphStyle(
        'CertSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#64748b'),
        alignment=1
    )

    recipient_name_style = ParagraphStyle(
        'RecipientName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=colors.HexColor('#0284c7'),
        alignment=1
    )

    cert_body = ParagraphStyle(
        'CertBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=18,
        textColor=colors.HexColor('#334155'),
        alignment=1
    )

    id_style = ParagraphStyle(
        'CertID',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b'),
        alignment=1
    )

    story = []

    story.append(Paragraph(f"<b>{settings.EVENT_NAME.upper()}</b>", org_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("CERTIFICATE OF PARTICIPATION", main_title))
    story.append(Spacer(1, 6))
    story.append(Paragraph("This is proudly presented to", subtitle))
    story.append(Spacer(1, 12))

    story.append(Paragraph(f"{member.full_name}", recipient_name_style))
    story.append(Spacer(1, 12))

    team = member.team
    body_text = (
        f"for active participation and demonstrating exceptional technical innovation as a member of "
        f"Team <b>{team.team_name}</b> representing <b>{team.college_name}</b> "
        f"at the <b>{settings.EVENT_NAME}</b> held on <b>{settings.EVENT_DATE}</b> "
        f"at {settings.EVENT_VENUE}."
    )
    story.append(Paragraph(body_text, cert_body))
    story.append(Spacer(1, 30))

    # Signature & Verification Table
    sig_data = [
        [
            Paragraph("____________________________<br/><b>Event Convener</b><br/>National Buildathon 2026", ParagraphStyle('Sig1', fontName='Helvetica', fontSize=10, leading=14, alignment=1)),
            Paragraph(f"<b>Certificate ID:</b> {certificate.certificate_id}<br/>"
                      f"<b>Team Reg ID:</b> {team.registration_id}<br/>"
                      f"<b>Issued:</b> {certificate.generated_at.strftime('%B %d, %Y') if certificate.generated_at else 'Verified'}",
                      id_style),
            Paragraph("____________________________<br/><b>Director / Patron</b><br/>Organizing Committee", ParagraphStyle('Sig2', fontName='Helvetica', fontSize=10, leading=14, alignment=1))
        ]
    ]

    sig_table = Table(sig_data, colWidths=[3.2 * inch, 3.6 * inch, 3.2 * inch])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(sig_table)

    # Frame decoration via page background canvas
    def draw_border(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor('#0f766e'))
        canvas.setLineWidth(3)
        canvas.rect(20, 20, landscape(letter)[0] - 40, landscape(letter)[1] - 40)
        canvas.setStrokeColor(colors.HexColor('#94a3b8'))
        canvas.setLineWidth(1)
        canvas.rect(25, 25, landscape(letter)[0] - 50, landscape(letter)[1] - 50)
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_border)

    relative_path = os.path.relpath(pdf_filepath, settings.MEDIA_ROOT)
    certificate.pdf_path = relative_path
    certificate.save(update_fields=['pdf_path'])

    return certificate


def generate_certificates_for_team(team):
    """
    Generates individual participation certificates for all members of the team.
    """
    certs = []
    for member in team.members.all():
        try:
            cert = generate_certificate_for_member(member)
            certs.append(cert)
        except Exception as e:
            logger.error(f"Failed generating certificate for {member.full_name}: {e}", exc_info=True)
    return certs
