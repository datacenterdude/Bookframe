# Changelog

## [v0.2] - 2025-04-07

This release represents a major update to the BookFrame Cloudflare Worker API. It includes extensive new capabilities for metadata ingest, normalized querying, and developer ergonomics.

---

### ✨ Added

- **Search Endpoint (`GET /search`)**  
  Introduced a search endpoint that queries local `works` by title and falls back to Google Books API if no results are found. If a fallback result is returned, it is automatically ingested into the database, including authors, works, and editions. All fallback attempts are logged in a new `external_ingests` table.

- **Filtered Discovery (`GET /discover/editions`)**  
  Added a flexible discovery endpoint for editions, supporting filters on:
  - `type`, `format`, `language`, `publisher`, `series_name`
  - Booleans: `abridged`, `explicit`
  - Fuzzy search via `genres` and `tags`
  - Pagination: `limit` / `offset`
  - Sorting: by `release_date`, `runtime`, or `page_count` (asc/desc)

- **Edition Metadata Fields**  
  Editions now support a rich set of metadata:
  - `runtime`, `page_count`, `release_date`
  - `publisher`, `language`, `series_name`, `series_position`
  - `explicit`, `abridged`, `genres`, and `tags`
  All fields are normalized (e.g., runtime → `HH:MM:SS`, genres/tags → arrays).

- **Author Routes**
  - `GET /authors?name=` — Lookup author by exact name.
  - `GET /authors/:id/works` — Retrieve all works by a specific author.
  - `GET /authors/:id/editions` — Retrieve a flattened list of all editions by a specific author.

---

### 🛠️ Changed

- **Documentation & Code Cleanup**
  - Every section of the codebase was refactored and documented with developer-friendly comments and route-level summaries.
  - All utility functions (e.g., `normalizeEdition`, `normalizeRuntime`) are centralized for reusability and clarity.

- **Updated Search Ranking Logic**
  - Search results are now ranked with custom logic:
    - Exact title match = rank 1
    - Prefix match = rank 2
    - Fuzzy match = rank 3

- **Search Rate Limiting**
  - Added in-memory query-based rate limiting (60-second cooldown per query) to reduce unnecessary external API hits.

---

### 🐛 Fixed

- **JSON Response Handling**
  - Replaced unsafe `await external.json()` with fallback-safe parsing to prevent crashes due to malformed external responses.

- **Duplicate Route Blocks**
  - Removed duplicate logic blocks for `/search` and `/works` that previously caused inconsistencies.

- **TypeScript Errors**
  - Addressed all outstanding type errors and standardized all query param parsing using `Record<string, string>` with fallback guards.

---

## [v0.1] - Initial Release

- Base implementation of the BookFrame API
- Support for authors, works, editions, and many-to-many linking
