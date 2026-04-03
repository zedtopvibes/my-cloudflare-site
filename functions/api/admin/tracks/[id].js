export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const id = params.id;

  // GET - Fetch track with appearances
  if (request.method === 'GET') {
    try {
      // Fetch track details
      const track = await env.DB.prepare(`
        SELECT 
          t.id,
          t.title,
          t.description,
          t.artwork_url,
          t.r2_key,
          t.filename,
          t.duration,
          t.genre,
          t.plays,
          t.downloads,
          t.views,
          t.slug,
          t.uploaded_at,
          t.release_date,
          t.bpm,
          t.explicit,
          t.featured as is_featured,
          t.editor_pick,
          t.status,
          json_group_array(
            json_object(
              'id', a.id,
              'name', a.name,
              'slug', a.slug,
              'is_primary', ta.is_primary,
              'display_order', ta.display_order
            )
            ORDER BY ta.display_order ASC, ta.is_primary DESC
          ) as artists
        FROM tracks t
        LEFT JOIN track_artists ta ON t.id = ta.track_id
        LEFT JOIN artists a ON ta.artist_id = a.id
        WHERE t.id = ? AND t.deleted_at IS NULL
        GROUP BY t.id
      `).bind(id).first();

      if (!track) {
        return new Response(JSON.stringify({ error: 'Track not found' }), { 
          status: 404, 
          headers 
        });
      }

      const artists = track.artists ? JSON.parse(track.artists) : [];
      const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
      
      const trackData = {
        ...track,
        artists: artists,
        artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
        artist_id: primaryArtist ? primaryArtist.id : null,
        artist_slug: primaryArtist ? primaryArtist.slug : null
      };

      // Fetch appearances - Albums containing this track
      const albums = await env.DB.prepare(`
        SELECT 
          a.id,
          a.title,
          a.cover_url,
          ar.name as artist_name,
          at.track_number
        FROM album_tracks at
        JOIN albums a ON at.album_id = a.id
        LEFT JOIN artists ar ON a.artist_id = ar.id
        WHERE at.track_id = ? AND a.deleted_at IS NULL
        ORDER BY at.track_number ASC
      `).bind(id).all();

      // Fetch appearances - EPs containing this track
      const eps = await env.DB.prepare(`
        SELECT 
          e.id,
          e.title,
          e.cover_url,
          ar.name as artist_name,
          et.track_number
        FROM ep_tracks et
        JOIN eps e ON et.ep_id = e.id
        LEFT JOIN artists ar ON e.artist_id = ar.id
        WHERE et.track_id = ? AND e.deleted_at IS NULL
        ORDER BY et.track_number ASC
      `).bind(id).all();

      // Fetch appearances - Playlists containing this track
      const playlists = await env.DB.prepare(`
        SELECT 
          p.id,
          p.name,
          p.cover_url
        FROM playlist_tracks pt
        JOIN playlists p ON pt.playlist_id = p.id
        WHERE pt.track_id = ? AND p.deleted_at IS NULL
        ORDER BY pt.added_at DESC
      `).bind(id).all();

      return new Response(JSON.stringify({
        success: true,
        track: trackData,
        appearances: {
          albums: albums.results || [],
          eps: eps.results || [],
          playlists: playlists.results || []
        }
      }), { headers });

    } catch (error) {
      console.error('Error fetching track:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // PUT - Update track (EXISTING - UNCHANGED)
  if (request.method === 'PUT') {
    try {
      const updates = await request.json();
      
      // Check if track exists and not deleted
      const existing = await env.DB.prepare(
        'SELECT id FROM tracks WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();
      
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Track not found' }), { 
          status: 404, 
          headers 
        });
      }

      // Build dynamic UPDATE query
      const fields = [];
      const values = [];

      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.genre !== undefined) {
        fields.push('genre = ?');
        values.push(updates.genre);
      }
      if (updates.duration !== undefined) {
        fields.push('duration = ?');
        values.push(updates.duration);
      }
      if (updates.release_date !== undefined) {
        fields.push('release_date = ?');
        values.push(updates.release_date);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.artwork_url !== undefined) {
        fields.push('artwork_url = ?');
        values.push(updates.artwork_url);
      }
      if (updates.bpm !== undefined) {
        fields.push('bpm = ?');
        values.push(updates.bpm);
      }
      if (updates.explicit !== undefined) {
        fields.push('explicit = ?');
        values.push(updates.explicit ? 1 : 0);
      }
      if (updates.featured !== undefined) {
        fields.push('featured = ?');
        values.push(updates.featured ? 1 : 0);
      }
      if (updates.editor_pick !== undefined) {
        fields.push('editor_pick = ?');
        values.push(updates.editor_pick ? 1 : 0);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }

      // Handle artist updates if provided
      if (updates.artists !== undefined && Array.isArray(updates.artists)) {
        await env.DB.prepare('DELETE FROM track_artists WHERE track_id = ?').bind(id).run();
        
        for (let i = 0; i < updates.artists.length; i++) {
          const artist = updates.artists[i];
          if (artist.id) {
            await env.DB.prepare(`
              INSERT INTO track_artists (track_id, artist_id, is_primary, display_order)
              VALUES (?, ?, ?, ?)
            `).bind(id, artist.id, artist.is_primary ? 1 : 0, artist.display_order !== undefined ? artist.display_order : i).run();
          }
        }
      }

      if (updates.main_artist_id !== undefined) {
        await env.DB.prepare('DELETE FROM track_artists WHERE track_id = ?').bind(id).run();
        
        await env.DB.prepare(`
          INSERT INTO track_artists (track_id, artist_id, is_primary, display_order)
          VALUES (?, ?, ?, ?)
        `).bind(id, updates.main_artist_id, 1, 0).run();
        
        if (updates.featured_artists_ids && Array.isArray(updates.featured_artists_ids)) {
          for (let i = 0; i < updates.featured_artists_ids.length; i++) {
            if (updates.featured_artists_ids[i]) {
              await env.DB.prepare(`
                INSERT INTO track_artists (track_id, artist_id, is_primary, display_order)
                VALUES (?, ?, ?, ?)
              `).bind(id, updates.featured_artists_ids[i], 0, i + 1).run();
            }
          }
        }
      }

      if (fields.length > 0) {
        values.push(id);
        const query = `UPDATE tracks SET ${fields.join(', ')} WHERE id = ?`;
        await env.DB.prepare(query).bind(...values).run();
      }

      // Fetch updated track with all artist information
      const updated = await env.DB.prepare(`
        SELECT 
          t.id,
          t.title,
          t.description,
          t.artwork_url,
          t.r2_key,
          t.filename,
          t.duration,
          t.genre,
          t.plays,
          t.downloads,
          t.views,
          t.slug,
          t.uploaded_at,
          t.release_date,
          t.bpm,
          t.explicit,
          t.featured as is_featured,
          t.editor_pick,
          t.status,
          json_group_array(
            json_object(
              'id', a.id,
              'name', a.name,
              'slug', a.slug,
              'is_primary', ta.is_primary,
              'display_order', ta.display_order
            )
            ORDER BY ta.display_order ASC, ta.is_primary DESC
          ) as artists
        FROM tracks t
        LEFT JOIN track_artists ta ON t.id = ta.track_id
        LEFT JOIN artists a ON ta.artist_id = a.id
        WHERE t.id = ? AND t.deleted_at IS NULL
        GROUP BY t.id
      `).bind(id).first();

      const artists = updated.artists ? JSON.parse(updated.artists) : [];
      const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
      
      const trackData = {
        ...updated,
        artists: artists,
        artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
        artist_id: primaryArtist ? primaryArtist.id : null,
        artist_slug: primaryArtist ? primaryArtist.slug : null
      };
      
      return new Response(JSON.stringify({ success: true, track: trackData }), { headers });

    } catch (error) {
      console.error('Error updating track:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Soft delete track (EXISTING - UNCHANGED)
  if (request.method === 'DELETE') {
    try {
      // Check if track exists and not already deleted
      const track = await env.DB.prepare(
        'SELECT id FROM tracks WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();
      
      if (!track) {
        return new Response(JSON.stringify({ error: 'Track not found or already deleted' }), { 
          status: 404, 
          headers 
        });
      }
      
      // Soft delete - mark as deleted
      await env.DB.prepare(`
        UPDATE tracks 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(id).run();
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Track moved to trash'
      }), { headers });
      
    } catch (error) {
      console.error('Error deleting track:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
    status: 405, 
    headers 
  });
}