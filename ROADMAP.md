# 📘 Bookframe Project Roadmap

_Last updated: 2025-04-06_

## ✅ Completed

- ✅ Deployed and configured Cloudflare D1 database
- ✅ Connected D1 database via Cloudflare Worker using `BOOKFRAME_DB` binding
- ✅ Implemented full REST API for `works` table:
  - `GET /` - Health check
  - `POST /search` - Full text search
  - `POST /works` - Create new work
  - `PUT /works/:id` - Update work
  - `GET /works/:id` - Fetch single work
  - `DELETE /works/:id` - Delete work
- ✅ Designed D1 schema for `editions` and relationship to `works`
- ✅ Implemented full REST API for `editions` table:
  - `POST /editions` - Create edition (with UUID and validation)
  - `GET /editions/:id` - Fetch single edition
  - `PUT /editions/:id` - Update edition
  - `GET /works/:id/editions` - List all editions for a work
- ✅ Reorganized GitHub repo into monorepo with `bookframe-worker`
- ✅ Updated to use `wrangler.toml` with proper database bindings
- ✅ Resolved `BOOKFRAME_DB` runtime binding issue
- ✅ README and `roadmap.md` documentation added

## 🚧 In Progress

- 🧪 Evaluate enrichment strategies for metadata (ISBN, ASIN lookup)
- 🛠️ Standardize error handling and validation logic
- 🔬 Consider normalization helpers (e.g., WASM for ID parsing)

## 🧪 Planned Features (v0.2+)

- 📚 Build `authors` table and associated endpoints
- 🔍 Implement advanced search (title, author, edition filters)
- 📈 Introduce analytics endpoints for usage tracking
- 🔐 Add user auth layer (optional public/private endpoints)
- 📦 WASM module exploration for metadata enrichment or conversion
- 🌍 Create a public-facing frontend interface (likely React/Next.js or Astro)
- 🔄 Enable batch import of books via CSV/JSON
- 📜 Markdown-based book summaries or AI-generated synopsis integration
