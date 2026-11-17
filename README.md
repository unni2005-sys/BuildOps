# Build Ops - Registration & Management System

A complete, production-ready full-stack web application for managing the **Build Ops** hackathon and build event (December 8th, 5:00 PM – December 9th, 9:00 PM, 2026). The system supports student registration in teams of two, online payment integration with Cashfree, digital ticket generation with embedded QR codes, automated email delivery, student dashboards, an admin management suite, camera-based QR attendance tracking, and automatic individual participation certificate generation using ReportLab.

---

## 1. System Architecture & Features

### Core Modules
- **Authentication & Roles (`apps/accounts`)**:
  - Separate Student and Admin authentication using Django REST Framework and Simple JWT.
  - Student registration with email verification token. Unverified students cannot sign in.
  - Strict admin access control: Admins cannot register publicly; accounts are provisioned exclusively via management commands.
- **Team Management (`apps/teams`)**:
  - Strict 2-member team requirement (Leader + Member 2).
  - Enforces duplicate prevention: each student email and phone number can belong to only one active team.
  - Generates unique registration IDs (e.g. `BUILD-A8F29C`).
- **Payment Processing (`apps/payments`)**:
  - Cashfree Payment Gateway server-side integration (`POST /pg/orders`, webhook signature verification, `GET /pg/orders/{order_id}`).
  - Idempotent payment verification: never trusts client responses; updates payment & registration status on verified gateway response.
  - Includes a built-in sandbox payment simulator for local testing without live credit cards.
- **E-Ticket & QR Generation (`apps/tickets`)**:
  - One unique digital ticket per team with cryptographically secure random QR token (`TKT-...`).
  - Professional PDF ticket generation using **ReportLab** with embedded QR code, team details, and event guidelines.
  - Automated transactional email delivery to both team members with ticket PDF attached.
- **QR Gate Attendance (`apps/attendance`)**:
  - Dedicated QR camera scanner page built with `html5-qrcode`.
  - Scans ticket QR or accepts manual Registration ID lookup.
  - Checks payment and registration confirmation.
  - Idempotent check-in: logs admin ID and arrival timestamp, marks team as `ARRIVED`.
  - Duplicate prevention: displays clear **"Already Arrived"** warning if scanned again.
- **Certificate Generation (`apps/certificates`)**:
  - Automatically triggers generation of two individual participation certificates when a team is marked as arrived.
  - High-resolution landscape PDF generated with **ReportLab** featuring participant name, team name, college, date, and unique certificate ID (`CERT-2026-...`).
  - Available immediately in individual student dashboards.
- **Admin Suite & Reporting**:
  - Aggregated metrics: Total teams, Total participants, Paid teams, Pending teams, Total revenue, Arrived teams, Not yet arrived teams.
  - Real-time search and filtering by payment and attendance status.
  - 1-click CSV export for Teams, Participants, Payments, and Attendance logs.
  - Email delivery logs with manual retry triggers.

---

## 2. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router DOM, Axios, `html5-qrcode`, Lucide icons.
- **Backend**: Python 3.14 / 3.12+, Django 6 / 5, Django REST Framework, Simple JWT, ReportLab, `qrcode[pil]`, Pillow, Requests, `python-dotenv`.
- **Database**: Supabase PostgreSQL (via `psycopg3` & `dj-database-url`), with local SQLite fallback for offline zero-configuration testing.

---

## 3. Directory Layout

```
Build Ops/
├── backend/
│   ├── apps/
│   │   ├── accounts/         # Users, JWT auth, email verification, permissions
│   │   ├── teams/            # Teams, members, admin metrics, CSV reports
│   │   ├── payments/         # Cashfree integration, orders, webhooks
│   │   ├── tickets/          # QR tokens, ReportLab PDF tickets
│   │   ├── attendance/       # QR validation, check-in, arrival logs
│   │   ├── certificates/     # Individual ReportLab PDF certificates
│   │   └── notifications/    # Transactional email services, delivery logs
│   ├── buildathon_core/      # Settings, URL routing, WSGI/ASGI
│   ├── media/                # Storage for generated tickets and certificates
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/client.js     # Axios instance with JWT interceptors
│   │   ├── context/          # AuthContext (user, tokens, roles)
│   │   ├── components/       # Navbar, ProtectedRoute, QRScanner
│   │   ├── pages/            # Home, Login, Register, VerifyEmail, Dashboard, Admin, Scanner
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js        # Vite config with backend API proxy
└── README.md
```

---

## 4. Setup & Running Instructions

### Prerequisites
- Python 3.10+ (Python 3.14 supported)
- Node.js 18+ and npm

### Backend Setup
1. Open a terminal in `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows PowerShell:
   py -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `backend/.env`:
   - Supabase PostgreSQL: Set `SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require`
   - If left blank, the backend automatically defaults to local SQLite (`db.sqlite3`).
5. Run migrations:
   ```bash
   python manage.py migrate
   ```
6. Seed demo accounts and test teams:
   ```bash
   python manage.py seed_demo
   ```
7. Start the backend server:
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```

### Frontend Setup
1. Open a terminal in `frontend/`:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser at: `http://localhost:5173`

---

## 5. Demo Accounts

The database comes pre-seeded with accounts for all roles:

| Role | Email | Password | Status / Scenario |
|---|---|---|---|
| **Admin** | `admin@buildops.org` | `Admin@123456` | Full administrative control, QR scanner, reports |
| **Student (Leader)** | `arjun@alpha.com` | `Student@123` | Team "Neural Ninjas" (Paid & Confirmed, Ready for QR check-in) |
| **Student (Member)** | `sneha@alpha.com` | `Student@123` | Member 2 of Team "Neural Ninjas" |
| **Student (Arrived)** | `vikram@beta.com` | `Student@123` | Team "Cyber Voyagers" (Arrived; Participation Certificate unlocked) |
| **Student (Pending)** | `kiran@gamma.com` | `Student@123` | Team "Algo Architects" (Pending payment) |

---

## 6. Running Tests

To run the automated backend test suite covering the entire registration, verification, duplicate prevention, payment simulation, ticket generation, check-in, duplicate prevention, and certificate download flow:

```bash
cd backend
python manage.py test apps
```

All integration tests execute against the test database and verify the end-to-end lifecycle.
