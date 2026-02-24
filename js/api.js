const API_URL = "https://YOUR_WORKER_URL.workers.dev"; // placeholder

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer super-secret-key"
    },
    body: JSON.stringify(data)
  });
  return res.json();
}