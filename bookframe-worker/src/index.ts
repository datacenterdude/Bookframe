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
  
  export default {
	async fetch(req: Request, env: Env): Promise<Response> {
	  const url = new URL(req.url);
	  const pathname = url.pathname;
	  const db = env.BOOKFRAME_DB;
  
	  try {
		// GET /
		if (req.method === 'GET' && pathname === '/') {
		  return new Response('✅ BookFrame API is live', { status: 200 });
		}
  
		// POST /search
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
  
		// POST /works
		if (req.method === 'POST' && pathname === '/works') {
		  const { id, title, author, description, cover_url } = await req.json() as CreateWorkRequest;
		  await db.prepare(`
			INSERT INTO works (id, title, author, description, cover_url)
			VALUES (?, ?, ?, ?, ?)
		  `).bind(id, title, author, description, cover_url).run();
		  return new Response('Work created', { status: 201 });
		}
  
		// PUT /works/:id
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
  
		// GET /works/:id
		if (req.method === 'GET' && pathname.startsWith('/works/')) {
		  const id = pathname.split('/')[2];
		  if (!id) return new Response('Work ID not provided', { status: 400 });
  
		  const result = await db.prepare('SELECT * FROM works WHERE id = ?')
			.bind(id)
			.first();
  
		  if (!result) {
			return new Response('Work not found', { status: 404 });
		  }
  
		  return new Response(JSON.stringify(result), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		  });
		}
  
		// DELETE /works/:id
		if (req.method === 'DELETE' && pathname.startsWith('/works/')) {
		  const id = pathname.split('/')[2];
		  if (!id) return new Response('Work ID not provided', { status: 400 });
  
		  const result = await db.prepare('DELETE FROM works WHERE id = ?')
			.bind(id)
			.run();
  
		  if (result.success && result.meta.changes > 0) {
			return new Response('Work deleted', { status: 200 });
		  } else {
			return new Response('Work not found', { status: 404 });
		  }
		}
  
		// Fallback for unknown route
		return new Response('Not found', { status: 404 });
  
	  } catch (err: unknown) {
		if (err instanceof Error) {
		  return new Response(`❌ Error: ${err.message}`, { status: 500 });
		}
		return new Response('❌ Unknown error', { status: 500 });
	  }
	}
  };
  