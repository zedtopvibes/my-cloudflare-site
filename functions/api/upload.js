// =====================================================
// ID3 BRANDING CONSTANTS (copied from ID3 worker)
// =====================================================
const SITENAME = "Zedtopvibes.Com";
const MAX_COVER_SIZE = 1024 * 1024; // 1MB max for watermark
const SUPPORTED_GENRES = [
  'Podcast', 'Music', 'Hip-Hop', 'Rock', 'Pop', 
  'Electronic', 'Jazz', 'Classical', 'Audiobook', 'Other'
];

export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    // Get form fields (including new ID3-only fields)
    const title = formData.get('title');
    const artist = formData.get('artist');
    const description = formData.get('description') || '';
    const genre = formData.get('genre') || 'unknown';
    const duration = parseInt(formData.get('duration')) || 0; // Already in milliseconds from frontend
    const releaseDate = formData.get('release_date') || '';
    const bpm = formData.get('bpm') || '0';
    const explicit = formData.get('explicit') === '1';
    const featured = formData.get('featured') === '1';
    const editorPick = formData.get('editor_pick') === '1';
    
    // ID3-ONLY FIELDS (not saved to D1)
    const customFilename = formData.get('customFilename') || '';
    const trackNumber = formData.get('trackNumber') || '1';
    
    // Get album info if selected
    const albumId = formData.get('album_id') || '';
    const albumTitle = formData.get('album_title') || '';

    // Validate required fields
    if (!file || !title || !artist) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields' 
      }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      return new Response(JSON.stringify({ 
        error: 'File must be an audio file' 
      }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // =====================================================
    // ID3 BRANDING - PROCESS THE MP3 FILE
    // =====================================================
    
    // Read file buffer
    const fileBuffer = await file.arrayBuffer();
    
    // Strip existing ID3 tags
    const cleanBuffer = stripExistingID3(fileBuffer);
    
    // Get watermark from R2 bucket
    let coverBuffer = null;
    try {
      const watermark = await env.AUDIO.get('watermark.jpg');
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

    // Determine album name for ID3 tag
    let id3Album = albumTitle || 'Zedtopvibes Compilation';

    // Create branded artist name (ONLY FIX: Add | SITENAME)
    const brandedArtist = `${artist} | ${SITENAME}`;

    // Create branded comment
    const brandedComment = `🎵 Discover your next favorite track at ${SITENAME}`;

    // Create complete ID3 tags
    const taggedMp3 = createCompleteID3Tags(cleanBuffer, {
      artist: brandedArtist,              // NOW WITH BRANDING: "Artist | Zedtopvibes.Com"
      title: title,                        // Keep original title
      album: id3Album,                      // Album name or default
      year: releaseDate,                    // Full release date
      genre: genre,                          // Genre
      track: trackNumber,                    // Track number
      comment: brandedComment,                // Branded comment
      duration: duration.toString(),          // Duration in ms (unchanged)
      encoder: `${SITENAME} Uploader`,        // Encoder info
      publisher: SITENAME,                    // Publisher
      copyright: `${new Date().getFullYear()} ${SITENAME}`, // Copyright
      cover: coverBuffer                      // Watermark image
    });

    // Generate filename for R2
    let filename;
    if (customFilename && customFilename.trim() !== '') {
      // Sanitize custom filename
      const cleanCustom = customFilename
        .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100);
      filename = `${cleanCustom} (${SITENAME}).mp3`;
    } else {
      // Auto-generate from artist and title
      const cleanArtist = artist
        .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 30);
      const cleanTitle = title
        .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50);
      filename = `${cleanArtist} - ${cleanTitle} (${SITENAME}).mp3`;
    }

    // Upload branded file to R2
    await env.AUDIO.put(filename, taggedMp3, {
      httpMetadata: {
        contentType: 'audio/mpeg',
        contentDisposition: `inline; filename="${filename}"`,
      },
      customMetadata: {
        title,
        artist,
        uploadedAt: new Date().toISOString(),
        branded: 'true',
        sitename: SITENAME
      },
    });

    // =====================================================
    // D1 DATABASE OPERATIONS (COMPLETELY UNCHANGED)
    // =====================================================
    
    // Insert into D1 with ALL original fields (NO new fields added)
    const result = await env.DB.prepare(`
      INSERT INTO tracks (title, artist, description, r2_key, filename, genre, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      title, 
      artist, 
      description, 
      filename,  // Using the branded filename
      filename, 
      genre, 
      Math.round(duration / 1000) // Convert ms to seconds for database (keeping original behavior)
    ).run();

    const trackId = result.results[0]?.id;

    // Return success response (same format as before)
    return new Response(JSON.stringify({ 
      success: true, 
      id: trackId,
      message: 'Track uploaded successfully',
      filename,
      branded: true
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Upload failed' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });
  }
}

// =====================================================
// ID3 HELPER FUNCTIONS (UNCHANGED FROM ID3 WORKER)
// =====================================================

/**
 * Strip existing ID3 tags from MP3 file
 */
function stripExistingID3(buffer) {
  const view = new Uint8Array(buffer);
  
  if (view.length > 10 && view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33) {
    const size = (view[6] * 0x200000) + (view[7] * 0x4000) + (view[8] * 0x80) + view[9];
    const tagSize = 10 + size;
    
    if (tagSize <= view.length && tagSize > 0) {
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

  // Core identification
  if (metadata.artist) frames.push(createTextFrame('TPE1', metadata.artist));
  if (metadata.title) frames.push(createTextFrame('TIT2', metadata.title));
  if (metadata.album) frames.push(createTextFrame('TALB', metadata.album));
  if (metadata.year) frames.push(createTextFrame('TYER', metadata.year));
  if (metadata.genre) frames.push(createTextFrame('TCON', metadata.genre));
  if (metadata.track) frames.push(createTextFrame('TRCK', metadata.track));
  
  if (metadata.duration) {
    frames.push(createTextFrame('TLEN', metadata.duration.toString()));
  }
  
  if (metadata.artist) {
    frames.push(createTextFrame('TPE2', metadata.artist));
    frames.push(createTextFrame('TSOP', metadata.artist));
  }
  
  if (metadata.encoder) frames.push(createTextFrame('TENC', metadata.encoder));
  if (metadata.publisher) frames.push(createTextFrame('TPUB', metadata.publisher));
  if (metadata.copyright) frames.push(createTextFrame('TCOP', metadata.copyright));
  
  if (metadata.comment) {
    frames.push(createCommentFrame(metadata.comment));
  }
  
  if (metadata.cover && metadata.cover.byteLength > 0) {
    frames.push(createAPICFrame(metadata.cover));
  }
  
  const privateData = JSON.stringify({
    uploader: SITENAME,
    version: '2.0.0',
    timestamp: Date.now()
  });
  frames.push(createPrivateFrame('XXXX', privateData));

  const framesSize = frames.reduce((acc, f) => acc + f.length, 0);
  const PADDING_SIZE = 2048;
  
  const header = new Uint8Array(10);
  header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00], 0);
  header.set(encodeSynchsafe(framesSize + PADDING_SIZE), 6);

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
  
  frame[8] = 0;
  frame[9] = 0;
  frame[10] = 0x03;
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
  frame[pos++] = 0x03;
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
  frame[pos++] = 0x00;
  frame.set(mimeBytes, pos);
  pos += mimeBytes.length;
  frame[pos++] = 0;
  frame[pos++] = 0x03;
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