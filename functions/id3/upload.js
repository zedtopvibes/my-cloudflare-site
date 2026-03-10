/**
 * ID3 WORKER FOR PAGES FUNCTIONS - API ONLY
 * 
 * Handles:
 * - POST /upload - Process MP3 with ID3 tags and watermark
 * - GET /download/* - Serve branded MP3 files
 * 
 * @version 2.0.0
 * @author Zedtopvibes.Com
 */

const SITENAME = "Zedtopvibes.Com";
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB for watermark
const SUPPORTED_GENRES = [
  'Podcast', 'Music', 'Hip-Hop', 'Rock', 'Pop', 
  'Electronic', 'Jazz', 'Classical', 'Audiobook', 'Other'
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  // Handle OPTIONS request for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  // --- DOWNLOAD ROUTE ---
  if (url.pathname.startsWith('/download/')) {
    try {
      const filename = decodeURIComponent(url.pathname.split('/').pop());
      
      // Security: Prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return new Response('Invalid filename', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const object = await env.recycle.get(filename);
      
      if (!object) {
        return new Response('File Not Found', { 
          status: 404, 
          headers: corsHeaders 
        });
      }

      // Create response with proper headers
      const headers = new Headers({
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
        "Content-Length": object.size,
        "Cache-Control": "public, max-age=3600",
      });

      return new Response(object.body, { headers });

    } catch (err) {
      return new Response('Download failed: ' + err.message, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  // --- UPLOAD ROUTE ---
  if (request.method === 'POST' && url.pathname === '/upload') {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      
      // Validate file presence
      if (!file || !(file instanceof File)) {
        throw new Error('No file uploaded');
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      // Validate file type
      const isValidType = file.type.includes('audio/mpeg') || 
                         file.type.includes('audio/mp3') || 
                         file.name.toLowerCase().endsWith('.mp3');
      
      if (!isValidType) {
        throw new Error('File must be an MP3 audio file');
      }

      // =====================================================
      // 📝 Get form data from your upload form
      // =====================================================
      const customFilename = formData.get('customFilename') || '';
      const rawArtist = sanitizeInput(formData.get('artist') || 'Various Artists');
      const rawTitle = sanitizeInput(formData.get('title') || 'Untitled Track');
      const rawAlbum = sanitizeInput(formData.get('album') || 'Zedtopvibes Compilation');
      const rawYear = sanitizeYear(formData.get('year') || new Date().getFullYear().toString());
      const rawGenre = sanitizeGenre(formData.get('genre') || 'Music');
      const rawTrack = sanitizeTrack(formData.get('track') || '1');
      const duration = sanitizeDuration(formData.get('duration') || '');

      // Branded metadata (adds site name)
      const taggedTitle = `${rawTitle} (${SITENAME})`;
      const taggedArtist = `${rawArtist} | ${SITENAME}`;
      const taggedAlbum = rawAlbum;
      const taggedComment = `🎵 Discover your next favorite track at ${SITENAME}`;

      // Read file buffer
      const fileBuffer = await file.arrayBuffer();
      
      // Strip existing ID3 tags
      const cleanBuffer = stripExistingID3(fileBuffer);
      
      // Get and validate watermark from R2
      let coverBuffer = null;
      try {
        const watermark = await env.recycle.get('watermark.jpg');
        if (watermark) {
          coverBuffer = await watermark.arrayBuffer();
          if (coverBuffer.byteLength < 100 || coverBuffer.byteLength > MAX_COVER_SIZE) {
            console.warn('Invalid watermark size, skipping');
            coverBuffer = null;
          }
        }
      } catch (err) {
        console.warn('Watermark not found:', err.message);
      }

      // Create complete ID3 tags
      const taggedMp3 = createCompleteID3Tags(cleanBuffer, {
        artist: taggedArtist,
        title: taggedTitle,
        album: taggedAlbum,
        year: rawYear,
        genre: rawGenre,
        track: rawTrack,
        comment: taggedComment,
        duration: duration,
        encoder: `${SITENAME} Uploader`,
        publisher: SITENAME,
        copyright: `${new Date().getFullYear()} ${SITENAME}`,
        cover: coverBuffer
      });

      // Create filename
      let filename;
      if (customFilename && customFilename.trim() !== '') {
        const cleanCustom = cleanWithSpaces(customFilename).substring(0, 100);
        filename = `${cleanCustom} (${SITENAME}).mp3`;
      } else {
        const cleanArtist = cleanWithSpaces(rawArtist).substring(0, 30);
        const cleanTitle = cleanWithSpaces(rawTitle).substring(0, 50);
        filename = `${cleanArtist} - ${cleanTitle} (${SITENAME}).mp3`;
      }

      // Upload to R2 with metadata
      await env.recycle.put(filename, taggedMp3, {
        httpMetadata: { 
          contentType: 'audio/mpeg',
          contentDisposition: `attachment; filename="${filename}"`
        },
        customMetadata: {
          uploader: SITENAME,
          uploadDate: new Date().toISOString(),
          originalTitle: rawTitle,
          originalArtist: rawArtist,
          originalAlbum: rawAlbum,
          genre: rawGenre,
          year: rawYear,
          version: '2.0.0'
        }
      });

      // Generate download URL
      const downloadUrl = `/download/${encodeURIComponent(filename)}`;

      // Return success response (JSON only - NO HTML)
      return new Response(JSON.stringify({ 
        success: true, 
        filename,
        url: downloadUrl,
        size: file.size,
        duration: duration,
        metadata: {
          title: taggedTitle,
          artist: taggedArtist,
          album: taggedAlbum,
          year: rawYear,
          genre: rawGenre
        }
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

    } catch (err) {
      const status = err.message.includes('too large') ? 413 : 
                    err.message.includes('MP3') ? 415 : 500;
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: err.message 
      }), { 
        status: status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      });
    }
  }

  // For any other routes, return 404
  return new Response('Not found', { 
    status: 404, 
    headers: corsHeaders 
  });
}

// ============================================================================
// HELPER FUNCTIONS (All unchanged from original)
// ============================================================================

/**
 * Input Sanitization Functions
 */
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, 200);
}

function sanitizeYear(year) {
  const y = parseInt(year);
  if (isNaN(y) || y < 1900 || y > 2100) {
    return new Date().getFullYear().toString();
  }
  return y.toString();
}

function sanitizeGenre(genre) {
  return SUPPORTED_GENRES.includes(genre) ? genre : 'Music';
}

function sanitizeTrack(track) {
  const trackStr = track.replace(/[^0-9/\-]/g, '').trim();
  return trackStr || '1';
}

function sanitizeDuration(duration) {
  const d = parseInt(duration);
  return !isNaN(d) && d > 0 ? d.toString() : '';
}

/**
 * Clean filename - keep alphanumeric, spaces, dashes, underscores
 */
function cleanWithSpaces(str) {
  if (!str) return '';
  return str
    .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip existing ID3 tags from MP3 file
 */
function stripExistingID3(buffer) {
  const view = new Uint8Array(buffer);
  
  // Check for ID3 header
  if (view.length > 10 && view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33) {
    // Calculate tag size
    const size = (view[6] * 0x200000) + (view[7] * 0x4000) + (view[8] * 0x80) + view[9];
    const tagSize = 10 + size;
    
    if (tagSize <= view.length && tagSize > 0) {
      // Return buffer without ID3 tag
      return buffer.slice(tagSize);
    }
  }
  
  return buffer;
}

/**
 * Create complete ID3v2.3 tags
 */
function createCompleteID3Tags(audioBuffer, metadata) {
  const audioBytes = new Uint8Array(audioBuffer);
  const frames = [];

  // Core identification frames
  if (metadata.artist) frames.push(createTextFrame('TPE1', metadata.artist));
  if (metadata.title) frames.push(createTextFrame('TIT2', metadata.title));
  if (metadata.album) frames.push(createTextFrame('TALB', metadata.album));
  if (metadata.year) frames.push(createTextFrame('TYER', metadata.year));
  if (metadata.genre) frames.push(createTextFrame('TCON', metadata.genre));
  if (metadata.track) frames.push(createTextFrame('TRCK', metadata.track));
  if (metadata.duration) frames.push(createTextFrame('TLEN', metadata.duration));
  
  // Additional frames
  if (metadata.artist) {
    frames.push(createTextFrame('TPE2', metadata.artist)); // Album artist
    frames.push(createTextFrame('TSOP', metadata.artist)); // Sort order
  }
  
  if (metadata.encoder) frames.push(createTextFrame('TENC', metadata.encoder));
  if (metadata.publisher) frames.push(createTextFrame('TPUB', metadata.publisher));
  if (metadata.copyright) frames.push(createTextFrame('TCOP', metadata.copyright));
  
  if (metadata.comment) {
    frames.push(createCommentFrame(metadata.comment));
  }
  
  // Add cover art if available
  if (metadata.cover && metadata.cover.byteLength > 0) {
    frames.push(createAPICFrame(metadata.cover));
  }
  
  // Private frame for app data
  const privateData = JSON.stringify({
    uploader: SITENAME,
    version: '2.0.0',
    timestamp: Date.now()
  });
  frames.push(createPrivateFrame('ZEDT', privateData));

  // Calculate total frames size
  const framesSize = frames.reduce((acc, f) => acc + f.length, 0);
  const PADDING_SIZE = 2048;
  
  // Create ID3 header
  const header = new Uint8Array(10);
  header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00], 0); // ID3v2.3.0
  header.set(encodeSynchsafe(framesSize + PADDING_SIZE), 6);

  // Create final buffer
  const final = new Uint8Array(10 + framesSize + PADDING_SIZE + audioBytes.length);
  final.set(header, 0);
  
  let offset = 10;
  for (const f of frames) {
    final.set(f, offset);
    offset += f.length;
  }
  
  offset += PADDING_SIZE;
  final.set(audioBytes, offset);
  
  return final;
}

