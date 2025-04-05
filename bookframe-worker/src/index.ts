/// <reference types="@cloudflare/workers-types" />

interface Env {
	BOOKFRAME_DB: D1Database;
}

// Interfaces
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

			// WORKS ROUTES ---------------------------

			// POST /works
			if (req.method === 'POST' && pathname === '/works') {
				const { id, title, author, description, cover_url } = await req.json() as CreateWorkRequest;
				await db.prepare(`
					INSERT INTO works (id, title, author, description, cover_url)
					VALUES (?, ?, ?, ?, ?)
				`).bind(id, title, author, description, cover_url).run();
				return new Response('Work created', { status: 201 });
			}

			// GET /works/:id
			if (req.method === 'GET' && pathname.startsWith('/works/')) {
				const id = pathname.split('/')[2];
				if (!id) return new Response('Work ID not provided', { status: 400 });

				const stmt = db.prepare('SELECT * FROM works WHERE id = ?');
				const result = await stmt.bind(id).first();

				if (!result) return new Response('Work not found', { status: 404 });

				return Response.json(result);
			}

			// PUT /works/:id
			if (req.method === 'PUT' && pathname.startsWith('/works/')) {
				const id = pathname.split('/')[2];
				if (!id) return new Response('Work ID not provided', { status: 400 });

				const { title, author, description, cover_url } = await req.json() as UpdateWorkRequest;
				await db.prepare(`
					UPDATE works
					SET title = ?, author = ?, description = ?, cover_url = ?
					WHERE id = ?
				`).bind(title, author, description, cover_url, id).run();
				return new Response('Work updated', { status: 200 });
			}

			// DELETE /works/:id
			if (req.method === 'DELETE' && pathname.startsWith('/works/')) {
				const id = pathname.split('/')[2];
				if (!id) return new Response('Work ID not provided', { status: 400 });

				const result = await db.prepare('DELETE FROM works WHERE id = ?').bind(id).run();

				if (result.success && result.meta.changes > 0) {
					return new Response('Work deleted', { status: 200 });
				} else {
					return new Response('Work not found', { status: 404 });
				}
			}

			// EDITIONS ROUTES ---------------------------

			// POST /editions
			if (req.method === 'POST' && pathname === '/editions') {
				const { id, work_id, type, format, isbn } = await req.json() as CreateEditionRequest;
				await db.prepare(`
					INSERT INTO editions (id, work_id, type, format, isbn)
					VALUES (?, ?, ?, ?, ?)
				`).bind(id, work_id, type, format, isbn).run();
				return new Response('Edition created', { status: 201 });
			}

			// GET /editions/:id
			if (req.method === 'GET' && pathname.startsWith('/editions/')) {
				const id = pathname.split('/')[2];
				if (!id) return new Response('Edition ID not provided', { status: 400 });

				const stmt = db.prepare('SELECT * FROM editions WHERE id = ?');
				const result = await stmt.bind(id).first();

				if (!result) return new Response('Edition not found', { status: 404 });

				return Response.json(result);
			}

			// PUT /editions/:id
			if (req.method === 'PUT' && pathname.startsWith('/editions/')) {
				const id = pathname.split('/')[2];
				if (!id) return new Response('Edition ID not provided', { status: 400 });

				const {
					type,
					format,
					isbn,
					asin,
					narrator,
					abridged,
				} = await req.json() as Partial<CreateEditionRequest>;

				await db.prepare(`
					UPDATE editions
					SET type = ?, format = ?, isbn = ?, asin = ?, narrator = ?, abridged = ?
					WHERE id = ?
				`).bind(
					type ?? null,
					format ?? null,
					isbn ?? null,
					asin ?? null,
					narrator ?? null,
					abridged ?? null,
					id
				).run();

				// Optional: return updated record
				const updated = await db.prepare('SELECT * FROM editions WHERE id = ?').bind(id).first();
				return Response.json(updated);
			}

			// Default fallback
			return new Response('Not found', { status: 404 });

		} catch (err: unknown) {
			if (err instanceof Error) {
				return new Response(`❌ Error: ${err.message}`, { status: 500 });
			}
			return new Response('❌ Unknown error', { status: 500 });
		}
	}
};
