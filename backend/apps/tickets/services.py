import os
import hashlib
import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from django.conf import settings
from apps.tickets.models import Ticket, generate_qr_token
from apps.notifications.services import send_ticket_email


BASE_DIR = os.path.dirname(__file__)
FONTS_DIR = os.path.join(BASE_DIR, 'fonts')
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')


def _load_font(filename, size):
    path = os.path.join(FONTS_DIR, filename)
    if os.path.exists(path):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def _truncate(text, max_len):
    text = str(text or '').strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + '…'


def _draw_dashed_vline(draw, x, y1, y2, dash=12, gap=10, color=(212, 180, 106, 200), width=3):
    y = y1
    while y < y2:
        draw.line([(x, y), (x, min(y + dash, y2))], fill=color, width=width)
        y += dash + gap


def _draw_corner_brackets(draw, x, y, w, h, length=24, color=(212, 180, 106, 255), width=3):
    # Top-left
    draw.line([(x, y), (x + length, y)], fill=color, width=width)
    draw.line([(x, y), (x, y + length)], fill=color, width=width)
    # Top-right
    draw.line([(x + w, y), (x + w - length, y)], fill=color, width=width)
    draw.line([(x + w, y), (x + w, y + length)], fill=color, width=width)
    # Bottom-left
    draw.line([(x, y + h), (x + length, y + h)], fill=color, width=width)
    draw.line([(x, y + h), (x, y + h - length)], fill=color, width=width)
    # Bottom-right
    draw.line([(x + w, y + h), (x + w - length, y + h)], fill=color, width=width)
    draw.line([(x + w, y + h), (x + w, y + h - length)], fill=color, width=width)


def _draw_barcode(draw, cx, y, width, height, seed_text):
    digest = hashlib.sha256(seed_text.encode('utf-8')).hexdigest()
    bits = bin(int(digest, 16))[2:].zfill(256)
    num_bars = 56
    unit = width / float(num_bars)
    start_x = cx - width / 2.0

    for i in range(num_bars):
        b1 = bits[i % len(bits)]
        b2 = bits[(i * 3 + 7) % len(bits)]
        if b1 == '1':
            bw = max(2, int(unit * (0.76 if b2 == '1' else 0.42)))
            bx = int(start_x + i * unit)
            col = (52, 211, 153, 235) if i % 11 == 0 else (155, 172, 162, 210)
            draw.rectangle([bx, y, bx + bw, y + height], fill=col)


