# ManufactureFlow — AI-Powered Workflow Automation System

> A production-grade manufacturing operations platform that digitizes handwritten and semi-structured work order documents using OCR + LLM extraction, human-in-the-loop review, business validation, and operational analytics.

---

## Screenshots

| Dashboard | Upload | Review Queue |
|-----------|--------|--------------|
| _(dark ops dashboard with KPI cards and charts)_ | _(drag-drop uploader with file preview)_ | _(paginated review table with confidence indicators)_ |

| Document Detail | Analytics | Search & History |
|-----------------|-----------|-----------------|
| _(OCR preview + editable review form)_ | _(full analytics with bar/pie/trend charts)_ | _(filter/search + CSV export)_ |

---

## Features

- **Document Upload** — drag-and-drop, multi-file, real-time preview, upload history
- **OCR Pipeline** — Tesseract.js server-side extraction with confidence scoring
- **AI Extraction** — LLM-powered structured field extraction (swappable provider)
- **Per-Field Confidence** — every field has value + confidence + source with visual indicators
- **Human Review** — editable form, inline validation, approve/reject/save-draft workflow
- **Validation Engine** — 20+ modular rules: required fields, format checks, range limits, duplicate detection, date validation
- **Validation Override** — reviewers can override issues with a required reason note
- **Audit Trail** — immutable event log for every action on every document
- **Analytics Dashboard** — KPIs, weekly trend, shift/machine production charts, validation breakdown
- **Search & History** — filter by status/shift/machine/work order with CSV export
- **Demo Mode** — works fully without an API key using heuristic extraction

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | TailwindCSS + shadcn/ui design tokens |
| Charts | Recharts |
| Database | SQLite (dev) / PostgreSQL (prod) via Prisma ORM |
| OCR | Tesseract.js (server-side) |
| AI/LLM | OpenAI-compatible — supports OpenAI, Groq, Anthropic, OpenRouter |
| File Upload | Next.js FormData + local filesystem |
| Notifications | Sonner toast |
| Deployment | Vercel-ready |

---

## Quick Start

### 1. Install dependencies

```bash
cd manufacturing-workflow
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="file:./dev.db"
AI_PROVIDER="openai"          # openai | groq | anthropic | openrouter
OPENAI_API_KEY="sk-..."       # or GROQ_API_KEY / ANTHROPIC_API_KEY / OPENROUTER_API_KEY
OPENAI_MODEL="gpt-4o-mini"
```

> **No API key?** Leave the key blank — the system uses **Demo Mode** (heuristic extraction) automatically.

### 3. Setup database

```bash
npm run db:generate     # generate Prisma client
npm run db:push         # create SQLite schema
npm run db:seed         # seed 25 realistic sample documents
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Prisma connection string |
| `AI_PROVIDER` | ✅ | `openai` \| `groq` \| `anthropic` \| `openrouter` |
| `OPENAI_API_KEY` | ⚠️ | Required if AI_PROVIDER=openai |
| `OPENAI_MODEL` | ❌ | Default: `gpt-4o-mini` |
| `GROQ_API_KEY` | ⚠️ | Required if AI_PROVIDER=groq |
| `GROQ_MODEL` | ❌ | Default: `llama-3.1-8b-instant` |
| `ANTHROPIC_API_KEY` | ⚠️ | Required if AI_PROVIDER=anthropic |
| `OPENROUTER_API_KEY` | ⚠️ | Required if AI_PROVIDER=openrouter |
| `NEXT_PUBLIC_MAX_FILE_SIZE_MB` | ❌ | Default: `10` |
| `UPLOAD_DIR` | ❌ | Default: `./public/uploads` |

---

## Project Structure

```
manufacturing-workflow/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── layout.tsx                  # Root layout + sidebar
│   ├── globals.css                 # Design system CSS
│   ├── upload/page.tsx             # Upload page
│   ├── review/page.tsx             # Review queue
│   ├── documents/[id]/page.tsx     # Document detail + review
│   ├── analytics/page.tsx          # Analytics page
│   ├── history/page.tsx            # Search & history
│   └── api/
│       ├── documents/route.ts      # GET (list) + POST (upload)
│       ├── documents/[id]/route.ts # GET + PUT + DELETE
│       ├── extract/[id]/route.ts   # POST — OCR + AI pipeline
│       └── analytics/route.ts      # GET analytics summary
├── components/
│   ├── layout/Sidebar.tsx
│   ├── dashboard/                  # DashboardStats, WeeklyTrendChart, ShiftChart, MachineChart, RecentActivity
│   ├── upload/FileUploader.tsx
│   ├── review/ReviewForm.tsx
│   ├── history/HistoryClient.tsx
│   └── shared/                     # StatusBadge, ConfidenceIndicator, Skeleton
├── lib/
│   ├── prisma.ts                   # Singleton Prisma client
│   ├── types.ts                    # All TypeScript types
│   ├── utils.ts                    # Shared utilities
│   └── services/
│       ├── ocr.ts                  # Tesseract.js wrapper
│       ├── extraction.ts           # LLM extraction (multi-provider)
│       ├── validation.ts           # Rule engine (20+ rules)
│       └── analytics.ts            # DB analytics queries
└── prisma/
    ├── schema.prisma               # DB schema
    └── seed.ts                     # 25 sample records
