export async function getUserByEmail(env, email) {
  const stmt = env.DB.prepare('SELECT * FROM users WHERE email = ?');
  const result = await stmt.bind(email).first();
  return result;
}

export async function createUser(env, email, passwordHash) {
  const stmt = env.DB.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at'
  );
  const result = await stmt.bind(email, passwordHash).first();
  return result;
}