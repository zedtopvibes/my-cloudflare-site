export async function getUserByEmail(env, email) {
  const stmt = env.DB.prepare('SELECT * FROM users WHERE email = ?');
  return await stmt.bind(email.toLowerCase()).first();
}

export async function getUserById(env, id) {
  const stmt = env.DB.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
  return await stmt.bind(id).first();
}

export async function createUser(env, email, passwordHash, salt) {
  const stmt = env.DB.prepare(
    'INSERT INTO users (email, password_hash, salt, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) RETURNING id, email, created_at'
  );
  return await stmt.bind(email.toLowerCase(), passwordHash, salt).first();
}

export async function userExists(env, email) {
  const stmt = env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
  const result = await stmt.bind(email.toLowerCase()).first();
  return result.count > 0;
}