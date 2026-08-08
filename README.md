# Language Learning MVP

AI-powered language learning application that converts real-world articles into interactive
lessons — vocabulary extraction, comprehension questions, writing prompts, and AI feedback.

Full-stack: an Express + TypeScript API at the repo root and a React + Vite SPA in `frontend/`.

## Features

- 🔐 JWT authentication (bcrypt hashing, 7-day tokens)
- 🤖 Lesson generation via **Claude** (`claude-haiku-4-5`)
- 📚 Automatic vocabulary extraction with translations, shown as inline clickable popovers
- ❓ AI-generated comprehension questions + vocabulary multiple choice
- ✍️ Writing prompts that scale with difficulty (1–3 prompts)
- 💬 Detailed AI feedback: scores, grammar corrections, vocabulary suggestions
- 📊 Lesson history with computed scores
- 💾 Vocabulary saving
- 📝 Per-lesson notes with debounced auto-save

## Tech Stack

**Backend** (repo root)
- Node.js 20+ with TypeScript, Express 5
- PostgreSQL via `pg` — raw SQL, no ORM
- `@anthropic-ai/sdk` for all LLM calls
- `@mozilla/readability` + `jsdom` (pinned to v26 — v27+ is ESM-only) for article extraction
- JWT + bcrypt for auth, `zod` for validation

**Frontend** (`frontend/`)
- React 19 + TypeScript, Vite 5
- Tailwind CSS 3 with a custom palette
- React Query v5, React Router v7, axios

## Getting Started

### Prerequisites

1. PostgreSQL installed and running
2. Node.js v20+
3. An Anthropic API key (https://console.anthropic.com)

### Installation

1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
npm install --prefix frontend
```

3. Set up the PostgreSQL database:
```bash
createdb language_learning
```

4. Apply the schema (there is no migration runner — this is a manual step):
```bash
psql -d language_learning -f database/schema.sql
```

5. Configure environment variables:
```bash
cp .env.example .env
# Edit .env — JWT_SECRET must be at least 32 characters
```

6. Start both servers in separate terminals:
```bash
npm run dev             # API on http://localhost:3001
npm run frontend:dev    # UI  on http://localhost:5173
```

Open http://localhost:5173. Vite proxies `/api` to the backend, so the frontend needs no
configuration of its own.

> The server validates its environment at boot and exits immediately if `DATABASE_URL`,
> `JWT_SECRET`, or `ANTHROPIC_API_KEY` are missing or malformed.

## API Endpoints

All routes except `/health`, `/api/auth/register`, and `/api/auth/login` require an
`Authorization: Bearer <token>` header. Responses are shaped `{ status, data }`.

### Authentication
- `POST /api/auth/register` — Create new account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `PUT /api/auth/language` — Update preferred language

### Lessons
- `POST /api/lessons/create` — Create lesson from article
- `GET /api/lessons` — Get user's lessons (`limit`, `offset`)
- `GET /api/lessons/:id` — Get lesson plus any existing response
- `POST /api/lessons/:id/submit` — Submit lesson responses

### Vocabulary
- `POST /api/vocabulary/save` — Save vocabulary word (upsert)
- `GET /api/vocabulary` — Get saved vocabulary (`language`, `limit`, `offset`)
- `DELETE /api/vocabulary/:id` — Delete vocabulary word

### Notes
- `GET /api/notes` — All notes with lesson metadata
- `GET /api/notes/lesson/:lessonId` — Notes + saved vocabulary for one lesson
- `POST /api/notes` — Create or update the note for a lesson
- `PUT /api/notes/:id` — Update a note
- `DELETE /api/notes/:id` — Delete a note

### Health Check
- `GET /health` — Server status

## Example API Usage

### 1. Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

### 2. Create Lesson
```bash
curl -X POST http://localhost:3001/api/lessons/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "spanish",
    "difficulty": "intermediate",
    "articleText": "Your Spanish article text here (100-10000 characters)..."
  }'
```

Pass `articleUrl` instead of `articleText` to extract from a web page. Field names are
**camelCase** — `articleText` / `articleUrl`.

### 3. Submit Lesson Response
```bash
curl -X POST http://localhost:3001/api/lessons/1/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mcqAnswers": [
      { "questionId": "rc1", "selectedOption": 2 }
    ],
    "shortAnswerResponses": [
      { "questionId": "sa1", "answer": "El artículo trata de..." }
    ],
    "writingResponses": [
      { "promptId": "w1", "response": "Mi respuesta en español..." }
    ]
  }'
```

All three arrays are required (send `[]` if empty). MCQs are graded server-side by
comparison; only short answers and writing are sent to the LLM.

For a full end-to-end smoke test against a running server:
```bash
./test-api.sh
```

## Development Commands

```bash
# Backend (repo root)
npm run dev        # Start API with hot reload (nodemon + ts-node)
npm run build      # Compile TypeScript to dist/
npm start          # Start production server from dist/
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking

# Frontend
npm run frontend:dev     # Start Vite dev server
npm run frontend:build   # Type-check and build
```

`npm test` is not configured — there is no test suite yet.

## Project Structure

```
/
├── src/                # Backend
│   ├── config/         # env.ts (Zod-validated), database.ts (pool + transaction helper)
│   ├── middleware/     # auth.ts, errorHandler.ts
│   ├── routes/         # auth, lessons, vocabulary, notes
│   ├── services/
│   │   ├── auth/       # Registration, login, tokens
│   │   ├── llm/        # llmService.ts, prompts.ts, types.ts
│   │   ├── article/    # URL fetch + HTML extraction
│   │   └── lesson/     # Lesson pipeline + grading
│   ├── types/          # models.ts
│   └── index.ts        # Server entry point
├── frontend/
│   └── src/
│       ├── components/ # lesson/ (input) and results/ (feedback)
│       ├── pages/      # One component per route
│       ├── api/        # axios client + interceptors
│       └── types/      # Frontend types
└── database/
    └── schema.sql      # Full schema — apply manually
```

## How Lesson Generation Works

Creating a lesson makes four Claude calls: vocabulary extraction, question generation, and
writing prompts run in parallel, then vocabulary multiple-choice questions run afterward
because they need the extracted words as input. Everything is stored as JSONB on a single
`lessons` row.

On submission, multiple choice is graded deterministically in code and only short answers
and writing responses are sent to the LLM — this keeps grading free, instant, and immune to
hallucination.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string (must start with `postgresql://`) | Yes |
| JWT_SECRET | Secret for JWT signing (min 32 chars) | Yes |
| ANTHROPIC_API_KEY | Claude API key | Yes |
| PORT | Server port (default: 3001) | No |
| NODE_ENV | `development` \| `production` \| `test` | No |

The frontend requires no environment variables — Vite proxies `/api` in development.

## Known Gaps

- No caching or rate limiting on the AI pipeline — each lesson is four uncached Claude calls
  behind an unthrottled endpoint, with no retry or fallback on malformed model output.
- No test suite; `npm test` is a stub. `./test-api.sh` covers the API path manually.
- Frontend types are hand-mirrored from the backend with nothing enforcing agreement.
- `/lessons/demo` renders a sample lesson but cannot be submitted (`parseInt('demo')` → `NaN`).

## Next Steps

1. Implement a caching layer for LLM responses
2. Add rate limiting to `POST /api/lessons/create`
3. Add retry / graceful degradation for LLM failures
4. Add a test suite (`npm test` is currently a stub)
5. Set up monitoring and error tracking
6. Deploy to production (Railway/Render recommended)
