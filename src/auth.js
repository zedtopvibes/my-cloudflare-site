export async function handleSignup(request, env) {
  const { email, password } = await request.json();
  
  // Validate email format
  // Validate password strength (min 6 chars)
  // Generate salt (store separately or as part of hash)
  // Hash password
  // Check if user exists
  // Create user in D1
  // Return success (no session yet — login after)
}