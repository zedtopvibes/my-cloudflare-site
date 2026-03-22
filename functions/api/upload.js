const result = await env.DB.prepare(`
  INSERT INTO tracks (title, artist, description, r2_key, filename, genre, duration, artwork_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING id
`).bind(
  title, 
  artist, 
  description, 
  filename, 
  filename, 
  genre, 
  Math.round(duration / 1000),
  artworkUrl
).run();