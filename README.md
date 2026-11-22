# Build Ops — Registration & Management System

A full-stack web application for managing the **Build Ops** hackathon and build event (**December 8th, 5:00 PM – December 9th, 8:00 AM, 2026** | Registration Fee: **INR 500 per team**).

Built with **React + Vite + Tailwind CSS**, **Django + Django REST Framework + Simple JWT**, and **Supabase PostgreSQL**.

---

## Key Features

### Student Journey
- **Sign Up & Email Verification (`apps/accounts`)**: Students register with Full Name, Email, 10-digit Mobile Number, and Password, and verify their email via Resend SMTP before accessing registration.
- **Streamlined Team Registration (`apps/teams`)**: Opens automatically after verification. Team Leader details (Name, Email, Mobile) are auto-filled from the logged-in account; students enter Team Name, College, and Second Member details with strict 10-digit mobile and duplicate-entry validation.
- **Confirm & Pay (`apps/payments`)**: Server-side Cashfree Payment Gateway integration (`POST /pg/orders`, webhook signature verification, idempotent status checks) with a Sandbox checkout mode for testing.
- **Simple Student Dashboard (`apps/tickets`)**: Displays Team Details, Member Details, Payment Status, a live **E-Ticket QR Code preview**, and 1-click **Official PDF E-Ticket** download (generated via ReportLab).

### Admin Control Panel
- **Overview & Metrics**: Live counts for total teams, participants, paid/pending teams, total revenue, and arrivals.
- **Team & Ticket Management**: Search and filter teams, inspect participant details, preview QR passes, download PDF tickets, and resend ticket emails.
- **Users & Accounts Management**: Search/filter all user accounts and permanently delete accounts (with cascading cleanup and self-delete protection).
- **Gate QR Scanner (`apps/attendance`)**: Dedicated compact camera scanner (`html5-qrcode`) + manual Registration ID fallback with duplicate check-in prevention.
- **CSV Reports & Email Logs**: 1-click authenticated CSV exports (Teams, Participants, Payments, Attendance) and email delivery logs with manual retry.

---

## Project Structure

```text
BuildOps/
├── backend/
│   ├── apps/
│   │   ├── accounts/          # Custom User model, JWT auth, email verification, admin user CRUD
│   │   ├── teams/             # Team & TeamMember models, admin stats, CSV exports
│   │   ├── payments/          # Cashfree order creation, webhooks, sandbox simulator
│   │   ├── tickets/           # Secure QR tokens, live QR PNG endpoint, ReportLab PDF tickets
│   │   ├── attendance/        # Gate QR validation, check-in, arrival logs
│   │   ├── certificates/      # Individual ReportLab PDF certificates (admin-triggered)
│   │   └── notifications/     # SMTP email delivery (Resend/Gmail) & EmailLog audit trail
│   ├── buildathon_core/       # Django settings (Supabase Pooler + WhiteNoise), URLs, WSGI
│   ├── manage.py
│   ├── requirements.txt
│   ├── build.sh               # Render build script
│   ├── Procfile               # Gunicorn start command
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── _redirects         # SPA routing fallback (Netlify/Render)
│   ├── src/
│   │   ├── api/client.js      # Axios client with VITE_API_URL & JWT auto-refresh
│   │   ├── context/           # AuthContext
│   │   ├── components/        # Navbar, ProtectedRoute, QRScanner
│   │   ├── pages/             # Home, Login, Register, VerifyEmail, RegisterTeam,
│   │   │                      # StudentDashboard, PaymentStatus, AdminDashboard, AdminScanner
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vercel.json            # SPA routing fallback (Vercel)
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── render.yaml                # Render Blueprint configuration
├── .gitignore
└── README.md
```

---

## Local Development Setup

### 1. Backend (Django)
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1  |  macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill SUPABASE_DB_URL and EMAIL_* credentials in backend/.env
python manage.py migrate
python manage.py create_admin --email admin@buildops.com --name "Build Ops Admin" --password "YourStrongPassword"
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

---

## Production Hosting (Render + Vercel + Supabase)

### Backend on Render
- **Root Directory**: `backend`
- **Build Command**: `./build.sh` (or `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate`)
- **Start Command**: `gunicorn buildathon_core.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 60`
- **Health Check Path**: `/api/health/`
- **Required Env Vars**: `DEBUG=False`, `SECRET_KEY`, `ALLOWED_HOSTS=*`, `SUPABASE_DB_URL`, `FRONTEND_URL`, `BACKEND_URL`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `EMAIL_*`, `CASHFREE_*`.

### Frontend on Vercel
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Env Var**: `VITE_API_URL=https://<your-render-service>.onrender.com/api`
