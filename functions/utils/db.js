export async function getUserByEmail(env, email) {
  const stmt = env.DB.prepare('SELECT * FROM users WHERE email = ?');
  return await stmt.bind(email.toLowerCase()).first();
}

export async function getUserById(env, id) {
  const stmt = env.DB.prepare('SELECT id, email, created_at, verified FROM users WHERE id = ?');
  return await stmt.bind(id).first();
}

export async function createUser(env, email, passwordHash, salt) {
  const stmt = env.DB.prepare(
    'INSERT INTO users (email, password_hash, salt, created_at, verified) VALUES (?, ?, ?, CURRENT_TIMESTAMP, FALSE) RETURNING id, email, created_at'
  );
  return await stmt.bind(email.toLowerCase(), passwordHash, salt).first();
}

export async function setVerificationToken(env, userId, token) {
  const stmt = env.DB.prepare('UPDATE users SET verification_token = ? WHERE id = ?');
  return await stmt.bind(token, userId).run();
}

export async function verifyUserByToken(env, token) {
  const stmt = env.DB.prepare(
    'UPDATE users SET verified = TRUE, verified_at = CURRENT_TIMESTAMP WHERE verification_token = ? RETURNING id, email'
  );
  return await stmt.bind(token).first();
}