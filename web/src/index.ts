addEventListener('fetch', (event: FetchEvent) => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/") {
        // Adjusted to reference the correct location of index.html
        const html = await fetch("index.html");  // This assumes it's in the root of the worker's assets
        return new Response(html.body, {
            headers: { "Content-Type": "text/html" }
        });
    }
    return new Response("Not Found", { status: 404 });
}
