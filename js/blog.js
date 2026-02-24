const postsContainer = document.getElementById("posts");

if (postsContainer) {
  loadPosts();
}

async function loadPosts() {
  const posts = await apiGet("/posts");

  posts.forEach(post => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h2><a href="/post.html?slug=${post.slug}">${post.title}</a></h2>
    `;
    postsContainer.appendChild(div);
  });
}

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

if (slug) loadSinglePost(slug);

async function loadSinglePost(slug) {
  const post = await apiGet(`/post/${slug}`);
  document.getElementById("title").innerText = post.title;
  document.getElementById("content").innerHTML = post.content;
}