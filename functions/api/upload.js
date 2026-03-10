/**
 * ENHANCED UPLOAD ENDPOINT
 * Original upload.js + ID3 tagging + watermark
 * 
 * Features:
 * - Complete ID3v2.3 tags
 * - 25MB file limit (increased from 15MB)
 * - Watermark image embedding
 * - Audio duration detection
 * - Custom filename support
 * - Track number and year fields
 * 
 * @version 2.0.0
 * @author Zedtopvibes.Com
 */

const SITENAME = "Zedtopvibes.Com";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_COVER_SIZE = 1024 * 1024; // 1MB for watermark

export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  try {
    // ==================== PARSE FORM DATA ====================
    const formData = await request.formData();
    const file = formData.get('file');
    const title = sanitizeInput(formData.get('title') || 'Untitled Track');
    const artist = sanitizeInput(formData.get('artist') || 'Various Artists');
    const description = sanitizeInput(formData.get('description') || '');
    const genre = sanitizeGenre(formData.get('genre') || 'Music');
    const duration = sanitizeDuration(formData.get('duration') || '');
    
    // ID3 fields
    const album = sanitizeInput(formData.get('album') || 'Zedtopvibes Compilation');
    const releaseDate = formData.get('release_date') || '';
    const trackNumber = sanitizeTrack(formData.get('track_number') || '1');
    const customFilename = sanitizeInput(formData.get('custom_filename') || '');

    // Validate required fields
    if (!file || !title || !artist) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields' 
      }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` 
      }), { status: 413, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Validate file type
    const isValidType = file.type.includes('audio/mpeg') || 
                       file.type.includes('audio/mp3') || 
                       file.name.toLowerCase().endsWith('.mp3');
    
    if (!isValidType) {
      return new Response(JSON.stringify({ 
        error: 'File must be an MP3 audio file' 
      }), { status: 415, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // ==================== PROCESS MP3 FILE ====================
    // Branded metadata
    const taggedTitle = `${title} (${SITENAME})`;
    const taggedArtist = `${artist} | ${SITENAME}`;
    const taggedComment = `🎵 Discover your next favorite track at ${SITENAME}`;

    // Extract year from release date
    const year = releaseDate ? releaseDate.split('-')[0] : new Date().getFullYear().toString();

    // Read file buffer
    const fileBuffer = await file.arrayBuffer();
    
    // Strip existing ID3 tags
    const cleanBuffer = stripExistingID3(fileBuffer);
    
    // Get and validate watermark
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

    // Create complete ID3 tags
    const taggedMp3 = createCompleteID3Tags(cleanBuffer, {
      artist: taggedArtist,
      title: taggedTitle,
      album: album,
      year: year,
      genre: genre,
      track: trackNumber,
      comment: taggedComment,
      duration: duration.toString(),
      encoder: `${SITENAME} Uploader v2.0`,
      publisher: SITENAME,
      copyright: `${new Date().getFullYear()} ${SITENAME}`,
      cover: coverBuffer
    });

    // ==================== GENERATE FILENAME ====================
    let filename;
    if (customFilename && customFilename.trim() !== '') {
      const cleanCustom = cleanWithSpaces(customFilename).substring(0, 100);
      filename = `${cleanCustom} (${SITENAME}).mp3`;
    } else {
      const cleanArtist = cleanWithSpaces(artist).substring(0, 30);
      const cleanTitle = cleanWithSpaces(title).substring(0, 50);
      filename = `${cleanArtist} - ${cleanTitle} (${SITENAME}).mp3`;
    }

    // Generate timestamp-based key for R2 (avoids collisions)
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-]/g, '_');
    const r2Key = `audio/${timestamp}-${safeFilename}`;

    // ==================== UPLOAD TO R2 ====================
    await env.AUDIO.put(r2Key, taggedMp3, {
      httpMetadata: {
        contentType: 'audio/mpeg',
        contentDisposition: `attachment; filename="${filename}"`,
      },
      customMetadata: {
        uploader: SITENAME,
        uploadDate: new Date().toISOString(),
        originalTitle: title,
        originalArtist: artist,
        originalAlbum: album,
        genre: genre,
        year: year,
        track: trackNumber,
        version: '2.0.0'
      },
    });

    // ==================== INSERT INTO D1 ====================
    const result = await env.DB.prepare(`
      INSERT INTO tracks (
        title, artist, description, r2_key, filename, genre, duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      title, 
      artist, 
      description, 
      r2Key, 
      filename, 
      genre, 
      duration
    ).run();

    const trackId = result.results[0]?.id;

    // Generate download URL
    const downloadUrl = `/download/${encodeURIComponent(filename)}`;

    // ==================== RETURN SUCCESS ====================
    return new Response(JSON.stringify({ 
      success: true, 
      id: trackId,
      filename,
      url: downloadUrl,
      size: file.size,
      duration: duration,
      metadata: {
        title: taggedTitle,
        artist: taggedArtist,
        album: album,
        year: year,
        genre: genre,
        track: trackNumber
      }
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Upload failed' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });
  }
}

/**
 * Input Sanitization Functions
 */
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, 200);
}

function sanitizeGenre(genre) {
  const supported = ['Podcast', 'Music', 'Hip-Hop', 'Rock', 'Pop', 'Electronic', 'Jazz', 'Classical', 'Audiobook', 'Other'];
  return supported.includes(genre) ? genre : 'Music';
}

function sanitizeTrack(track) {
  const trackStr = track.replace(/[^0-9/\-]/g, '').trim();
  return trackStr || '1';
}

function sanitizeDuration(duration) {
  const d = parseInt(duration);
  return !isNaN(d) && d > 0 ? d : 0;
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
  if (metadata.duration) frames.push(createTextFrame('TLEN', metadata.duration));
  
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
  frames.push(createPrivateFrame('ZEDT', privateData));

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