function createTextFrame(frameId, value) {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(value);
  
  const frame = new Uint8Array(10 + 1 + textBytes.length);
  frame.set(encoder.encode(frameId), 0);
  
  const size = 1 + textBytes.length;
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  frame[8] = 0; // Flags
  frame[9] = 0;
  frame[10] = 0x03; // Text encoding: UTF-8
  frame.set(textBytes, 11);
  
  return frame;
}

function createCommentFrame(comment) {
  const encoder = new TextEncoder();
  const lang = encoder.encode('eng');
  const description = encoder.encode('\0');
  const textBytes = encoder.encode(comment);
  
  const size = 1 + 3 + description.length + textBytes.length;
  const frame = new Uint8Array(10 + size);
  
  frame.set(encoder.encode('COMM'), 0);
  
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  frame[8] = 0;
  frame[9] = 0;
  
  let pos = 10;
  frame[pos++] = 0x03; // Encoding
  frame.set(lang, pos);
  pos += 3;
  frame.set(description, pos);
  pos += description.length;
  frame.set(textBytes, pos);
  
  return frame;
}

function createPrivateFrame(ownerId, data) {
  const encoder = new TextEncoder();
  const ownerBytes = encoder.encode(ownerId + '\0');
  const dataBytes = encoder.encode(data);
  
  const size = ownerBytes.length + dataBytes.length;
  const frame = new Uint8Array(10 + size);
  
  frame.set(encoder.encode('PRIV'), 0);
  
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  frame[8] = 0;
  frame[9] = 0;
  
  frame.set(ownerBytes, 10);
  frame.set(dataBytes, 10 + ownerBytes.length);
  
  return frame;
}