```

---

## Architecture Overview

```
Upload → /api/documents POST
           ↓
        File saved to /public/uploads
        Document record created (status: uploaded)
           ↓
Extract → /api/extract/[id] POST
           ↓ Step 1: OCR
        Tesseract.js extracts raw text
           ↓ Step 2: LLM Extraction
        OpenAI-compatible API → structured JSON + confidence scores
           ↓ Step 3: Validation
        Rule engine runs 20+ checks
           ↓
        ExtractedRecord saved, ValidationIssues saved
        Status → extracted | needs_review
           ↓
Review → /documents/[id]
           ↓
        Human edits fields, overrides issues
        Actions: save_review | approve | reject
           ↓
        AuditLog updated, status finalised
```

---

## Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| required_date | error | Date is mandatory |
| required_shift | error | Shift is mandatory |
| required_machine | error | Machine number is mandatory |
| required_work_order | error | Work order is mandatory |
| required_quantity | error | Quantity is mandatory |
| required_time | error | Time taken is mandatory |
| invalid_shift | error | Must be A, B, C, or Night |
| invalid_machine_format | warning | Expected MC-XXX format |
| invalid_work_order_format | warning | Expected WO-XXXXX format |
| negative_quantity | error | Quantity must be positive |
| zero_time | error | Time must be > 0 |
| excessive_time | warning | >24 hours is suspicious |
| quantity_spike | warning | 3× above machine average |
| low_quantity | info | <5 units is unusual |
| invalid_date | error | Unparseable date string |
| future_date | warning | Date is in the future |
| old_date | info | >90 days ago |
| duplicate_work_order | error | Same WO already exists |

---

## Deployment (Vercel)

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/you/repo.git && git push

# 2. Connect to Vercel
# vercel.com → Import Project → set env vars

# 3. Swap to PostgreSQL
# DATABASE_URL="postgresql://user:pass@host:5432/db"
# npm run db:push  (runs on build)

# 4. File storage
# For production use Vercel Blob or S3 instead of local filesystem
```

### PostgreSQL swap

In `prisma/schema.prisma`:
```diff
datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
}
```

---

## Assumptions & Tradeoffs

| Decision | Rationale |
|----------|-----------|
| SQLite default | Zero-config local dev; trivially swappable to PostgreSQL |
| Demo mode | App is fully functional without an API key for demo purposes |
| Tesseract.js server-side | Avoids WASM in browser, better for Node processing |
| Local file storage | Simplest for MVP; production should use S3/Vercel Blob |
| OpenAI-compatible interface | Single fetch-based client works for all providers |
| confidence threshold 0.65 | Below this = low confidence warning shown in UI |
| SQLite no concurrent writes | Fine for demo; PostgreSQL handles production load |

---

## License

MIT — Built as an internship assignment MVP.
