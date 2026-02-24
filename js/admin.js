async function createPost() {
  const title = document.getElementById("title").value;
  const slug = document.getElementById("slug").value;
  const content = document.getElementById("content").value;
  const cover = document.getElementById("cover").value;

  await apiPost("/admin/posts", {
    title,
    slug,
    content,
    cover_image: cover,
    status: "published"
  });

  alert("Post created!");
}