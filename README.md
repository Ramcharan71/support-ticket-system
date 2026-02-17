# Support Ticket System

A full-stack support ticket management system with AI-powered ticket classification. Users can submit support tickets, browse and filter them, view aggregated metrics, and get automatic category/priority suggestions from an LLM.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.1 + Django REST Framework |
| Database | PostgreSQL 16 |
| Frontend | React 18 (Vite) |
| LLM | Google Gemini 2.0 Flash |
| Infrastructure | Docker + Docker Compose |

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- (Optional) A Google Gemini API key for AI classification

### Run the Application

```bash
# Clone the repository
git clone <repo-url>
cd Clootrack_Assignment

# Set your Gemini API key (optional — app works without it)
export GEMINI_API_KEY=your_api_key_here

# Start all services
docker-compose up --build
```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api/

> **Note:** The app is fully functional without a Gemini API key. The AI classification feature will gracefully degrade — users can manually select category and priority.

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a free API key
3. Set it as an environment variable before running `docker-compose up`:
   ```bash
   export GEMINI_API_KEY=your_key_here
   ```
   Or on Windows PowerShell:
   ```powershell
   $env:GEMINI_API_KEY="your_key_here"
   ```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   React     │────▶│  Django DRF  │────▶│  PostgreSQL    │
│  (Nginx)    │     │  (Gunicorn)  │     │  (Alpine)      │
│  Port 3000  │     │  Port 8000   │     │  Port 5432     │
└─────────────┘     └──────┬───────┘     └────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Google Gemini│
                    │ 2.0 Flash    │
                    └──────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tickets/` | Create a new ticket (returns 201) |
| `GET` | `/api/tickets/` | List all tickets, newest first. Supports `?category=`, `?priority=`, `?status=`, `?search=` |
| `PATCH` | `/api/tickets/<id>/` | Update a ticket (e.g., change status, override category/priority) |
| `GET` | `/api/tickets/stats/` | Aggregated statistics (DB-level aggregation) |
| `POST` | `/api/tickets/classify/` | Send a description, get LLM-suggested category + priority |

### Example: Classify a Ticket

```bash
curl -X POST http://localhost:8000/api/tickets/classify/ \
  -H "Content-Type: application/json" \
  -d '{"description": "I cannot log into my account after changing my password yesterday"}'
```

Response:
```json
{
  "suggested_category": "account",
  "suggested_priority": "high"
}
```

## Design Decisions

### LLM Choice: Google Gemini 2.0 Flash

I chose Google Gemini 2.0 Flash for the following reasons:

1. **Free tier available** — 15 requests/minute, 1M tokens/minute, no cost for development and demo
2. **Structured JSON output** — Supports `response_mime_type="application/json"` in the generation config, which forces the model to return valid JSON. This eliminates the common problem of LLMs wrapping JSON in markdown code fences
3. **Low latency** — Flash models respond in ~0.5-1 second, suitable for the real-time "classify on blur" UX pattern
4. **Good classification accuracy** — For straightforward categorization tasks like support ticket classification, Flash models provide accuracy comparable to larger models

### Database-Level Constraints

All field choices (category, priority, status) are enforced at the PostgreSQL level using `CheckConstraint`, not just at the Django/DRF validation layer. This ensures data integrity even if records are modified outside the application (e.g., via direct SQL or Django shell).

### Stats Endpoint — DB-Level Aggregation

The `/api/tickets/stats/` endpoint uses Django ORM's `aggregate()` and `annotate()` functions exclusively, which translate to SQL `GROUP BY`, `COUNT()`, and `AVG()` operations. No Python-level loops are used for statistical computation.

### Graceful LLM Error Handling

The classify endpoint handles failures at multiple levels:
- **No API key:** Returns a clear message; ticket submission still works
- **Network errors:** Caught and logged; returns 503 with a user-friendly message
- **Invalid LLM output:** Validates returned values against allowed choices; returns None on mismatch
- **Rate limiting:** Caught as a general exception; user can submit tickets manually

### Frontend UX for AI Suggestions

- Classification triggers on `blur` (not every keystroke) to minimize API calls
- Results pre-fill the category/priority dropdowns with an "AI suggested" badge
- If the user manually changes a dropdown, subsequent AI suggestions won't overwrite it
- The form submits successfully regardless of whether classification succeeds

### Prompt Design

The classification prompt (in `backend/tickets/llm.py`) includes:
- Explicit definitions for each category with examples
- Clear priority level guidelines based on impact severity
- Instruction to return exactly two JSON fields
- Low temperature (0.1) for deterministic, consistent classifications

## Project Structure

```
├── backend/
│   ├── config/              # Django project settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── tickets/             # Main app
│   │   ├── models.py        # Ticket model with DB constraints
│   │   ├── serializers.py   # DRF serializers
│   │   ├── views.py         # ViewSet with CRUD, stats, classify
│   │   ├── llm.py           # Gemini integration + prompt
│   │   ├── urls.py          # Router configuration
│   │   └── admin.py         # Django admin registration
│   ├── Dockerfile
│   ├── entrypoint.sh        # Migration + server startup
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/tickets.js   # Axios API client
│   │   ├── components/      # React components
│   │   │   ├── TicketForm.jsx
│   │   │   ├── TicketList.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── hooks/
│   │   │   └── useClassify.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile           # Multi-stage build (Node → Nginx)
│   ├── nginx.conf           # SPA routing + API proxy
│   └── package.json
├── docker-compose.yml
└── README.md
```
