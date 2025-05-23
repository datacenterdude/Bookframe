/// <reference types="@cloudflare/workers-types" />

/**
 * BookFrame Cloudflare Worker API
 * --------------------------------
 * This Worker serves as the primary API backend for BookFrame's metadata system.
 * It handles creation, updating, and querying of:
 * - Authors
 * - Works (books/audiobooks)
 * - Editions (specific versions/releases of a work)
 * - Work/Author relationships
 * - External ingest tracking
 *
 * It also supports filtered discovery, deduplication logic, and external search fallback (e.g. Google Books).
 */

interface Env {
  BOOKFRAME_DB: D1Database;
}

// ----------------------
// 🔧 Shared Type Definitions
// ----------------------

interface SearchRequest {
  query: string;
}

interface CreateAuthorRequest {
  id: string;
  name: string;
}

interface CreateWorkRequest {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url: string;
}

interface UpdateWorkRequest {
  title: string;
  author: string;
  description: string;
  cover_url: string;
}

interface CreateEditionRequest {
  id: string;
  work_id: string;
  type: string;
  format: string;
  isbn: string;
  asin?: string;
  narrator?: string;
  abridged?: boolean;
  page_count?: number;
  runtime?: string;
  release_date?: string;
  language?: string;
  publisher?: string;
  series_name?: string;
  series_position?: number;
  explicit?: boolean;
  genres?: string;
  tags?: string;
}

// 🔎 Google Books API Response Type
interface GoogleBooksResponse {
  items?: {
    id: string;
    volumeInfo: {
      title: string;
      description?: string;
      publishedDate?: string;
      authors?: string[];
      imageLinks?: { thumbnail?: string };
      industryIdentifiers?: { type: string; identifier: string }[];
    };
  }[];
}

// ----------------------
// 🔧 Utility Functions
// ----------------------

function normalizeEdition(record: any) {
  return {
    ...record,
    abridged: !!record.abridged,
    explicit: !!record.explicit,
    narrator: record.narrator ?? null,
    asin: record.asin ?? null,
    isbn: record.isbn ?? null,
    page_count: record.page_count ? Number(record.page_count) : null,
    series_position: record.series_position ? Number(record.series_position) : null,
    genres: record.genres ? record.genres.split(',').map((s: string) => s.trim()) : [],
    tags: record.tags ? record.tags.split(',').map((s: string) => s.trim()) : [],
    runtime: normalizeRuntime(record.runtime),
    release_date: record.release_date ?? null,
    language: record.language ?? null,
    publisher: record.publisher ?? null,
    series_name: record.series_name ?? null,
  };
}

function normalizeRuntime(runtime: string | null | undefined): string | null {
  if (!runtime) return null;

  const match = runtime.match(/\d{1,2}:\d{2}:\d{2}/);
  if (match) return runtime;

  const seconds = parseInt(runtime);
  if (!isNaN(seconds)) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return runtime;
}

