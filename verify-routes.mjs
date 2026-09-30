async function verify() {
  const routes = [
    { url: "http://localhost:4321/", desc: "About Page" },
    { url: "http://localhost:4321/posts", desc: "Posts Page" },
    { url: "http://localhost:4321/.well-known/nostr.json", desc: "NIP-05 Endpoint" },
    { url: "http://localhost:4321/404", desc: "404 Not Found Page" },
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
