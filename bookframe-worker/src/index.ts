/// <reference types="@cloudflare/workers-types" />

interface Env {
	BOOKFRAME_DB: D1Database;
  }
  
  interface SearchRequest {
	query: string;
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
  
  export default {
	async fetch(req: Request, env: Env): Promise<Response> {
	  const url = new URL(req.url);
	  const pathname = url.pathname;
	  const db = env.BOOKFRAME_DB;
  
	  try {
		if (req.method === 'GET' && pathname === '/') {
		  return new Response('✅ BookFrame API is live', { status: 200 });
		}
  
		if (req.method === 'POST' && pathname === '/search') {
		  const { query } = await req.json() as SearchRequest;
		  const stmt = db.prepare(`
			SELECT * FROM works
			WHERE title LIKE ? OR author LIKE ?
			LIMIT 10
		  `);
		  const results = await stmt.bind(`%${query}%`, `%${query}%`).all();
		  return Response.json(results);
		}
  
		if (req.method === 'POST' && pathname === '/works') {
		  const { id, title, author, description, cover_url } = await req.json() as CreateWorkRequest;
		  await db.prepare(`
			INSERT INTO works (id, title, author, description, cover_url)
			VALUES (?, ?, ?, ?, ?)
		  `).bind(id, title, author, description, cover_url).run();
		  return new Response('Work created', { status: 201 });
		}
  
		const updateMatch = pathname.match(/^\/works\/([^/]+)$/);
		if (req.method === 'PUT' && updateMatch) {
		  const id = updateMatch[1];
		  const { title, author, description, cover_url } = await req.json() as UpdateWorkRequest;
		  await db.prepare(`
			UPDATE works
			SET title = ?, author = ?, description = ?, cover_url = ?
			WHERE id = ?
		  `).bind(title, author, description, cover_url, id).run();
		  return new Response('Work updated', { status: 200 });
		}
  
		if (req.method === 'GET' && pathname.match(/^\/works\/[^/]+$/)) {
		  const id = pathname.split('/')[2];
		  const stmt = db.prepare('SELECT * FROM works WHERE id = ?');
		  const result = await stmt.bind(id).first();
		  if (!result) return new Response('Work not found', { status: 404 });
		  return Response.json(result);
		}
  
		if (req.method === 'DELETE' && pathname.startsWith('/works/')) {
		  const id = pathname.split('/')[2];
		  const result = await db.prepare('DELETE FROM works WHERE id = ?').bind(id).run();
		  return result.success && result.meta.changes > 0
			? new Response('Work deleted', { status: 200 })
			: new Response('Work not found', { status: 404 });
		}
  
		if (req.method === 'GET' && pathname.match(/^\/works\/[^/]+\/editions$/)) {
		  const workId = pathname.split('/')[2];
		  const stmt = db.prepare(`
			SELECT e.id, e.type, e.format, e.isbn, e.asin, e.narrator, e.abridged
			FROM editions e
			WHERE e.work_id = ?
		  `);
		  const results = await stmt.bind(workId).all();
		  return Response.json(results);
		}
  
		if (req.method === 'POST' && pathname === '/editions') {
		  const { id, work_id, type, format, isbn, asin, narrator, abridged } = await req.json() as CreateEditionRequest;
		  await db.prepare(`
			INSERT INTO editions (id, work_id, type, format, isbn, asin, narrator, abridged)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		  `).bind(id, work_id, type, format, isbn, asin ?? null, narrator ?? null, abridged ?? null).run();
		  return new Response('Edition created', { status: 201 });
		}
  
		if (req.method === 'GET' && pathname.startsWith('/editions/')) {
		  const id = pathname.split('/')[2];
		  const stmt = db.prepare('SELECT * FROM editions WHERE id = ?');
		  const result = await stmt.bind(id).first();
		  return result
			? Response.json(result)
			: new Response('Edition not found', { status: 404 });
		}
  
		if (req.method === 'PUT' && pathname.startsWith('/editions/')) {
		  const id = pathname.split('/')[2];
		  const { type, format, isbn, asin, narrator, abridged } = await req.json() as Partial<CreateEditionRequest>;
		  const stmt = db.prepare(`
			UPDATE editions
			SET type = ?, format = ?, isbn = ?, asin = ?, narrator = ?, abridged = ?
			WHERE id = ?
		  `);
		  await stmt.bind(type ?? null, format ?? null, isbn ?? null, asin ?? null, narrator ?? null, abridged ?? null, id).run();
		  return new Response('Edition updated', { status: 200 });
		}
  
		if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+$/)) {
		  const id = pathname.split('/')[2];
		  const stmt = db.prepare('SELECT * FROM authors WHERE id = ?');
		  const result = await stmt.bind(id).first();
		  return result
			? Response.json(result)
			: new Response('Author not found', { status: 404 });
		}
  
		if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+\/works$/)) {
		  const authorId = pathname.split('/')[2];
		  const stmt = db.prepare(`
			SELECT w.*
			FROM works w
			JOIN work_authors wa ON w.id = wa.work_id
			WHERE wa.author_id = ?
		  `);
		  const results = await stmt.bind(authorId).all();
		  return Response.json(results);
		}
  
		// ✅ GET /authors/:id/editions — All editions for all works by a specific author
		if (req.method === 'GET' && pathname.match(/^\/authors\/[^/]+\/editions$/)) {
		  const authorId = pathname.split('/')[2];
		  const stmt = db.prepare(`
			SELECT
			  e.id AS edition_id,
			  w.title AS work_title,
			  e.type,
			  e.format,
			  e.isbn,
			  e.asin,
			  e.narrator,
			  e.abridged
			FROM editions e
			JOIN works w ON e.work_id = w.id
			JOIN work_authors wa ON w.id = wa.work_id
			WHERE wa.author_id = ?
		  `);
		  const results = await stmt.bind(authorId).all();
		  return Response.json(results);
		}
  
		return new Response('Not found', { status: 404 });
	  } catch (err: unknown) {
		return new Response(
		  `❌ Error: ${(err instanceof Error ? err.message : 'Unknown error')}`,
		  { status: 500 }
		);
	  }
	}
  };
  