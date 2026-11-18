import os
import io
import hashlib
import qrcode
from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from apps.tickets.models import Ticket, generate_qr_token
from apps.notifications.services import send_ticket_email


_FONT_REGISTERED = False


def _ensure_poster_font():
    """Registers Arvo-Bold slab-serif poster font if bundled, falling back cleanly to Helvetica-Bold."""
    global _FONT_REGISTERED
    if _FONT_REGISTERED:
        return 'ArvoBold'
    font_path = os.path.join(os.path.dirname(__file__), 'fonts', 'Arvo-Bold.ttf')
    if os.path.exists(font_path):
        try:
            pdfmetrics.registerFont(TTFont('ArvoBold', font_path))
            _FONT_REGISTERED = True
            return 'ArvoBold'
        except Exception:
            pass
    return 'Helvetica-Bold'


def _truncate(text, max_len):
    text = str(text or '').strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + '…'


def _draw_corner_brackets(c, x, y, w, h, length=8, color=colors.HexColor('#10b981'), line_width=1.2):
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(line_width)
    # Bottom-left
    c.line(x, y, x + length, y)
    c.line(x, y, x, y + length)
    # Bottom-right
    c.line(x + w, y, x + w - length, y)
    c.line(x + w, y, x + w, y + length)
    # Top-left
    c.line(x, y + h, x + length, y + h)
    c.line(x, y + h, x, y + h - length)
    # Top-right
    c.line(x + w, y + h, x + w - length, y + h)
    c.line(x + w, y + h, x + w, y + h - length)
    c.restoreState()


def _draw_decorative_barcode(c, cx, y, width, height, seed_text):
    """Draws a crisp deterministic concert-ticket barcode strip seeded from the ticket token."""
    digest = hashlib.sha256(seed_text.encode('utf-8')).hexdigest()
    bits = bin(int(digest, 16))[2:].zfill(256)
    num_bars = 58
    bar_unit = width / float(num_bars)
    start_x = cx - width / 2.0

    c.saveState()
    for i in range(num_bars):
        bit = bits[i % len(bits)]
        bit2 = bits[(i * 3 + 7) % len(bits)]
        if bit == '1':
            bar_w = bar_unit * (0.78 if bit2 == '1' else 0.45)
            # Subtle emerald accent on every 11th bar, brushed silver on the rest
            if i % 11 == 0:
                c.setFillColor(colors.HexColor('#34d399'))
            else:
                c.setFillColor(colors.HexColor('#94a3b8'))
            c.rect(start_x + i * bar_unit, y, bar_w, height, stroke=0, fill=1)
    c.restoreState()


