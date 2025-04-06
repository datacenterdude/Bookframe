# 📘 BookFrame

**BookFrame** is a modern, API-first backend for organizing and exploring books, audiobooks, and their many editions. Designed for flexibility, speed, and developer ergonomics, it uses **Cloudflare Workers** and **D1** to deliver a blazing-fast metadata layer — ideal for personal libraries, publishers, or community-powered catalogs.

---

## ⚙️ Tech Stack

- 🧠 **TypeScript** – Fully typed end-to-end
- ☁️ **Cloudflare Workers** – Global edge deployment
- 🗃️ **D1 (SQLite)** – Lightweight relational DB on Cloudflare
- 🔌 **RESTful API** – Structured endpoints with clear conventions
- 🧪 **Wrangler** – Local development and deployment tooling

---

## ✨ Features

- 🔄 Full CRUD for authors, works, and editions
- 🔗 Normalized relationships between authors, works, and editions
- 🔍 Search support for title and author queries
- 🔁 Upsert logic for editions based on ISBN/ASIN
- 📚 Edition-level granularity for formats and narrators
- 🔐 UUID-based identifiers with graceful external metadata linking
- 🌍 Deploys anywhere Cloudflare reaches

---

## 🧠 Data Model

BookFrame models the literary world with a clean, three-layer system:

### 🧑‍💼 `authors`
An `author` is the canonical creator entity. Works are linked to authors via a many-to-many relationship.

### 📖 `works`
A `work` is the conceptual book — the intellectual property. A single work can have many editions.

**Examples:**
- *The Martian* by Andy Weir
- *1984* by George Orwell

### 🧩 `editions`
An `edition` is a specific published format of a work — hardcover, Kindle, Audible, etc.

Each edition:
- Is tied to a `work`
- Can have a unique `isbn` (books) or `asin` (audiobooks)
- May include format-specific fields like `narrator` or `abridged`

---

## 📌 API Overview

```http
# ✅ Health
GET    /                         → Check service status

# ✅ Search
POST   /search                   → Search works by title or author

# ✅ Authors
POST   /authors                  → Create or update an author
GET    /authors/:id              → Get author details
GET    /authors/:id/works        → All works by an author
GET    /authors/:id/editions     → All editions across all author’s works

# ✅ Works
POST   /works                    → Create or update a work
GET    /works/:id                → Get work metadata
PUT    /works/:id                → Update work metadata
DELETE /works/:id                → Delete a work
GET    /works/:id/editions       → List editions for a work

# ✅ Editions
POST   /editions                 → Upsert an edition (by ISBN or ASIN)
GET    /editions/:id             → Fetch single edition by ID

# ✅ Relationships
POST   /work-authors             → Link work ↔ author (many-to-many)
```

---

## 🔍 Example Response: `/authors/:id/editions`

```json
[
  {
    "id": "c93550ff-213e-4000-b9c9-67005a0abe7f",
    "title": "The Martian",
    "type": "print",
    "format": "hardcover",
    "isbn": "9780804139201",
    "asin": null,
    "narrator": null,
    "abridged": false,
    "updated_at": "2025-04-06T04:12:19.123Z"
  }
]
```

---

## 🛠️ Local Development

```bash
# Start local dev server
wrangler dev

# Deploy to Cloudflare
wrangler deploy
```

Ensure your `wrangler.toml` is correctly bound to your D1 database:

```toml
[[d1_databases]]
binding = "BOOKFRAME_DB"
database_name = "bookframe-db"
database_id = "xxxx-xxxx-xxxx"
```

---

## 🔭 Roadmap Preview

See [`roadmap.md`](./roadmap.md) for detailed milestone tracking.

- ✅ Normalize schema for authors/works/editions
- ✅ Implement upsert logic for editions
- ✅ Support full read/write lifecycle for all entities
- 🔜 Metadata ingestion via Google Books and OpenLibrary
- 🔜 Public frontend with Astro/Next.js
- 🔜 AI-powered summaries, tagging, and themes

---

## 💬 Why BookFrame?

Most book APIs are either closed, inconsistent, or limited. BookFrame was born out of a need for a **modern, reliable, and open system** that can:

- Ingest books from anywhere
- Normalize data for multi-format discovery
- Stay updated automatically
- Scale with the community

Built by readers. For readers. Powered by Cloudflare.
