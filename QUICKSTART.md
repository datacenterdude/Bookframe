# 🚀 BookFrame API Quickstart

Welcome to the BookFrame API! This guide helps developers quickly interact with the API for searching, discovering, and managing metadata for books and audiobooks.

---

## 🌐 Base URL

https://api.bookframe.org

---

## 🔍 Search Works by Title

Performs a local DB search, and if no matches are found, falls back to Google Books and automatically ingests the result.

```
GET /search?q=the+firm
```

**Optional query params:**

| Param   | Type   | Description                               |
|---------|--------|-------------------------------------------|
| `q`     | string | Required search term (min 2 characters)   |
| `limit` | number | Max results to return (default: 10)       |

---

## 🧭 Discover Editions (Filtered + Paginated)

Flexible discovery and filtering across the editions catalog.

```
GET /discover/editions
```

**Supported query filters:**

| Filter         | Type     | Notes                                      |
|----------------|----------|--------------------------------------------|
| `type`         | string   | e.g. `print`, `audiobook`                  |
| `format`       | string   | Custom-defined format (e.g. `mp3`, `pdf`)  |
| `language`     | string   | ISO 639-1 code (e.g. `en`, `es`)           |
| `publisher`    | string   | Publisher name                             |
| `series_name`  | string   | Series title                               |
| `explicit`     | boolean  | `true` or `false`                          |
| `abridged`     | boolean  | `true` or `false`                          |
| `genres`       | string   | Partial match                              |
| `tags`         | string   | Partial match                              |
| `sort`         | string   | `release_date`, `runtime`, `page_count`    |
| `order`        | string   | `asc` or `desc` (default: `desc`)          |
| `limit`        | number   | Max results per page (default: 25)         |
| `offset`       | number   | Results offset (default: 0)                |

---

## 👤 Authors

### Lookup by name

```
GET /authors?name=John+Grisham
```

### Create or update

```
POST /authors
```

```json
{
  "id": "uuid",
  "name": "John Grisham"
}
```

---

## 📘 Works

### Get paginated works list

```
GET /works?limit=20&offset=0
```

### Create or update a work

```
POST /works
```

```json
{
  "id": "uuid",
  "title": "The Firm",
  "author": "John Grisham",
  "description": "Legal thriller novel...",
  "cover_url": "https://example.com/cover.jpg"
}
```

### Get work by ID

```
GET /works/{id}
```

### Update work by ID

```
PUT /works/{id}
```

### Delete work by ID

```
DELETE /works/{id}
```

---

## 📕 Editions

### Create or update edition (deduplicates by ISBN/ASIN)

```
POST /editions
```

```json
{
  "id": "uuid",
  "work_id": "work-uuid",
  "type": "print",
  "format": "hardcover",
  "isbn": "9781234567890",
  "language": "en",
  "release_date": "1991-03-01",
  "page_count": 432,
  "genres": "thriller,legal",
  "tags": "fiction,bestseller"
}
```

### Lookup by ISBN/ASIN

```
GET /editions/lookup?isbn=9781234567890
```

### Get editions for a work

```
GET /works/{id}/editions
```

### Get all editions (paginated)

```
GET /editions?limit=25&offset=0
```

### Get edition by ID

```
GET /editions/{id}
```

---

## 🔗 Relationships

### Link work to author

```
POST /work-authors
```

```json
{
  "work_id": "work-uuid",
  "author_id": "author-uuid"
}
```

---

## 📦 External Ingest Tracking

Automatically logs when external sources (like Google Books) are queried.

```
GET /search?q=some+title
```

If found externally and ingested, entries are added to:

```
TABLE: external_ingests
```

Fields:
- `query`, `source`, `status`, `work_id`, `created_at`

---

## 🩺 Health Check

```
GET /
```

Returns `✅ BookFrame API is live` if the service is running.

---

## 💬 Need Help?

Open an issue in the GitHub repo for support, collaboration, or to contribute improvements.

---

Happy building! 🚀
