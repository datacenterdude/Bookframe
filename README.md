# 📚 BookFrame

**BookFrame** is a lightweight metadata API designed to power ebook and audiobook organization — serving as the foundation for a modern alternative to GoodReads and OpenLibrary, built entirely on serverless infrastructure via Cloudflare Workers and D1.

---

## 🚀 Project Goals

BookFrame is focused on:

- 🧠 **Metadata Aggregation**: Combine data from ISBNs (books) and ASINs (audiobooks) into unified "works".
- 🎧 **Dual Format Support**: Treat ebooks and audiobooks as separate editions under one umbrella.
- 🛰️ **Cloud-Native Simplicity**: Lightweight Cloudflare Worker + D1 backend for easy global deployment.
- 🔐 **Privacy & Portability First**: No accounts, no tracking — just fast, flexible, and open.

---

## 📦 API Endpoints

### Health Check
```
GET /
```
> Returns a simple "BookFrame API is live" message.

---

### Search for Works
```
POST /search
```
```json
{
  "query": "The Martian"
}
```

---

### Get a Work by ID
```
GET /works/:id
```

---

### Create a New Work
```
POST /works
```
```json
{
  "id": "1",
  "title": "The Martian",
  "author": "Andy Weir",
  "description": "Six days ago, astronaut Mark Watney became one of the first people to walk on Mars...",
  "cover_url": "https://covers.openlibrary.org/b/isbn/9780804139201-L.jpg"
}
```

---

### Update a Work
```
PUT /works/:id
```

---

### Delete a Work
```
DELETE /works/:id
```

---

## 🛠️ Tech Stack

- **Cloudflare Workers** — Serverless edge execution
- **D1** — SQLite-backed Cloudflare Database
- **TypeScript** — Typed API logic and clean interfaces
- **Open Library (future)** — Source for metadata and cover images
- **GitHub Actions (planned)** — For CI/CD and tests

---

## 📁 Folder Structure

```
Bookframe/
├── bookframe-worker/
│   ├── src/               # Cloudflare Worker source code
│   ├── test/              # Vitest tests (WIP)
│   ├── wrangler.toml      # Worker config & D1 bindings
│   └── tsconfig.json      # TypeScript config
└── README.md
```

---

## 🧪 Getting Started Locally

```bash
# Clone the repo
git clone https://github.com/datacenterdude/Bookframe.git
cd Bookframe/bookframe-worker

# Install dependencies
npm install

# Run locally with Cloudflare D1
npx wrangler dev
```

---

## 📌 Roadmap

- [x] CRUD support for works via D1
- [x] Deployable Cloudflare Worker
- [ ] Open Library integration for ISBN/ASIN resolution
- [ ] WASM module for ISBN validation
- [ ] Web UI frontend (Astro, SvelteKit, or Next.js)
- [ ] Docker container for offline mode (long-term)

---

## 👨‍💻 Author

**Nick Howell**  
[@datacenterdude](https://github.com/datacenterdude)  
Global Field CTO & Builder of Fun Things™

---

## 📜 License

MIT — free for personal and commercial use.

---
