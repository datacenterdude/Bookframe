/// <reference types="@cloudflare/workers-types" />

/**
 * BookFrame Cloudflare Worker API
 * This worker powers the backend for BookFrame's metadata system,
 * handling authors, works, editions, and author/work relationships.
 */

interface Env {
	BOOKFRAME_DB: D1Database;
  }
  
  // --- API Payload Interfaces ---
  
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
  }
  
  // --- Normalization Helper ---
  
  /**
   * normalizeEdition
   * Ensures consistent structure for edition objects before returning to client.
   */
  function normalizeEdition(record: any) {
	return {
	  ...record,
	  abridged: !!record.abridged, // convert 0/1 to true/false
	  narrator: record.narrator ?? null,
	  asin: record.asin ?? null,
	  isbn: record.isbn ?? null,
	};
  }
  
  // --- Main Worker Handler ---
  
  export default {
	async fetch(req: Request, env: Env): Promise<Response> {
	  const url = new URL(req.url);
	  const pathname = url.pathname;
	  const db = env.BOOKFRAME_DB;
  
	  try {
		// ✅ Health Check
		if (req.method === 'GET' && pathname === '/') {
		  return new Response('✅ BookFrame API is live', { status: 200 });
		}
  
		// ✅ Search works by title or author
		if (req.method === 'POST' && pathname === '/search') {
		  const { query } = await req.json() as SearchRequest;
		  const results = await db.prepare(`
			SELECT * FROM works
			WHERE title LIKE ? OR author LIKE ?
			LIMIT 10
		  `).bind(`%${query}%`, `%${query}%`).all();
		  return Response.json(results);
		}
  
		// ✅ Upsert Author
		if (req.method === 'POST' && pathname === '/authors') {
		  const { id, name } = await req.json() as CreateAuthorRequest;
		  const existing = await db.prepare(`SELECT id FROM authors WHERE id = ?`).bind(id).first();
  
		  if (existing) {
			await db.prepare(`UPDATE authors SET name = ? WHERE id = ?`).bind(name, id).run();
			return new Response(JSON.stringify({ status: 'updated', id }), { status: 200 });
		  }
  
		  await db.prepare(`INSERT INTO authors (id, name) VALUES (?, ?)`).bind(id, name).run();
		  return new Response(JSON.stringify({ status: 'created', id }), { status: 201 });
		}
  
		// ✅ Get Author by ID
		if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+$/)) {
		  const id = pathname.split('/')[2];
		  const result = await db.prepare(`SELECT * FROM authors WHERE id = ?`).bind(id).first();
		  return result
			? Response.json(result)
			: new Response('Author not found', { status: 404 });
		}
  
		// ✅ Get all Works by Author
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
  
		// ✅ Get all Editions by Author
		if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+\/editions$/)) {
		  const id = pathname.split('/')[2];
		  const raw = await db.prepare(`
			SELECT e.*, w.title
			FROM editions e
			JOIN works w ON e.work_id = w.id
			JOIN work_authors wa ON w.id = wa.work_id
			WHERE wa.author_id = ?
		  `).bind(id).all();
		  const results = raw.results.map(normalizeEdition);
		  return Response.json(results);
		}
  
		// ✅ Upsert Work
		if (req.method === 'POST' && pathname === '/works') {
		  const { id, title, author, description, cover_url } = await req.json() as CreateWorkRequest;
		  const existing = await db.prepare(`SELECT id FROM works WHERE id = ?`).bind(id).first();
  
		  if (existing) {
			await db.prepare(`
			  UPDATE works
			  SET title = ?, author = ?, description = ?, cover_url = ?
			  WHERE id = ?
			`).bind(title, author, description, cover_url, id).run();
			return new Response(JSON.stringify({ status: 'updated', id }), { status: 200 });
		  }
  
		  await db.prepare(`
			INSERT INTO works (id, title, author, description, cover_url)
			VALUES (?, ?, ?, ?, ?)
		  `).bind(id, title, author, description, cover_url).run();
		  return new Response(JSON.stringify({ status: 'created', id }), { status: 201 });
		}
  
		// ✅ Get Work by ID
		if (req.method === 'GET' && pathname.match(/^\/works\/[^/]+$/)) {
		  const id = pathname.split('/')[2];
		  const result = await db.prepare(`SELECT * FROM works WHERE id = ?`).bind(id).first();
		  return result
			? Response.json(result)
			: new Response('Work not found', { status: 404 });
		}
  
		// ✅ Update Work by ID
		if (req.method === 'PUT' && pathname.match(/^\/works\/[^/]+$/)) {
		  const id = pathname.split('/')[2];
		  const { title, author, description, cover_url } = await req.json() as UpdateWorkRequest;
		  await db.prepare(`
			UPDATE works
			SET title = ?, author = ?, description = ?, cover_url = ?
			WHERE id = ?
		  `).bind(title, author, description, cover_url, id).run();
		  return new Response('Work updated', { status: 200 });
		}
  
		// ✅ Delete Work
		if (req.method === 'DELETE' && pathname.startsWith('/works/')) {
		  const id = pathname.split('/')[2];
		  const result = await db.prepare(`DELETE FROM works WHERE id = ?`).bind(id).run();
		  return result.success && result.meta.changes > 0
			? new Response('Work deleted', { status: 200 })
			: new Response('Work not found', { status: 404 });
		}
  
		// ✅ Get all Editions for a Work
		if (req.method === 'GET' && pathname.match(/^\/works\/[^/]+\/editions$/)) {
		  const workId = pathname.split('/')[2];
		  const raw = await db.prepare(`SELECT * FROM editions WHERE work_id = ?`).bind(workId).all();
		  const results = raw.results.map(normalizeEdition);
		  return Response.json(results);
		}
  
		// ✅ Upsert Edition by ISBN or ASIN
		if (pathname === '/editions' && req.method === 'POST') {
		  const {
			work_id, type, format, isbn, asin, narrator, abridged
		  } = await req.json() as CreateEditionRequest;
  
		  if (!isbn && !asin) {
			return new Response(JSON.stringify({ error: 'ISBN or ASIN is required' }), { status: 400 });
		  }
  
		  const now = new Date().toISOString();
		  const existing = await db.prepare(`
			SELECT id FROM editions
			WHERE (isbn = ? AND ? IS NOT NULL) OR (asin = ? AND ? IS NOT NULL)
		  `).bind(isbn, isbn, asin, asin).first();
  
		  if (existing) {
			await db.prepare(`
			  UPDATE editions
			  SET work_id = ?, type = ?, format = ?, isbn = ?, asin = ?, narrator = ?, abridged = ?, updated_at = ?
			  WHERE id = ?
			`).bind(work_id, type, format, isbn, asin, narrator, abridged, now, existing.id).run();
			return new Response(JSON.stringify({ status: 'updated', id: existing.id }), { status: 200 });
		  }
  
		  const newId = crypto.randomUUID();
		  await db.prepare(`
			INSERT INTO editions (id, work_id, type, format, isbn, asin, narrator, abridged, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		  `).bind(newId, work_id, type, format, isbn, asin, narrator, abridged, now).run();
		  return new Response(JSON.stringify({ status: 'created', id: newId }), { status: 201 });
		}
  
		// ✅ Get Edition by ID
		if (req.method === 'GET' && pathname.match(/^\/editions\/[^/]+$/)) {
		  const id = pathname.split('/')[2];
		  const raw = await db.prepare(`SELECT * FROM editions WHERE id = ?`).bind(id).first();
		  return raw
			? Response.json(normalizeEdition(raw))
			: new Response('Edition not found', { status: 404 });
		}
  
		// ✅ Link Work to Author (many-to-many)
		if (req.method === 'POST' && pathname === '/work-authors') {
		  const { work_id, author_id } = await req.json() as { work_id: string, author_id: string };
		  await db.prepare(`
			INSERT OR IGNORE INTO work_authors (work_id, author_id)
			VALUES (?, ?)
		  `).bind(work_id, author_id).run();
		  return new Response('Linked work to author', { status: 201 });
		}
  
		// ✅ Catch-all for unknown routes
		return new Response('Not found', { status: 404 });
  
	  } catch (err: unknown) {
		return new Response(
		  `❌ Error: ${(err instanceof Error ? err.message : 'Unknown error')}`,
		  { status: 500 }
		);
	  }
	}
  };
  