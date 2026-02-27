# KYC Demo System

A mobile-first identity verification system with admin dashboard and token-based user flows.

## Tech Stack
- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Auth, Database, Storage)
- **Tesseract.js** (OCR)
- **face-api.js** (Face detection & matching)
- **Tailwind CSS** (Styling)
- **Vercel** (Deployment)

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Redirects to /admin/login
│   ├── globals.css             # Global styles
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx      # Admin login
│   │   └── dashboard/page.tsx  # Admin dashboard
│   ├── kyc/
│   │   └── verify/page.tsx     # KYC user flow
│   └── api/
│       ├── admin/
│       │   └── generate-link/route.ts
│       └── kyc/
│           ├── validate-token/route.ts
│           ├── upload/route.ts
│           └── submit/route.ts
├── components/
│   └── kyc/
│       ├── types.ts
│       ├── StepIndicator.tsx
│       ├── ErrorScreen.tsx
│       ├── IntroStep.tsx
│       ├── DocumentSelectStep.tsx
│       ├── DocumentUploadStep.tsx
│       ├── OcrConfirmStep.tsx
│       ├── SelfieStep.tsx
│       ├── FaceMatchStep.tsx
│       └── CompleteStep.tsx
├── lib/
│   └── supabase/
│       ├── client.ts           # Browser client
│       ├── server.ts           # Server client (with cookies)
│       └── admin.ts            # Service role client
├── middleware.ts               # Auth middleware for /admin routes
└── types/index.ts              # TypeScript types
```

---

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account

### 2. Clone & Install

```bash
git clone <your-repo>
cd kyc-demo
npm install
```

### 3. Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New Project
2. Navigate to **SQL Editor**
3. Paste and run the contents of `supabase-schema.sql`
4. Go to **Storage** → verify the `kyc-documents` bucket was created
   - If not, create it manually as **Public bucket**

### 4. Create Admin User

In Supabase Dashboard:
1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter email + password (this will be your admin login)

### 5. Environment Variables

Create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

Fill in your values:

```env
# From Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Your app URL (use http://localhost:3000 for local dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ **Never** commit `.env.local`. The service role key is sensitive.

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage

### Admin Flow
1. Go to `/admin/login`
2. Sign in with your Supabase user credentials
3. On the dashboard, expand **Generate KYC Link**
4. Enter user's first name, last name, email
5. Click **Generate Secure Link**
6. Copy the generated link and send to the user

### User Flow
1. User opens the link: `/kyc/verify?token=<TOKEN>`
2. Token is validated server-side (single-use, 7-day expiry)
3. User progresses through steps:
   - **Intro** — sees their pre-filled details
   - **Document Select** — chooses country + document type
   - **Document Upload** — uploads front (and back if required)
   - **OCR Confirm** — reviews extracted data, can edit
   - **Selfie + Liveness** — blink detection, then capture selfie
   - **Face Match** — AI compares document face vs selfie
   - **Complete** — submission confirmed

---

## Database Schema

### `kyc_requests`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| token | TEXT | Unique 64-char hex token |
| first_name | TEXT | Admin-entered first name |
| last_name | TEXT | Admin-entered last name |
| email | TEXT | Admin-entered email |
| status | TEXT | pending / in_progress / completed / failed / expired |
| expires_at | TIMESTAMPTZ | 7 days after creation |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### `verification_records`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| kyc_request_id | UUID | FK → kyc_requests.id |
| document_front_url | TEXT | Storage URL |
| document_back_url | TEXT | Storage URL (null for passport) |
| selfie_url | TEXT | Storage URL |
| face_match_score | FLOAT | Euclidean distance (lower = better match) |
| verification_status | TEXT | pending / approved / rejected |
| ocr_data_json | JSONB | { name, dob, document_number, raw_text } |
| document_type | TEXT | id_card / driver_license / passport |
| country | TEXT | Country of issue |

---

## Deployment to Vercel

### Method 1: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

When prompted, configure:
- Framework: Next.js
- Root directory: ./

### Method 2: GitHub Integration

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Add environment variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL  ← set this to your Vercel URL
```

5. Deploy

> After deploying, update `NEXT_PUBLIC_APP_URL` to your production URL (e.g., `https://kyc-demo.vercel.app`)

---

## Security Notes

- **Tokens** are 64-char cryptographically random hex strings (256-bit entropy)
- Tokens are **single-use** — marked completed after submission
- Tokens **expire** after 7 days
- Token validation happens **server-side** via API route
- File uploads use the **service role** client (restricted to server)
- Admin routes are protected by **Supabase Auth middleware**
- Environment variables with secrets use `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix)

---

## Face Match Threshold

The system uses a Euclidean distance threshold of **0.6**:
- Distance < 0.6 → `approved` (faces match)
- Distance ≥ 0.6 → `rejected` (faces don't match, flagged for manual review)

You can adjust this in `/src/app/api/kyc/submit/route.ts`.

---

## Known Limitations (Learning Project)

- face-api.js models are loaded from CDN (may be slow on first use)
- OCR accuracy depends on document image quality
- No email notifications implemented
- No real compliance checks
- No document expiry validation
