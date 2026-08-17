async function verify() {
  const routes = [
    { url: "http://localhost:4321/", desc: "Home Page" },
    { url: "http://localhost:4321/posts/crafting-a-modern-blog", desc: "Post Detail (crafting-a-modern-blog)" },
    { url: "http://localhost:4321/posts/serverless-edge-with-d1", desc: "Post Detail (serverless-edge-with-d1)" },
    { url: "http://localhost:4321/categories/design", desc: "Category Archive (design)" },
    { url: "http://localhost:4321/categories/tech", desc: "Category Archive (tech)" },
    { url: "http://localhost:4321/tags/minimalism", desc: "Tag Archive (minimalism)" },
    { url: "http://localhost:4321/404", desc: "404 Not Found Page" },
    { url: "http://localhost:4321/_emdash/admin", desc: "EmDash Admin UI" }
  ];

  console.log("=== VERIFYING ROUTES ===");
  let failed = false;
  for (const { url, desc } of routes) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      const status = res.status;
      const html = await res.text();
      console.log(`[${status}] ${desc} (${url}) - Content length: ${html.length}`);
      if (status >= 500) {
        console.error(`  ERROR: Server error on ${url}`);
        failed = true;
      }
    } catch (err) {
      console.error(`  ERROR connecting to ${url}: ${err.message}`);
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  } else {
    console.log("=== ALL ROUTES RESPONDED CLEANLY ===");
  }
}

verify();
