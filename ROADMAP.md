# 📘 Bookframe Project Roadmap

_Last updated: 2025-04-05_

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
- ✅ Reorganized GitHub repo into monorepo with `bookframe-worker`
- ✅ Updated to use `wrangler.toml` with proper database bindings
- ✅ Resolved `BOOKFRAME_DB` runtime binding issue

## 🚧 In Progress

- 🧠 Design D1 schema for `editions` and their relationship to `works`
- 🔧 Add full CRUD API support for `editions` table
- 💬 Ensure API behavior conforms to expected REST semantics (status codes, validation, etc.)

## 🧪 Planned Features (v0.2+)

- 📚 Build `authors` table and associated endpoints
- 🔁 Support linking multiple editions to a single work (`editions -> work_id`)
- 🔍 Implement advanced search (title, author, edition filters)
- 📈 Introduce analytics endpoints for usage tracking
- 🔐 Add user auth layer (optional public/private endpoints)
- 📦 WASM module exploration for metadata enrichment or conversion
- 📜 Markdown-based book summaries or AI-generated synopsis integration
- 🌍 Create a public-facing frontend interface (likely React/Next.js or Astro)