def _render_doomsday_concert_ticket_png(png_filepath, team, ticket, leader, member2):
    """
    Renders a shareable, retina-sharp (1800x770 px) Avengers: Doomsday
    collector concert ticket PNG with official Build Ops halftone title,
    TCS logo, notched tear-off QR stub, and unique barcode.
    """
    W, H = 1800, 770
    pad = 26
    tx, ty = pad, pad
    tw, th = W - 2 * pad, H - 2 * pad
    right = tx + tw
    bottom = ty + th
    spine_w = 72
    stub_x = 1264  # Perforation line separating main pass and QR stub

    # Palette (Strictly Monochromatic Doomsday: Obsidian + Emerald + Brushed Gold)
    c_outer = (3, 6, 5, 255)
    c_body = (7, 13, 10, 255)
    c_stub = (5, 10, 8, 255)
    c_spine = (10, 29, 20, 255)
    c_panel = (11, 21, 16, 255)
    c_grid = (16, 36, 26, 255)
    c_hatch = (12, 27, 20, 255)
    c_emerald = (16, 185, 129, 255)
    c_emerald_bright = (52, 211, 153, 255)
    c_emerald_dark = (6, 78, 59, 255)
    c_gold = (212, 180, 106, 255)
    c_gold_bright = (243, 213, 141, 255)
    c_white = (244, 248, 245, 255)
    c_muted = (148, 165, 155, 255)
    c_dim = (96, 114, 104, 255)

    img = Image.new('RGBA', (W, H), c_outer)
    draw = ImageDraw.Draw(img)

    # 1. Main body + stub fills
    draw.rectangle([tx, ty, stub_x, bottom], fill=c_body)
    draw.rectangle([stub_x, ty, right, bottom], fill=c_stub)

    # 2. Subtle atmospheric emerald radial aura behind title area
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([160, 40, 860, 460], fill=(16, 185, 129, 34))
    gdraw.ellipse([stub_x + 70, 120, right - 50, 540], fill=(16, 185, 129, 24))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=75))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # 3. Blueprint architectural grid inside main body
    for gx in range(tx + spine_w, stub_x, 54):
        draw.line([(gx, ty), (gx, bottom)], fill=c_grid, width=1)
    for gy in range(ty, bottom, 54):
        draw.line([(tx + spine_w, gy), (stub_x, gy)], fill=c_grid, width=1)

    # Diagonal tactical hatch lines clipped inside stub
    stub_overlay = Image.new('RGBA', (right - stub_x, th), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(stub_overlay)
    for off in range(-th, (right - stub_x) + th, 32):
        sdraw.line([(off, th), (off + 260, 0)], fill=c_hatch, width=2)
    img.alpha_composite(stub_overlay, (stub_x, ty))
    draw = ImageDraw.Draw(img)

    # 4. Left vertical collector spine
    draw.rectangle([tx, ty, tx + spine_w, bottom], fill=c_spine)
    draw.line([(tx + spine_w, ty), (tx + spine_w, bottom)], fill=c_emerald_dark, width=2)

    # Load fonts
    f_poster_lg = _load_font('Arvo-Bold.ttf', 40)
    f_poster_xl = _load_font('Arvo-Bold.ttf', 84)
    f_bold_24 = _load_font('VeraBd.ttf', 25)
    f_bold_22 = _load_font('VeraBd.ttf', 22)
    f_bold_20 = _load_font('VeraBd.ttf', 20)
    f_bold_18 = _load_font('VeraBd.ttf', 18)
    f_bold_16 = _load_font('VeraBd.ttf', 16)
    f_bold_15 = _load_font('VeraBd.ttf', 15)
    f_reg_19 = _load_font('Vera.ttf', 19)
    f_reg_17 = _load_font('Vera.ttf', 17)
    f_reg_15 = _load_font('Vera.ttf', 15)
    f_reg_14 = _load_font('Vera.ttf', 14)

    # Rotated vertical spine serial text
    spine_txt = f"BUILD OPS 2026  //  ASIET x TCS  //  {team.registration_id}"
    sp_img = Image.new('RGBA', (th, spine_w), (0, 0, 0, 0))
    sp_draw = ImageDraw.Draw(sp_img)
    tb = sp_draw.textbbox((0, 0), spine_txt, font=f_bold_16)
    tw_txt, th_txt = tb[2] - tb[0], tb[3] - tb[1]
    sp_draw.text(((th - tw_txt) // 2, (spine_w - th_txt) // 2 - 2), spine_txt, font=f_bold_16, fill=c_gold)
    sp_rot = sp_img.rotate(90, expand=True)
    img.alpha_composite(sp_rot, (tx, ty))
    draw = ImageDraw.Draw(img)

    # 5. Double metallic ticket frame (emerald outer + gold inner)
    draw.rectangle([tx, ty, right, bottom], outline=c_emerald, width=3)
    draw.rectangle([tx + 8, ty + 8, right - 8, bottom - 8], outline=c_gold, width=1)

    # 6. Main ticket body content (x = 136 .. 1226)
    mx_l = tx + spine_w + 38   # 136
    mx_r = stub_x - 38         # 1226
    m_w = mx_r - mx_l          # 1090

    # Top row: Institution & Department (left) + Official TCS Logo (right)
    draw.text((mx_l, 62), "ADI SHANKARA INSTITUTE OF ENGINEERING & TECHNOLOGY", font=f_bold_16, fill=c_gold)
    draw.text((mx_l, 86), "DEPARTMENT OF COMPUTER APPLICATIONS", font=f_bold_15, fill=c_muted)

    tcs_path = os.path.join(ASSETS_DIR, 'tcs-logo.png')
    if os.path.exists(tcs_path):
        try:
            tcs_im = Image.open(tcs_path).convert('RGBA')
            tcs_h = 44
            tcs_w = int(tcs_im.width * (tcs_h / float(tcs_im.height)))
            tcs_im = tcs_im.resize((tcs_w, tcs_h), Image.Resampling.LANCZOS)
            img.alpha_composite(tcs_im, (mx_r - tcs_w, 60))
            draw = ImageDraw.Draw(img)
        except Exception:
            draw.text((mx_r - 120, 66), "ASIET x TCS", font=f_bold_18, fill=c_white)

    # Official halftone Build Ops poster title + VIP Stamp
    title_path = os.path.join(ASSETS_DIR, 'buildops_poster_title_2x.png')
    if os.path.exists(title_path):
        try:
            title_im = Image.open(title_path).convert('RGBA')
            target_h = 114
            target_w = int(title_im.width * (target_h / float(title_im.height)))
            title_im = title_im.resize((target_w, target_h), Image.Resampling.LANCZOS)
            img.alpha_composite(title_im, (mx_l - 8, 126))
            draw = ImageDraw.Draw(img)
        except Exception:
            draw.text((mx_l + 3, 143), "BUILD OPS", font=f_poster_xl, fill=c_emerald_dark)
            draw.text((mx_l, 140), "BUILD OPS", font=f_poster_xl, fill=c_white)
    else:
        draw.text((mx_l + 3, 143), "BUILD OPS", font=f_poster_xl, fill=c_emerald_dark)
        draw.text((mx_l, 140), "BUILD OPS", font=f_poster_xl, fill=c_white)

    # VIP Pass stamp badge + Fee Paid right-aligned beside title
    badge_w, badge_h = 286, 40
    bx, by = mx_r - badge_w, 138
    draw.rectangle([bx, by, bx + badge_w, by + badge_h], fill=(8, 35, 23, 255), outline=c_emerald, width=2)
    draw.ellipse([bx + 18, by + 15, bx + 28, by + 25], fill=c_emerald_bright)
    draw.text((bx + 40, by + 11), "VIP PASS  •  ADMIT 02", font=f_bold_16, fill=c_emerald_bright)

    fee_txt = f"FEE PAID: INR {settings.REGISTRATION_FEE_INR}"
    fb = draw.textbbox((0, 0), fee_txt, font=f_bold_18)
    draw.text((mx_r - (fb[2] - fb[0]), 194), fee_txt, font=f_bold_18, fill=c_gold_bright)

    draw.text((mx_l, 240), "OFFICIAL OVERNIGHT BUILDATHON GATE PASS", font=f_bold_16, fill=c_emerald_bright)

    # Dual emerald + gold energy rule
    rule_y = 272
    draw.line([(mx_l, rule_y), (mx_l + 720, rule_y)], fill=c_emerald, width=3)
    draw.line([(mx_l + 732, rule_y), (mx_r, rule_y)], fill=c_gold, width=2)

    # Event Metadata Strip (3 clean hairline columns)
    c1, c2, c3 = mx_l, mx_l + 335, mx_l + 720
    draw.text((c1, 290), "EVENT DATE", font=f_bold_15, fill=c_gold)
    draw.text((c2, 290), "WINDOW", font=f_bold_15, fill=c_gold)
    draw.text((c3, 290), "VENUE", font=f_bold_15, fill=c_gold)

    draw.text((c1, 315), "DEC 08 – 09, 2026", font=f_bold_22, fill=c_white)
    draw.text((c2, 315), "5:00 PM – 8:00 AM IST", font=f_bold_22, fill=c_white)
    draw.text((c3, 315), _truncate(settings.EVENT_VENUE or "AI Lab, ASIET", 24), font=f_bold_22, fill=c_white)

    draw.line([(c2 - 24, 290), (c2 - 24, 348)], fill=(28, 56, 42, 255), width=2)
    draw.line([(c3 - 24, 290), (c3 - 24, 348)], fill=(28, 56, 42, 255), width=2)
    draw.line([(mx_l, 362), (mx_r, 362)], fill=(28, 56, 42, 255), width=2)

    # Squad Identity Row
    draw.text((mx_l, 378), "REGISTERED SQUAD", font=f_bold_15, fill=c_emerald_bright)
    reg_lbl = "REGISTRATION ID"
    rlb = draw.textbbox((0, 0), reg_lbl, font=f_bold_15)
    draw.text((mx_r - (rlb[2] - rlb[0]), 378), reg_lbl, font=f_bold_15, fill=c_gold)

    draw.text((mx_l, 401), _truncate(team.team_name.upper(), 24), font=f_poster_lg, fill=c_white)
    reg_val = str(team.registration_id)
    rvb = draw.textbbox((0, 0), reg_val, font=f_bold_24)
    draw.text((mx_r - (rvb[2] - rvb[0]), 408), reg_val, font=f_bold_24, fill=c_gold_bright)

    draw.text((mx_l, 454), _truncate(team.college_name, 58), font=f_reg_19, fill=c_muted)

    # Two Side-by-Side Team Member Panels
    box_y = 496
    box_h = 166
    gap = 28
    box_w = (m_w - gap) // 2

    leader_name = _truncate(leader.full_name if leader else 'N/A', 26)
    leader_email = _truncate(leader.email if leader else 'N/A', 30)
    leader_phone = _truncate(leader.mobile_number if leader else 'N/A', 18)

    member2_name = _truncate(member2.full_name if member2 else 'N/A', 26)
    member2_email = _truncate(member2.email if member2 else 'N/A', 30)
    member2_phone = _truncate(member2.mobile_number if member2 else 'N/A', 18)

    members_spec = [
        (mx_l, "01 // TEAM LEADER", c_gold_bright, c_emerald, leader_name, leader_email, leader_phone),
        (mx_l + box_w + gap, "02 // TEAM MEMBER", c_emerald_bright, c_gold, member2_name, member2_email, member2_phone),
    ]

    for px_x, role_lbl, lbl_col, bar_col, m_name, m_email, m_phone in members_spec:
        draw.rectangle([px_x, box_y, px_x + box_w, box_y + box_h], fill=c_panel, outline=(24, 52, 38, 255), width=2)
        draw.rectangle([px_x, box_y, px_x + 7, box_y + box_h], fill=bar_col)
        draw.text((px_x + 24, box_y + 18), role_lbl, font=f_bold_15, fill=lbl_col)
        draw.text((px_x + 24, box_y + 48), m_name, font=f_bold_24, fill=c_white)
        draw.text((px_x + 24, box_y + 88), m_email, font=f_reg_17, fill=c_muted)
        draw.text((px_x + 24, box_y + 120), m_phone, font=f_bold_18, fill=c_emerald_bright)

    # Bottom status line
    draw.rectangle([mx_l, 686, mx_l + 14, 700], fill=c_emerald_bright)
    draw.text((mx_l + 24, 684), "STATUS: CONFIRMED & PAID", font=f_bold_18, fill=c_emerald_bright)

    note_txt = "CARRY VALID COLLEGE PHOTO ID • ONE PASS PER SQUAD"
    nb = draw.textbbox((0, 0), note_txt, font=f_bold_15)
    draw.text((mx_r - (nb[2] - nb[0]), 686), note_txt, font=f_bold_15, fill=c_dim)

    # =========================================================================
    # RIGHT TEAR-OFF QR STUB (x = 1264 .. 1774)
    # =========================================================================
    stub_cx = (stub_x + right) // 2

    hdr1 = "GATE SCAN STUB"
    h1b = draw.textbbox((0, 0), hdr1, font=f_bold_20)
    draw.text((stub_cx - (h1b[2] - h1b[0]) // 2, 64), hdr1, font=f_bold_20, fill=c_gold)

    hdr2 = "PRESENT AT ENTRY DESK"
    h2b = draw.textbbox((0, 0), hdr2, font=f_bold_15)
    draw.text((stub_cx - (h2b[2] - h2b[0]) // 2, 95), hdr2, font=f_bold_15, fill=c_emerald_bright)

    # Crisp White QR Frame + Tactical Gold Corner Brackets
    qr_box = 326
    qr_x = stub_cx - qr_box // 2
    qr_y = 140

    draw.rectangle([qr_x, qr_y, qr_x + qr_box, qr_y + qr_box], fill=(255, 255, 255, 255), outline=c_emerald, width=3)
    _draw_corner_brackets(draw, qr_x - 12, qr_y - 12, qr_box + 24, qr_box + 24, length=26, color=c_gold, width=3)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=2,
    )
    qr.add_data(ticket.qr_token)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#040806", back_color="white").convert('RGBA')
    qr_inner = qr_box - 22
    qr_img = qr_img.resize((qr_inner, qr_inner), Image.Resampling.NEAREST)
    img.alpha_composite(qr_img, (qr_x + 11, qr_y + 11))
    draw = ImageDraw.Draw(img)

    # Registration ID & Token
    rid_b = draw.textbbox((0, 0), reg_val, font=f_bold_24)
    draw.text((stub_cx - (rid_b[2] - rid_b[0]) // 2, 492), reg_val, font=f_bold_24, fill=c_white)

    tok = str(ticket.qr_token)
    if len(tok) > 24:
        t1, t2 = tok[:24], tok[24:]
        t1b = draw.textbbox((0, 0), t1, font=f_reg_14)
        t2b = draw.textbbox((0, 0), t2, font=f_reg_14)
        draw.text((stub_cx - (t1b[2] - t1b[0]) // 2, 528), t1, font=f_reg_14, fill=c_emerald_bright)
        draw.text((stub_cx - (t2b[2] - t2b[0]) // 2, 548), t2, font=f_reg_14, fill=c_emerald_bright)
    else:
        tb = draw.textbbox((0, 0), tok, font=f_reg_15)
        draw.text((stub_cx - (tb[2] - tb[0]) // 2, 532), tok, font=f_reg_15, fill=c_emerald_bright)

    # Unique Concert Barcode Strip
    _draw_barcode(draw, stub_cx, 592, 360, 68, f"{team.registration_id}:{tok}")

    foot_txt = "ADMIT TWO  •  DEC 08–09 2026"
    ftb = draw.textbbox((0, 0), foot_txt, font=f_bold_15)
    draw.text((stub_cx - (ftb[2] - ftb[0]) // 2, 684), foot_txt, font=f_bold_15, fill=c_gold)

    # 7. Semicircular Concert Ticket Cutouts + Perforation Line
    notch_r = 30
    draw.ellipse([stub_x - notch_r, ty - notch_r, stub_x + notch_r, ty + notch_r], fill=c_outer, outline=c_emerald, width=3)
    draw.ellipse([stub_x - notch_r, bottom - notch_r, stub_x + notch_r, bottom + notch_r], fill=c_outer, outline=c_emerald, width=3)

    side_r = 22
    mid_y = ty + th // 2
    draw.ellipse([tx - side_r, mid_y - side_r, tx + side_r, mid_y + side_r], fill=c_outer, outline=c_emerald, width=3)
    draw.ellipse([right - side_r, mid_y - side_r, right + side_r, mid_y + side_r], fill=c_outer, outline=c_emerald, width=3)

    # Mask outer bleed cleanly so notch circles stay crisp semicircular bites
    draw.rectangle([0, 0, W, ty - 2], fill=c_outer)
    draw.rectangle([0, bottom + 2, W, H], fill=c_outer)
    draw.rectangle([0, 0, tx - 2, H], fill=c_outer)
    draw.rectangle([right + 2, 0, W, H], fill=c_outer)

    # Dashed gold perforation tear-off line
    _draw_dashed_vline(draw, stub_x, ty + notch_r + 10, bottom - notch_r - 10, dash=12, gap=10, color=c_gold, width=3)

    # Save crisp high-res shareable PNG
    img.convert('RGB').save(png_filepath, format='PNG', optimize=True)


def generate_ticket_for_team(team, send_email=True):
    """
    Idempotently creates a Ticket record and generates a shareable Doomsday
    concert-style PNG ticket with scannable QR code for a confirmed team.
    """
    ticket, created = Ticket.objects.get_or_create(
        team=team,
        defaults={'qr_token': generate_qr_token(), 'ticket_status': 'ACTIVE'}
    )

    tickets_dir = os.path.join(settings.MEDIA_ROOT, 'tickets')
    os.makedirs(tickets_dir, exist_ok=True)

    token_suffix = ticket.qr_token.replace('-', '')[-12:]
    png_filename = f"ticket_{team.registration_id}_{token_suffix}.png"
    png_filepath = os.path.join(tickets_dir, png_filename)

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

    _render_doomsday_concert_ticket_png(
        png_filepath=png_filepath,
        team=team,
        ticket=ticket,
        leader=leader,
        member2=member2,
    )

    # Save relative path (reuses pdf_path column cleanly with zero DB migration)
    relative_path = os.path.relpath(png_filepath, settings.MEDIA_ROOT)
    ticket.pdf_path = relative_path
    ticket.save(update_fields=['pdf_path'])

    # Deliver emails to both team members with the PNG ticket attached
    if send_email:
        send_ticket_email(team, ticket, pdf_path=png_filepath)

    return ticket
