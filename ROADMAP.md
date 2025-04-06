# BookFrame Project Roadmap

_Last updated: 2025-04-06_

---

## ✅ Completed Milestones

### Backend & Infrastructure
- [x] Cloudflare D1 database configured and bound via `BOOKFRAME_DB`
- [x] Deployed API via Cloudflare Workers (TypeScript + Wrangler)
- [x] Full monorepo structure established with `bookframe-worker` subdirectory
- [x] `wrangler.toml` updated with correct D1 bindings and deploy targets

### Core Database Schema
- [x] `works` table created and operational
- [x] `editions` table created with foreign key linkage to `works`
- [x] `authors` table implemented
- [x] `work_authors` many-to-many relationship table added

### API Endpoints
- [x] `GET /` — Health check
- [x] `POST /search` — Title or author full-text search
- [x] Full CRUD support for:
  - `works`
    - `POST /works`
    - `GET /works/:id`
    - `PUT /works/:id`
    - `DELETE /works/:id`
    - `GET /works/:id/editions`
  - `editions`
    - `POST /editions` with upsert (ISBN/ASIN)
    - `GET /editions/:id`
    - `PUT /editions/:id` (optional)
  - `authors`
    - `POST /authors` with upsert support
    - `GET /authors/:id`
    - `GET /authors/:id/works`
    - `GET /authors/:id/editions`
  - `work-authors`
    - `POST /work-authors` to link works and authors

### Core Features
- [x] UUIDs used for all internal records (`works`, `editions`, `authors`)
- [x] `updated_at` timestamps introduced for all upsert records
- [x] Intelligent upsert logic for editions based on ISBN/ASIN uniqueness
- [x] Normalized external metadata to ensure single source of truth
- [x] Swagger-style endpoint documentation embedded in code
- [x] Fully updated and documented `README.md` for developer onboarding

---

## 🚧 In Progress

### Stability & Optimization
- [ ] Evaluate robust enrichment pipeline using Google Books API (fallback: OpenLibrary)
- [ ] Implement consistent error handling and response schemas
- [ ] Normalize ingestion payloads across all endpoints
- [ ] Plan for tokenized access control (Cloudflare Access or JWT-based)

---

## 🔜 Future Milestones

### Ingestion & Enrichment (v0.2+)
- [ ] Scheduled enrichment jobs for metadata refresh (ISBN/ASIN)
- [ ] AI-generated summaries, character maps, themes, tags per work
- [ ] Bulk import via CSV or JSON upload
- [ ] Automated deduplication on ingestion with fuzzy matching logic

### Developer & Frontend Expansion (v0.3+)
- [ ] Advanced filtering: type, format, abridged, narrator
- [ ] Build public-facing frontend (Astro, React, or Next.js)
- [ ] Analytics for edition popularity, search trends, enrichment deltas
- [ ] API pagination and sorting options (limit, offset, order_by)

### Platform Engineering & Ecosystem (v0.4+)
- [ ] User accounts, saved libraries, private collections
- [ ] WASM-powered ISBN/ASIN validation or conversion helpers
- [ ] Smart search with AI-assisted intent recognition
- [ ] Community-driven metadata submission (moderated)

---

## 🧭 Long-Term Vision

BookFrame aims to become the **canonical, open, and continuously enriched source of truth** for all things books — across print, digital, and audio. Our goal is to unify metadata, empower community contributions, and enable discovery and automation at global scale.