// -----------------------------
// 🚀 Cloudflare Worker Handler
// -----------------------------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const db = env.BOOKFRAME_DB;

    // 🔁 Local memory cache for rate limiting
    const lastSearchTimestamps = new Map<string, number>();

    try {
      // ------------------
      // 🩺 Healthcheck
      // ------------------
      if (req.method === 'GET' && pathname === '/') {
        return new Response('✅ BookFrame API is live', { status: 200 });
      }

      // ------------------------------
      // 🔍 GET /search
      // Search local DB first; fallback to Google Books API if no matches.
      // Results are ingested and cached into local DB for future queries.
      // ------------------------------
      if (req.method === 'GET' && pathname === '/search') {
        const query = url.searchParams.get('q')?.toLowerCase().trim();
        const limit = parseInt(url.searchParams.get('limit') || '10');

        if (!query || query.length < 2) {
          return Response.json({ error: 'Query too short' }, { status: 400 });
        }

        const now = Date.now();
        const last = lastSearchTimestamps.get(query) || 0;
        if (now - last < 60000) {
          return Response.json({ error: 'Rate limited. Try again shortly.' }, { status: 429 });
        }
        lastSearchTimestamps.set(query, now);

        const likeQuery = `%${query}%`;
        const prefixQuery = `${query}%`;

        const localResults = await db.prepare(`
          SELECT * FROM works
          WHERE LOWER(title) LIKE ?
          ORDER BY
            CASE
              WHEN LOWER(title) = ? THEN 1
              WHEN LOWER(title) LIKE ? THEN 2
              ELSE 3
            END
          LIMIT ?
        `).bind(likeQuery, query, prefixQuery, limit).all();

        if (localResults.results.length > 0) {
          return Response.json(localResults.results);
        }

        const external = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
        const json = await external.json() as GoogleBooksResponse;


        if (!json.items || !json.items.length) {
          await db.prepare(`INSERT INTO external_ingests (id, query, source, status, work_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(crypto.randomUUID(), query, 'google_books', 'not_found', null, new Date().toISOString()).run();

          return Response.json({ error: 'No external results found.' }, { status: 404 });
        }

        const book = json.items[0].volumeInfo;
        const externalId = json.items[0].id;
        const authorName = book.authors?.[0] || 'Unknown';
        const title = book.title;
        const description = book.description || null;
        const publishedDate = book.publishedDate || null;
        const isbn = book.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || null;
        const coverUrl = book.imageLinks?.thumbnail || null;

        const authorId = crypto.randomUUID();
        await db.prepare(`INSERT OR IGNORE INTO authors (id, name) VALUES (?, ?)`)
          .bind(authorId, authorName).run();

        const workId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO works (id, title, description, type, published_date, cover_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(workId, title, description, 'book', publishedDate, coverUrl).run();

        await db.prepare(`INSERT OR IGNORE INTO work_authors (work_id, author_id)
          VALUES (?, ?)
        `).bind(workId, authorId).run();

        if (isbn) {
          const editionId = crypto.randomUUID();
          await db.prepare(`
            INSERT INTO editions (id, work_id, type, format, isbn, external_id, cover_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(editionId, workId, 'print', 'unspecified', isbn, externalId, coverUrl).run();
        }

        await db.prepare(`INSERT INTO external_ingests (id, query, source, status, work_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(crypto.randomUUID(), query, 'google_books', 'success', workId, new Date().toISOString()).run();

        const finalResults = await db.prepare(`
          SELECT * FROM works
          WHERE LOWER(title) LIKE ?
          ORDER BY
            CASE
              WHEN LOWER(title) = ? THEN 1
              WHEN LOWER(title) LIKE ? THEN 2
              ELSE 3
            END
          LIMIT ?
        `).bind(`%${query}%`, query, `${query}%`, limit).all();

        return Response.json(finalResults.results);
      }

      // ---------------------------------
      // 📘 GET /works
      // Paginated list of all works ordered by update time
      // ---------------------------------
      if (req.method === 'GET' && pathname === '/works') {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const totalResult = await db.prepare(`SELECT COUNT(*) as count FROM works`).first();
        const works = await db.prepare(`
          SELECT * FROM works
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `).bind(limit, offset).all();

        return Response.json({
          total: totalResult?.count || 0,
          limit,
          offset,
          results: works.results
        });
      }

      // ---------------------------------
      // 📘 GET /works/:id
      // Retrieve a single work by its UUID
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/works\/[^/]+$/)) {
        const id = pathname.split('/')[2];
        const result = await db.prepare(`SELECT * FROM works WHERE id = ?`).bind(id).first();
        return result ? Response.json(result) : new Response('Work not found', { status: 404 });
      }

      // ---------------------------------
      // 📘 POST /works
      // Create or update a work by ID
      // ---------------------------------
      if (req.method === 'POST' && pathname === '/works') {
        const { id, title, author, description, cover_url } = await req.json() as CreateWorkRequest;
        const existing = await db.prepare(`SELECT id FROM works WHERE id = ?`).bind(id).first();

        if (existing) {
          await db.prepare(`
            UPDATE works
            SET title = ?, author = ?, description = ?, cover_url = ?
            WHERE id = ?
          `).bind(title, author, description, cover_url, id).run();
          return Response.json({ status: 'updated', id });
        }

        await db.prepare(`
          INSERT INTO works (id, title, author, description, cover_url)
          VALUES (?, ?, ?, ?, ?)
        `).bind(id, title, author, description, cover_url).run();
        return Response.json({ status: 'created', id }, { status: 201 });
      }

      // ---------------------------------
      // 📘 PUT /works/:id
      // Update a work by ID
      // ---------------------------------
      if (req.method === 'PUT' && pathname.match(/^\/works\/[^/]+$/)) {
        const id = pathname.split('/')[2];
        const { title, author, description, cover_url } = await req.json() as UpdateWorkRequest;

        await db.prepare(`
          UPDATE works
          SET title = ?, author = ?, description = ?, cover_url = ?
          WHERE id = ?
        `).bind(title, author, description, cover_url, id).run();

        return new Response('Work updated');
      }

      // ---------------------------------
      // 🗑 DELETE /works/:id
      // Delete a work by ID
      // ---------------------------------
      if (req.method === 'DELETE' && pathname.startsWith('/works/')) {
        const id = pathname.split('/')[2];
        const result = await db.prepare(`DELETE FROM works WHERE id = ?`).bind(id).run();

        return result.success && result.meta.changes > 0
          ? new Response('Work deleted')
          : new Response('Work not found', { status: 404 });
      }

      // ---------------------------------
      // 🔗 POST /work-authors
      // Link work to author in many-to-many table
      // ---------------------------------
      if (req.method === 'POST' && pathname === '/work-authors') {
        const { work_id, author_id } = await req.json() as { work_id: string, author_id: string };

        await db.prepare(`
          INSERT OR IGNORE INTO work_authors (work_id, author_id)
          VALUES (?, ?)
        `).bind(work_id, author_id).run();

        return new Response('Linked work to author', { status: 201 });
      }

      // ---------------------------------
      // 👤 GET /authors?name=Author+Name
      // Lookup author by exact name
      // ---------------------------------
      if (req.method === 'GET' && pathname === '/authors') {
        const name = url.searchParams.get('name');
        if (!name) return Response.json({ error: 'Name is required.' }, { status: 400 });

        const result = await db.prepare(`SELECT * FROM authors WHERE name = ?`).bind(name).first();
        return result ? Response.json(result) : Response.json({ found: false });
      }

      // ---------------------------------
      // 👤 POST /authors
      // Create or update an author by ID
      // ---------------------------------
      if (req.method === 'POST' && pathname === '/authors') {
        const { id, name } = await req.json() as CreateAuthorRequest;
        const existing = await db.prepare(`SELECT id FROM authors WHERE id = ?`).bind(id).first();

        if (existing) {
          await db.prepare(`UPDATE authors SET name = ? WHERE id = ?`).bind(name, id).run();
          return Response.json({ status: 'updated', id });
        }

        await db.prepare(`INSERT INTO authors (id, name) VALUES (?, ?)`).bind(id, name).run();
        return Response.json({ status: 'created', id }, { status: 201 });
      }

      // ---------------------------------
      // 👤 GET /authors/:id
      // Get author by UUID
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+$/)) {
        const id = pathname.split('/')[2];
        const result = await db.prepare(`SELECT * FROM authors WHERE id = ?`).bind(id).first();
        return result ? Response.json(result) : new Response('Author not found', { status: 404 });
      }

      // ---------------------------------
      // 📚 GET /authors/:id/works
      // Get all works linked to an author
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+\/works$/)) {
        const id = pathname.split('/')[2];
        const result = await db.prepare(`
          SELECT w.*
          FROM works w
          JOIN work_authors wa ON w.id = wa.work_id
          WHERE wa.author_id = ?
        `).bind(id).all();

        return Response.json(result);
      }

      // ---------------------------------
      // 📕 GET /authors/:id/editions
      // Get all editions from all works by a single author (flattened)
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+\/editions$/)) {
        const id = pathname.split('/')[2];
        const raw = await db.prepare(`
          SELECT e.*, w.title
          FROM editions e
          JOIN works w ON e.work_id = w.id
          JOIN work_authors wa ON w.id = wa.work_id
          WHERE wa.author_id = ?
        `).bind(id).all();

        return Response.json(raw.results.map(normalizeEdition));
      }

      // ---------------------------------
      // 📕 GET /editions
      // Paginated list of all editions
      // ---------------------------------
      if (req.method === 'GET' && pathname === '/editions') {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const totalResult = await db.prepare(`SELECT COUNT(*) as count FROM editions`).first();
        const raw = await db.prepare(`
          SELECT * FROM editions
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `).bind(limit, offset).all();

        return Response.json({
          total: totalResult?.count || 0,
          limit,
          offset,
          results: raw.results.map(normalizeEdition),
        });
      }

      // ---------------------------------
      // 📕 GET /works/:id/editions
      // Get all editions tied to a specific work
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/works\/[^/]+\/editions$/)) {
        const workId = pathname.split('/')[2];
        const raw = await db.prepare(`SELECT * FROM editions WHERE work_id = ?`).bind(workId).all();
        return Response.json(raw.results.map(normalizeEdition));
      }

      // ---------------------------------
      // 🔍 GET /editions/lookup
      // Look up edition by ISBN or ASIN
      // ---------------------------------
      if (req.method === 'GET' && pathname === '/editions/lookup') {
        const isbn = url.searchParams.get('isbn');
        const asin = url.searchParams.get('asin');
        if (!isbn && !asin) {
          return Response.json({ error: 'ISBN or ASIN required.' }, { status: 400 });
        }

        const result = await db.prepare(`
          SELECT * FROM editions
          WHERE (isbn = ? AND ? IS NOT NULL) OR (asin = ? AND ? IS NOT NULL)
        `).bind(isbn, isbn, asin, asin).first();

        return result ? Response.json(normalizeEdition(result)) : Response.json({ found: false });
      }

      // ---------------------------------
      // 📕 GET /editions/:id
      // Fetch an edition by UUID
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/editions\/[^/]+$/)) {
        const id = pathname.split('/')[2];
        const raw = await db.prepare(`SELECT * FROM editions WHERE id = ?`).bind(id).first();
        return raw ? Response.json(normalizeEdition(raw)) : new Response('Edition not found', { status: 404 });
      }

      // ---------------------------------
      // 📕 POST /editions
      // Create or update edition (dedupe by ISBN or ASIN)
      // ---------------------------------
      if (req.method === 'POST' && pathname === '/editions') {
        const payload = await req.json();
        const {
          id, work_id, type, format, isbn, asin, narrator, abridged,
          page_count, runtime, release_date, language, publisher,
          series_name, series_position, explicit, genres, tags
        } = payload as CreateEditionRequest;

        if (!work_id || !type || !format || (!isbn && !asin)) {
          return Response.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const existing = await db.prepare(`
          SELECT id FROM editions
          WHERE (isbn = ? AND ? IS NOT NULL) OR (asin = ? AND ? IS NOT NULL)
        `).bind(isbn, isbn, asin, asin).first();

        if (existing) {
          await db.prepare(`
            UPDATE editions
            SET work_id = ?, type = ?, format = ?, isbn = ?, asin = ?, narrator = ?, abridged = ?, 
              page_count = ?, runtime = ?, release_date = ?, language = ?, publisher = ?, 
              series_name = ?, series_position = ?, explicit = ?, genres = ?, tags = ?, updated_at = ?
            WHERE id = ?
          `).bind(
            work_id, type, format, isbn, asin, narrator, abridged,
            page_count, runtime, release_date, language, publisher,
            series_name, series_position, explicit, genres, tags, now,
            existing.id
          ).run();
          return Response.json({ status: 'updated', id: existing.id });
        }

        const newId = id || crypto.randomUUID();
        await db.prepare(`
          INSERT INTO editions (
            id, work_id, type, format, isbn, asin, narrator, abridged, 
            page_count, runtime, release_date, language, publisher, 
            series_name, series_position, explicit, genres, tags, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newId, work_id, type, format, isbn, asin, narrator, abridged,
          page_count, runtime, release_date, language, publisher,
          series_name, series_position, explicit, genres, tags, now
        ).run();
        return Response.json({ status: 'created', id: newId }, { status: 201 });
      }

      // ---------------------------------
      // 📚 GET /works
      // Paginated list of all works
      // ---------------------------------
      if (req.method === 'GET' && pathname === '/works') {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const totalResult = await db.prepare(`SELECT COUNT(*) as count FROM works`).first();
        const works = await db.prepare(`
          SELECT * FROM works
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `).bind(limit, offset).all();

        return Response.json({
          total: totalResult?.count || 0,
          limit,
          offset,
          results: works.results,
        });
      }

      // ---------------------------------
      // 📚 GET /works/:id
      // Retrieve a work by ID
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/works\/[^/]+$/)) {
        const id = pathname.split('/')[2];
        const result = await db.prepare(`SELECT * FROM works WHERE id = ?`).bind(id).first();
        return result ? Response.json(result) : new Response('Work not found', { status: 404 });
      }

      // ---------------------------------
      // 🛠️ POST /works
      // Create or update a work (upsert-style)
      // ---------------------------------
      if (req.method === 'POST' && pathname === '/works') {
        const { id, title, author, description, cover_url } = await req.json() as CreateWorkRequest;
        const existing = await db.prepare(`SELECT id FROM works WHERE id = ?`).bind(id).first();

        if (existing) {
          await db.prepare(`
            UPDATE works
            SET title = ?, author = ?, description = ?, cover_url = ?, updated_at = ?
            WHERE id = ?
          `).bind(title, author, description, cover_url, new Date().toISOString(), id).run();
          return Response.json({ status: 'updated', id });
        }

        await db.prepare(`
          INSERT INTO works (id, title, author, description, cover_url, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(id, title, author, description, cover_url, new Date().toISOString()).run();
        return Response.json({ status: 'created', id }, { status: 201 });
      }

      // ---------------------------------
      // 🛠️ PUT /works/:id
      // Update a work by ID
      // ---------------------------------
      if (req.method === 'PUT' && pathname.match(/^\/works\/[^/]+$/)) {
        const id = pathname.split('/')[2];
        const { title, author, description, cover_url } = await req.json() as UpdateWorkRequest;

        await db.prepare(`
          UPDATE works
          SET title = ?, author = ?, description = ?, cover_url = ?, updated_at = ?
          WHERE id = ?
        `).bind(title, author, description, cover_url, new Date().toISOString(), id).run();

        return new Response('Work updated');
      }

      // ---------------------------------
      // 🗑️ DELETE /works/:id
      // Delete a work by ID
      // ---------------------------------
      if (req.method === 'DELETE' && pathname.startsWith('/works/')) {
        const id = pathname.split('/')[2];
        const result = await db.prepare(`DELETE FROM works WHERE id = ?`).bind(id).run();

        return result.success && result.meta.changes > 0
          ? new Response('Work deleted')
          : new Response('Work not found', { status: 404 });
      }

      // ---------------------------------
      // 👤 GET /authors?name=
      // Lookup author by name
      // ---------------------------------
      if (req.method === 'GET' && pathname === '/authors') {
        const name = url.searchParams.get('name');
        if (!name) return Response.json({ error: 'Name is required.' }, { status: 400 });

        const result = await db.prepare(`SELECT * FROM authors WHERE name = ?`)
          .bind(name).first();

        return result ? Response.json(result) : Response.json({ found: false });
      }

      // ---------------------------------
      // 👤 GET /authors/:id
      // Fetch an author by ID
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+$/)) {
        const id = pathname.split('/')[2];
        const result = await db.prepare(`SELECT * FROM authors WHERE id = ?`).bind(id).first();
        return result ? Response.json(result) : new Response('Author not found', { status: 404 });
      }

      // ---------------------------------
      // 👤 POST /authors
      // Create or update an author (upsert-style)
      // ---------------------------------
      if (req.method === 'POST' && pathname === '/authors') {
        const { id, name } = await req.json() as CreateAuthorRequest;
        const existing = await db.prepare(`SELECT id FROM authors WHERE id = ?`).bind(id).first();

        if (existing) {
          await db.prepare(`UPDATE authors SET name = ? WHERE id = ?`).bind(name, id).run();
          return Response.json({ status: 'updated', id });
        }

        await db.prepare(`INSERT INTO authors (id, name) VALUES (?, ?)`)
          .bind(id, name).run();

        return Response.json({ status: 'created', id }, { status: 201 });
      }

      // ---------------------------------
      // 📚 GET /authors/:id/works
      // Fetch all works associated with an author
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+\/works$/)) {
        const id = pathname.split('/')[2];
        const result = await db.prepare(`
          SELECT w.*
          FROM works w
          JOIN work_authors wa ON w.id = wa.work_id
          WHERE wa.author_id = ?
        `).bind(id).all();

        return Response.json(result);
      }

      // ---------------------------------
      // 📚 GET /authors/:id/editions
      // Flattened list of all editions tied to an author's works
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+\/editions$/)) {
        const id = pathname.split('/')[2];
        const raw = await db.prepare(`
          SELECT e.*, w.title
          FROM editions e
          JOIN works w ON e.work_id = w.id
          JOIN work_authors wa ON w.id = wa.work_id
          WHERE wa.author_id = ?
        `).bind(id).all();

        return Response.json(raw.results.map(normalizeEdition));
      }

      // ---------------------------------
      // 📕 GET /editions
      // Paginated list of all editions
      // ---------------------------------
      if (req.method === 'GET' && pathname === '/editions') {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const totalResult = await db.prepare(`SELECT COUNT(*) as count FROM editions`).first();
        const raw = await db.prepare(`
          SELECT * FROM editions
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `).bind(limit, offset).all();

        return Response.json({
          total: totalResult?.count || 0,
          limit,
          offset,
          results: raw.results.map(normalizeEdition)
        });
      }

      // ---------------------------------
      // 📕 POST /editions
      // Create or update an edition by ISBN/ASIN (dedupes intelligently)
      // ---------------------------------
      if (req.method === 'POST' && pathname === '/editions') {
        const payload = await req.json();
        const {
          id, work_id, type, format, isbn, asin, narrator, abridged,
          page_count, runtime, release_date, language, publisher,
          series_name, series_position, explicit, genres, tags
        } = payload as CreateEditionRequest;

        if (!work_id || !type || !format || (!isbn && !asin)) {
          return Response.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const existing = await db.prepare(`
          SELECT id FROM editions
          WHERE (isbn = ? AND ? IS NOT NULL) OR (asin = ? AND ? IS NOT NULL)
        `).bind(isbn, isbn, asin, asin).first();

        if (existing) {
          await db.prepare(`
            UPDATE editions
            SET work_id = ?, type = ?, format = ?, isbn = ?, asin = ?, narrator = ?, abridged = ?, 
                page_count = ?, runtime = ?, release_date = ?, language = ?, publisher = ?, 
                series_name = ?, series_position = ?, explicit = ?, genres = ?, tags = ?, updated_at = ?
            WHERE id = ?
          `).bind(
            work_id, type, format, isbn, asin, narrator, abridged,
            page_count, runtime, release_date, language, publisher,
            series_name, series_position, explicit, genres, tags, now,
            existing.id
          ).run();

          return Response.json({ status: 'updated', id: existing.id });
        }

        const newId = id || crypto.randomUUID();
        await db.prepare(`
          INSERT INTO editions (
            id, work_id, type, format, isbn, asin, narrator, abridged, 
            page_count, runtime, release_date, language, publisher, 
            series_name, series_position, explicit, genres, tags, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newId, work_id, type, format, isbn, asin, narrator, abridged,
          page_count, runtime, release_date, language, publisher,
          series_name, series_position, explicit, genres, tags, now
        ).run();

        return Response.json({ status: 'created', id: newId }, { status: 201 });
      }

      // ---------------------------------
      // 🔍 GET /editions/lookup
      // Lookup edition by ISBN or ASIN
      // ---------------------------------
      if (req.method === 'GET' && pathname === '/editions/lookup') {
        const isbn = url.searchParams.get('isbn');
        const asin = url.searchParams.get('asin');
        if (!isbn && !asin) return Response.json({ error: 'ISBN or ASIN required.' }, { status: 400 });

        const result = await db.prepare(`
          SELECT * FROM editions
          WHERE (isbn = ? AND ? IS NOT NULL) OR (asin = ? AND ? IS NOT NULL)
        `).bind(isbn, isbn, asin, asin).first();

        return result ? Response.json(normalizeEdition(result)) : Response.json({ found: false });
      }

      // ---------------------------------
      // 📕 GET /editions/:id
      // Lookup an edition by UUID
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/editions\/[^/]+$/)) {
        const id = pathname.split('/')[2];
        const raw = await db.prepare(`SELECT * FROM editions WHERE id = ?`).bind(id).first();
        return raw ? Response.json(normalizeEdition(raw)) : new Response('Edition not found', { status: 404 });
      }

      // ---------------------------------
      // 📕 GET /works/:id/editions
      // All editions for a given work
      // ---------------------------------
      if (req.method === 'GET' && pathname.match(/^\/works\/[^/]+\/editions$/)) {
        const workId = pathname.split('/')[2];
        const raw = await db.prepare(`SELECT * FROM editions WHERE work_id = ?`).bind(workId).all();
        return Response.json(raw.results.map(normalizeEdition));
      }

      // ---------------------------------
      // 🔗 POST /work-authors
      // Link a work to an author (many-to-many)
      // ---------------------------------
      if (req.method === 'POST' && pathname === '/work-authors') {
        const { work_id, author_id } = await req.json() as { work_id: string, author_id: string };
        await db.prepare(`
          INSERT OR IGNORE INTO work_authors (work_id, author_id)
          VALUES (?, ?)
        `).bind(work_id, author_id).run();
        return new Response('Linked work to author', { status: 201 });
      }

      // ------------------------------
      // 🧭 GET /discover/editions
      // Filtered discovery with pagination and sorting
      // ------------------------------
      if (req.method === 'GET' && pathname === '/discover/editions') {
        const searchParams = new URL(req.url).searchParams;

        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          params[key] = value;
        });

        const {
          type, format, language, publisher, series_name,
          explicit, abridged, genres, tags,
          sort = 'release_date',
          order = 'desc',
          limit = '25',
          offset = '0'
        } = params;

        const where: string[] = [];
        const binds: any[] = [];


        if (type) where.push(`type = ?`), binds.push(type);
        if (format) where.push(`format = ?`), binds.push(format);
        if (language) where.push(`language = ?`), binds.push(language);
        if (publisher) where.push(`publisher = ?`), binds.push(publisher);
        if (series_name) where.push(`series_name = ?`), binds.push(series_name);
        if (explicit !== undefined) where.push(`explicit = ?`), binds.push(explicit === 'true' ? 1 : 0);
        if (abridged !== undefined) where.push(`abridged = ?`), binds.push(abridged === 'true' ? 1 : 0);
        if (genres) where.push(`genres LIKE ?`), binds.push(`%${genres}%`);
        if (tags) where.push(`tags LIKE ?`), binds.push(`%${tags}%`);

        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const sortSafe = ['release_date', 'runtime', 'page_count'].includes(sort) ? sort : 'release_date';
        const orderSafe = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const countResult = await db.prepare(`SELECT COUNT(*) as total FROM editions ${whereClause}`).bind(...binds).first();
        const editions = await db.prepare(`
          SELECT * FROM editions ${whereClause}
          ORDER BY ${sortSafe} ${orderSafe}
          LIMIT ? OFFSET ?
        `).bind(...binds, Number(limit), Number(offset)).all();

        return Response.json({
          total: countResult?.total ?? 0,
          limit: Number(limit),
          offset: Number(offset),
          results: editions.results.map(normalizeEdition)
        });
      }

      addEventListener("fetch", (event: FetchEvent) => {
        event.respondWith(handleRequest(event.request));
      });
      
      async function handleRequest(request: Request): Promise<Response> {
        const url = new URL(request.url);
      
      // Return 404 for unrecognized paths
      return new Response("Not Found", { status: 404 });
      }
      
      // ---------------------------------
      // ❌ Fallback Route
      // ---------------------------------
      return new Response('Not found', { status: 404 });

    } catch (err: unknown) {
      return new Response(`❌ Error: ${(err instanceof Error ? err.message : 'Unknown error')}`, {
        status: 500
      });
    }
  }
};

