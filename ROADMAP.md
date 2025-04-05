# 📘 Bookframe Project Roadmap

_Last updated: 2025-04-06_

## ✅ Completed

- ✅ Deployed and configured Cloudflare D1 database
- ✅ Connected D1 database via Cloudflare Worker using `BOOKFRAME_DB` binding
- ✅ Implemented full REST API for `works` table:
  - `GET /` — Health check
  - `POST /search` — Full-text search
  - `POST /works` — Create new work
  - `PUT /works/:id` — Update work
  - `GET /works/:id` — Fetch single work
  - `GET /works/:id/editions` — List all editions for a work
  - `DELETE /works/:id` — Delete work
- ✅ Designed D1 schema for `editions` and their relationship to `works`
- ✅ Implemented full REST API for `editions` table:
  - `POST /editions` — Create edition (UUID-based)
  - `GET /editions/:id` — Fetch single edition
  - `PUT /editions/:id` — Update edition
- ✅ Introduced UUIDs for all internal identifiers (`works`, `authors`, `editions`)
- ✅ Reorganized GitHub repo into monorepo with `bookframe-worker`
- ✅ Updated `wrangler.toml` with D1 database bindings
- ✅ Resolved `BOOKFRAME_DB` runtime binding issues
- ✅ Created and documented `authors` table:
  - `GET /authors/:id` — Fetch single author
  - `GET /authors/:id/works` — Get all works by author
  - `GET /authors/:id/editions` — Get all editions across all works by author
- ✅ README and `roadmap.md` documentation established and maintained

---

## 🚧 In Progress

- 🧪 Evaluate enrichment strategies for metadata (ISBN/ASIN lookup)
- 🛠️ Standardize error handling and validation logic across endpoints
- 🔬 Normalize and validate external IDs using UUID-backed internal mappings

---

## 🧪 Planned Features (v0.2+)

- 🔍 Implement advanced search (title, author, edition filters)
- 📈 Introduce analytics endpoints for usage tracking
- 🔐 Add user authentication (support for public/private endpoints)
- 📦 WASM module for enrichment, ID parsing, or conversion logic
- 🌍 Build public frontend interface (React, Next.js, or Astro)
- 🔄 Support bulk import of works/editions via CSV/JSON
- 📜 Enable Markdown or AI-generated book summaries per work
