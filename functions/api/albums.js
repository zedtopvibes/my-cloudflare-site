export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only run this logic for the homepage
    if (url.pathname === "/") {
      try {
        // 1. Get Data from D1
        const { results } = await env.DB.prepare(`
          SELECT a.title, a.cover_url, ar.name as artist
          FROM albums a
          LEFT JOIN artists ar ON a.artist_id = ar.id
          WHERE a.deleted_at IS NULL AND a.status = 'published'
          ORDER BY a.created_at DESC
          LIMIT 10
        `).all();

        // 2. Get the static HTML file
        const response = await env.ASSETS.fetch(request);

        // 3. Use HTMLRewriter to inject the script tag
        return new HTMLRewriter()
          .on("head", {
            element(el) {
              el.append(
                `<script>window.__INITIAL_DATA__ = ${JSON.stringify(results)};</script>`,
                { html: true }
              );
            },
          })
          .transform(response);
          
      } catch (err) {
        // If DB fails, just serve the plain HTML
        return env.ASSETS.fetch(request);
      }
    }

    // Otherwise, serve assets normally
    return env.ASSETS.fetch(request);
  },
};
