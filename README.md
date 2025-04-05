# 📘 Bookframe

Bookframe is an API-first backend system for cataloging books, audiobooks, and their respective editions. It is built with **Cloudflare Workers**, **Cloudflare D1**, and written in **TypeScript**.

---

## ✨ Features

- Cloudflare Worker-based REST API
- D1 database with schema for `works` and `editions`
- Full CRUD for `works` and `editions`
- Search endpoint with title/author matching
- UUID-backed editions for unique identification
- Clean JSON responses
- GitHub monorepo for future frontend/backend expansion

---

## 📖 Works vs. Editions

Bookframe uses a two-tier model to represent literary content:

### 🧠 `works`
A `work` represents a **conceptual book**, regardless of format. Think of it as the creative intellectual property — the story, characters, and content — independent of how it is published.

**Examples of works:**
- *The Martian* by Andy Weir
- *1984* by George Orwell

### 🧩 `editions`
An `edition` represents a **specific published version** of a work. This includes variations such as:

- Print books (hardcover, paperback, special editions)
- eBooks (Kindle, EPUB, etc.)
- Audiobooks (narrator, abridged/unabridged, ASINs)

Each edition has a **unique internal UUID**, but externally references a public identifier like:

- `ISBN` (for books and eBooks)
- `ASIN` (for audiobooks or Kindle editions)

**Key fields:**
- `id` (internal UUID)
- `work_id` (foreign key to `works`)
- `type` (e.g., book or audiobook)
- `format` (e.g., hardcover, Kindle, Audible)
- `isbn` or `asin`
- `narrator` (optional, for audiobooks)
- `abridged` (boolean, optional)

This separation allows Bookframe to:

- Normalize multiple formats under a single work
- Track metadata per edition
- Support advanced filters and future integrations (e.g., fetch by ISBN)

---

## 🔌 Endpoints

```http
GET /                       # Health check
POST /search               # Full-text search
POST /works                # Create a new work
GET /works/:id             # Fetch single work by ID
PUT /works/:id             # Update a work
DELETE /works/:id          # Delete a work
POST /editions             # Create new edition (linked to a work)
GET /editions/:id          # Fetch an edition by ID
PUT /editions/:id          # Update edition metadata
```

### 🔍 GET /authors/:id/editions
Returns all editions across all works associated with a specific author.

**Example response:**

```json
[
  {
    "edition_id": "c93550ff-213e-4000-b9c9-67005a0abe7f",
    "work_title": "The Martian",
    "type": "print",
    "format": "hardcover",
    "isbn": "9780804139201",
    "asin": null,
    "narrator": null,
    "abridged": null
  },
  ...
]

---

## 🛠️ Local Development

```bash
# Start local dev server
wrangler dev

# Deploy to Cloudflare
wrangler deploy
```

Make sure your `wrangler.toml` has the correct D1 database bindings.

---

## 🧭 Roadmap

See [`roadmap.md`](./roadmap.md) for full roadmap planning and milestones.

---

## 📦 Future Plans

- Author table and relationships
- WASM-powered metadata scrapers
- Metadata ingestion via ISBN/ASIN
- Public frontend using Astro or Next.js
- AI-generated book summaries

---

## 🧠 Inspiration

Born out of frustration with existing book metadata APIs and the desire to build a complete, modern, open backend for book and audiobook discovery.