def _render_doomsday_concert_ticket_pdf(pdf_filepath, team, ticket, leader, member2, qr_buffer):
    """
    Renders a horizontal collector's concert-style VIP ticket matching the
    Build Ops / Doomsday aesthetic (obsidian void, arcane emerald, brushed gold,
    notched perforation stub, high-contrast QR pass, and vector barcode).
    """
    display_font = _ensure_poster_font()

    # Landscape concert ticket dimensions: 9.0 in x 3.85 in
    W = 9.0 * inch   # 648 pt
    H = 3.85 * inch  # 277.2 pt

    c = pdf_canvas.Canvas(pdf_filepath, pagesize=(W, H))
    c.setTitle(f"{settings.EVENT_NAME} — VIP Squad Pass ({team.registration_id})")
    c.setAuthor(f"{settings.EVENT_NAME} — ASIET x TCS")

    # Palette
    c_outer_bg = colors.HexColor('#030605')
    c_body_bg = colors.HexColor('#070d0a')
    c_stub_bg = colors.HexColor('#050a08')
    c_spine_bg = colors.HexColor('#0a1d14')
    c_panel_bg = colors.HexColor('#0b1510')
    c_grid = colors.HexColor('#0f2118')
    c_emerald = colors.HexColor('#10b981')
    c_emerald_bright = colors.HexColor('#34d399')
    c_emerald_dark = colors.HexColor('#064e3b')
    c_gold = colors.HexColor('#d4b46a')
    c_gold_bright = colors.HexColor('#f3d58d')
    c_white = colors.HexColor('#f8fafc')
    c_muted = colors.HexColor('#94a3b8')
    c_dim = colors.HexColor('#64748b')

    # Ticket bounds
    pad = 10
    tx, ty = pad, pad
    tw, th = W - 2 * pad, H - 2 * pad
    top = ty + th
    bot = ty
    spine_w = 26
    stub_x = 456  # Perforation tear-off line

    # 1. Outer matte void canvas
    c.setFillColor(c_outer_bg)
    c.rect(0, 0, W, H, stroke=0, fill=1)

    # 2. Ticket body & stub base fills
    c.setFillColor(c_body_bg)
    c.rect(tx, ty, stub_x - tx, th, stroke=0, fill=1)
    c.setFillColor(c_stub_bg)
    c.rect(stub_x, ty, (tx + tw) - stub_x, th, stroke=0, fill=1)

    # 3. Subtle architectural blueprint grid across main body
    c.saveState()
    c.setStrokeColor(c_grid)
    c.setLineWidth(0.35)
    gx = tx + spine_w
    while gx < stub_x:
        c.line(gx, bot, gx, top)
        gx += 22
    gy = bot
    while gy < top:
        c.line(tx + spine_w, gy, stub_x, gy)
        gy += 22

    # Subtle diagonal tactical hatch lines inside the stub
    c.setStrokeColor(colors.HexColor('#0b1a13'))
    c.setLineWidth(0.4)
    for offset in range(-280, 320, 14):
        x1 = stub_x + offset
        y1 = bot
        x2 = stub_x + offset + 120
        y2 = top
        # Clip manually to stub rectangle
        c.saveState()
        p = c.beginPath()
        p.rect(stub_x, bot, (tx + tw) - stub_x, th)
        c.clipPath(p, stroke=0, fill=0)
        c.line(x1, y1, x2, y2)
        c.restoreState()
    c.restoreState()

    # 4. Left vertical collector's spine strip
    c.setFillColor(c_spine_bg)
    c.rect(tx, bot, spine_w, th, stroke=0, fill=1)
    c.setStrokeColor(c_emerald_dark)
    c.setLineWidth(0.8)
    c.line(tx + spine_w, bot, tx + spine_w, top)

    # Vertical rotated serial text inside spine
    c.saveState()
    c.translate(tx + 16, ty + th / 2.0)
    c.rotate(90)
    c.setFont('Courier-Bold', 6.8)
    c.setFillColor(c_gold)
    c.drawCentredString(0, 0, f"BUILD OPS 2026  //  ASIET x TCS  //  {team.registration_id}")
    c.restoreState()

    # 5. Double metallic frame (outer emerald + inner gold hairline)
    c.setStrokeColor(c_emerald)
    c.setLineWidth(1.1)
    c.rect(tx, bot, tw, th, stroke=1, fill=0)

    c.setStrokeColor(c_gold)
    c.setLineWidth(0.45)
    c.rect(tx + 3, bot + 3, tw - 6, th - 6, stroke=1, fill=0)

    # 6. Top & bottom perforation punch notches + side ticket bites
    notch_r = 10.5
    c.setFillColor(c_outer_bg)
    c.setStrokeColor(c_emerald)
    c.setLineWidth(1.0)
    # Top perforation notch
    c.circle(stub_x, top, notch_r, stroke=1, fill=1)
    # Bottom perforation notch
    c.circle(stub_x, bot, notch_r, stroke=1, fill=1)
    # Left & Right center concert-ticket semicircular notches
    side_r = 7.5
    c.circle(tx, ty + th / 2.0, side_r, stroke=1, fill=1)
    c.circle(tx + tw, ty + th / 2.0, side_r, stroke=1, fill=1)

    # Clean outer bleed masks so notch circles don't poke outside ticket border
    c.setFillColor(c_outer_bg)
    c.rect(0, top + 0.6, W, H - top, stroke=0, fill=1)
    c.rect(0, 0, W, bot - 0.6, stroke=0, fill=1)
    c.rect(0, 0, tx - 0.6, H, stroke=0, fill=1)
    c.rect(tx + tw + 0.6, 0, W - (tx + tw), H, stroke=0, fill=1)

    # Vertical dashed tear-off perforation line
    c.saveState()
    c.setStrokeColor(c_gold)
    c.setLineWidth(0.9)
    c.setDash(3.5, 3.5)
    c.line(stub_x, bot + notch_r + 3, stub_x, top - notch_r - 3)
    c.restoreState()

    # =========================================================================
    # LEFT MAIN TICKET BODY (x = 50 .. 442)
    # =========================================================================
    mx_left = tx + spine_w + 14  # 50
    mx_right = stub_x - 14       # 442
    m_width = mx_right - mx_left # 392

    # Top eyebrow metadata
    c.setFont('Helvetica-Bold', 6.8)
    c.setFillColor(c_gold)
    c.drawString(mx_left, 248, "DEPT. OF COMPUTER APPLICATIONS   •   ASIET × TCS")

    # Tactical rectangular VIP stamp badge (top-right of main body)
    badge_w, badge_h = 114, 15
    badge_x, badge_y = mx_right - badge_w, 243
    c.setFillColor(colors.HexColor('#082317'))
    c.setStrokeColor(c_emerald)
    c.setLineWidth(0.8)
    c.rect(badge_x, badge_y, badge_w, badge_h, stroke=1, fill=1)
    c.setFillColor(c_emerald_bright)
    c.circle(badge_x + 8, badge_y + badge_h / 2.0, 2.2, stroke=0, fill=1)
    c.setFont('Courier-Bold', 6.8)
    c.drawString(badge_x + 15, badge_y + 4.8, "VIP PASS • ADMIT 02")

    # Monumental Doomsday Poster Title
    title_text = str(settings.EVENT_NAME or 'BUILD OPS').upper()
    c.setFont(display_font, 32)
    c.setFillColor(c_emerald_dark)
    c.drawString(mx_left + 1.4, 204.6, title_text)
    c.setFillColor(c_white)
    c.drawString(mx_left, 206, title_text)

    # Edition subtitle + right-aligned price/tier
    c.setFont('Courier-Bold', 7.8)
    c.setFillColor(c_emerald_bright)
    c.drawString(mx_left, 191, "OFFICIAL 12-HOUR BUILDATHON ENTRY PASS")

    c.setFont('Courier-Bold', 8)
    c.setFillColor(c_gold_bright)
    c.drawRightString(mx_right, 191, f"FEE PAID: INR {settings.REGISTRATION_FEE_INR}")

    # Glowing emerald + gold horizontal accent rule
    c.setStrokeColor(c_emerald)
    c.setLineWidth(1.3)
    c.line(mx_left, 183, mx_left + 265, 183)
    c.setStrokeColor(c_gold)
    c.setLineWidth(0.7)
    c.line(mx_left + 269, 183, mx_right, 183)

    # Event Info Strip (3 sharp editorial columns)
    col1_x = mx_left
    col2_x = mx_left + 118
    col3_x = mx_left + 252

    c.setFont('Courier-Bold', 6.2)
    c.setFillColor(c_gold)
    c.drawString(col1_x, 169, "EVENT DATE")
    c.drawString(col2_x, 169, "DURATION / WINDOW")
    c.drawString(col3_x, 169, "VENUE")

    c.setFont('Helvetica-Bold', 8.8)
    c.setFillColor(c_white)
    c.drawString(col1_x, 156, "DEC 08 – 09, 2026")
    c.drawString(col2_x, 156, "5:00 PM – 9:00 AM IST")
    venue_short = _truncate(settings.EVENT_VENUE or "Innovation Hub, ASIET", 26)
    c.drawString(col3_x, 156, venue_short)

    # Subtle vertical dividers between metadata columns
    c.setStrokeColor(colors.HexColor('#1b3629'))
    c.setLineWidth(0.6)
    c.line(col2_x - 10, 152, col2_x - 10, 175)
    c.line(col3_x - 10, 152, col3_x - 10, 175)
    c.line(mx_left, 145, mx_right, 145)

    # Squad Identity Row
    c.setFont('Courier-Bold', 6.4)
    c.setFillColor(c_emerald_bright)
    c.drawString(mx_left, 134, "REGISTERED SQUAD")
    c.setFillColor(c_gold)
    c.drawRightString(mx_right, 134, "REGISTRATION ID")

    c.setFont(display_font, 14.5)
    c.setFillColor(c_white)
    c.drawString(mx_left, 117, _truncate(team.team_name.upper(), 24))

    c.setFont('Courier-Bold', 12)
    c.setFillColor(c_gold_bright)
    c.drawRightString(mx_right, 119, team.registration_id)

    c.setFont('Helvetica', 7.6)
    c.setFillColor(c_muted)
    c.drawString(mx_left, 105, _truncate(team.college_name, 54))

    # Two Side-by-Side Operative Panels
    box_y = 43
    box_h = 54
    gap = 10
    box_w = (m_width - gap) / 2.0

    leader_name = _truncate(leader.full_name if leader else 'N/A', 26)
    leader_email = _truncate(leader.email if leader else 'N/A', 30)
    leader_phone = _truncate(leader.mobile_number if leader else 'N/A', 18)

    member2_name = _truncate(member2.full_name if member2 else 'N/A', 26)
    member2_email = _truncate(member2.email if member2 else 'N/A', 30)
    member2_phone = _truncate(member2.mobile_number if member2 else 'N/A', 18)

    operatives = [
        (mx_left, "01 // TEAM LEADER", c_gold_bright, c_emerald, leader_name, leader_email, leader_phone),
        (mx_left + box_w + gap, "02 // TEAM MEMBER", c_emerald_bright, c_gold, member2_name, member2_email, member2_phone),
    ]

    for bx, role_label, label_color, bar_color, name, email, phone in operatives:
        c.setFillColor(c_panel_bg)
        c.setStrokeColor(colors.HexColor('#183326'))
        c.setLineWidth(0.6)
        c.rect(bx, box_y, box_w, box_h, stroke=1, fill=1)

        # Left accent bar
        c.setFillColor(bar_color)
        c.rect(bx, box_y, 2.4, box_h, stroke=0, fill=1)

        c.setFont('Courier-Bold', 6.3)
        c.setFillColor(label_color)
        c.drawString(bx + 9, box_y + 42, role_label)

        c.setFont('Helvetica-Bold', 9.2)
        c.setFillColor(c_white)
        c.drawString(bx + 9, box_y + 29, name)

        c.setFont('Helvetica', 6.9)
        c.setFillColor(c_muted)
        c.drawString(bx + 9, box_y + 18, email)

        c.setFont('Courier', 6.9)
        c.setFillColor(c_emerald_bright)
        c.drawString(bx + 9, box_y + 8, phone)

    # Bottom verification & instructions strip
    c.setFillColor(c_emerald_bright)
    c.rect(mx_left, 23.5, 5, 5, stroke=0, fill=1)
    c.setFont('Courier-Bold', 7.2)
    c.drawString(mx_left + 9, 23.5, "STATUS: CONFIRMED & PAID")

    c.setFont('Helvetica-Bold', 6.4)
    c.setFillColor(c_dim)
    c.drawRightString(mx_right, 23.5, "CARRY VALID COLLEGE PHOTO ID • ONE PASS PER SQUAD")

    # =========================================================================
    # RIGHT TEAR-OFF QR STUB (x = 456 .. 638)
    # =========================================================================
    stub_cx = (stub_x + (tx + tw)) / 2.0  # 547

    c.setFont('Courier-Bold', 7.2)
    c.setFillColor(c_gold)
    c.drawCentredString(stub_cx, 248, "GATE SCAN STUB")

    c.setFont('Helvetica', 6.0)
    c.setFillColor(c_emerald_bright)
    c.drawCentredString(stub_cx, 238, "PRESENT AT REGISTRATION DESK")

    # Crisp White High-Contrast QR Container with Tactical Corner Brackets
    qr_frame_size = 116
    qr_fx = stub_cx - qr_frame_size / 2.0
    qr_fy = 112

    c.setFillColor(colors.white)
    c.setStrokeColor(c_emerald)
    c.setLineWidth(1.0)
    c.rect(qr_fx, qr_fy, qr_frame_size, qr_frame_size, stroke=1, fill=1)

    _draw_corner_brackets(c, qr_fx - 4, qr_fy - 4, qr_frame_size + 8, qr_frame_size + 8, length=9, color=c_gold, line_width=1.1)

    qr_buffer.seek(0)
    qr_reader = ImageReader(qr_buffer)
    qr_inner_pad = 5
    c.drawImage(
        qr_reader,
        qr_fx + qr_inner_pad,
        qr_fy + qr_inner_pad,
        width=qr_frame_size - 2 * qr_inner_pad,
        height=qr_frame_size - 2 * qr_inner_pad,
        preserveAspectRatio=True,
        mask='auto',
    )

    # Registration ID + Full QR Token
    c.setFont('Courier-Bold', 9.8)
    c.setFillColor(c_white)
    c.drawCentredString(stub_cx, 93, team.registration_id)

    token_str = str(ticket.qr_token)
    c.setFont('Courier', 5.8)
    c.setFillColor(c_emerald_bright)
    if len(token_str) > 26:
        c.drawCentredString(stub_cx, 82, token_str[:26])
        c.drawCentredString(stub_cx, 74, token_str[26:])
    else:
        c.drawCentredString(stub_cx, 80, token_str)

    # Decorative Concert Barcode Strip
    _draw_decorative_barcode(c, stub_cx, 38, 134, 24, f"{team.registration_id}:{token_str}")

    c.setFont('Courier-Bold', 6.2)
    c.setFillColor(c_gold)
    c.drawCentredString(stub_cx, 23.5, "ADMIT TWO  •  DEC 08-09 2026")

    c.showPage()
    c.save()


def generate_ticket_for_team(team, send_email=True):
    """
    Idempotently creates a Ticket record and generates a Doomsday concert-style
    PDF ticket with scannable QR code for a confirmed team.
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

    # Generate high-contrast QR Code PNG in-memory
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(ticket.qr_token)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#040806", back_color="white")

    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    # Explicitly identify LEADER (registered user) vs MEMBER
    members = list(team.members.all())
    leader = next(
        (m for m in members if m.member_role == 'LEADER' or m.user_id == team.team_leader_id),
        members[0] if members else None
    )
    member2 = next(
        (m for m in members if m != leader),
        None
    )

    _render_doomsday_concert_ticket_pdf(
        pdf_filepath=pdf_filepath,
        team=team,
        ticket=ticket,
        leader=leader,
        member2=member2,
        qr_buffer=qr_buffer,
    )

    # Save relative path
    relative_path = os.path.relpath(pdf_filepath, settings.MEDIA_ROOT)
    ticket.pdf_path = relative_path
    ticket.save(update_fields=['pdf_path'])

    # Deliver emails to both team members
    if send_email:
        send_ticket_email(team, ticket, pdf_path=pdf_filepath)

    return ticket
