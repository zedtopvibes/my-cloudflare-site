// worker/index.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers for frontend
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS request (CORS preflight)
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes
    try {
      // GET /api/tracks - Get all tracks
      if (url.pathname === '/api/tracks' && method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM tracks ORDER BY uploaded_at DESC'
        ).all();
        
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // GET /api/tracks/:id - Get single track
      if (url.pathname.match(/^\/api\/tracks\/\d+$/) && method === 'GET') {
        const id = url.pathname.split('/').pop();
        const track = await env.DB.prepare(
          'SELECT * FROM tracks WHERE id = ?'
        ).bind(id).first();
        
        if (!track) {
          return new Response('Track not found', { status: 404, headers: corsHeaders });
        }
        
        return new Response(JSON.stringify(track), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // POST /api/tracks/:id/play - Increment play count
      if (url.pathname.match(/^\/api\/tracks\/\d+\/play$/) && method === 'POST') {
        const id = url.pathname.split('/').pop();
        await env.DB.prepare(
          'UPDATE tracks SET plays = plays + 1 WHERE id = ?'
        ).bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // POST /api/tracks/:id/download - Increment download count
      if (url.pathname.match(/^\/api\/tracks\/\d+\/download$/) && method === 'POST') {
        const id = url.pathname.split('/').pop();
        await env.DB.prepare(
          'UPDATE tracks SET downloads = downloads + 1 WHERE id = ?'
        ).bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // POST /api/tracks/:id/view - Increment view count
      if (url.pathname.match(/^\/api\/tracks\/\d+\/view$/) && method === 'POST') {
        const id = url.pathname.split('/').pop();
        await env.DB.prepare(
          'UPDATE tracks SET views = views + 1 WHERE id = ?'
        ).bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // GET /api/trending - Get trending tracks (most plays)
      if (url.pathname === '/api/trending' && method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT id, title, artist, plays FROM tracks ORDER BY plays DESC LIMIT 5'
        ).all();
        
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // GET /api/genres/:genre - Get tracks by genre
      if (url.pathname.match(/^\/api\/genres\/[\w-]+$/) && method === 'GET') {
        const genre = url.pathname.split('/').pop();
        const { results } = await env.DB.prepare(
          'SELECT * FROM tracks WHERE genre = ? ORDER BY uploaded_at DESC'
        ).bind(genre).all();
        
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // 404 for unknown routes
      return new Response('Not found', { status: 404, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};