function createAPICFrame(coverBuffer) {
  const encoder = new TextEncoder();
  const coverBytes = new Uint8Array(coverBuffer);
  const mime = "image/jpeg";
  const mimeBytes = encoder.encode(mime);
  const description = new Uint8Array([0]);
  
  const frameDataSize = 1 + mimeBytes.length + 1 + 1 + description.length + coverBytes.length;
  const frame = new Uint8Array(10 + frameDataSize);
  
  frame.set(encoder.encode('APIC'), 0);
  
  frame[4] = (frameDataSize >> 24) & 0xFF;
  frame[5] = (frameDataSize >> 16) & 0xFF;
  frame[6] = (frameDataSize >> 8) & 0xFF;
  frame[7] = frameDataSize & 0xFF;
  
  frame[8] = 0;
  frame[9] = 0;
  
  let pos = 10;
  frame[pos++] = 0x00; // Text encoding
  frame.set(mimeBytes, pos);
  pos += mimeBytes.length;
  frame[pos++] = 0; // Null separator
  frame[pos++] = 0x03; // Picture type: cover (front)
  frame.set(description, pos);
  pos += description.length;
  frame.set(coverBytes, pos);
  
  return frame;
}

function encodeSynchsafe(size) {
  return [
    (size >> 21) & 0x7F,
    (size >> 14) & 0x7F,
    (size >> 7) & 0x7F,
    size & 0x7F
  ];
}