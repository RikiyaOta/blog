import { test, expect } from "@playwright/test";

test.describe("EmDash Admin CMS E2E Tests", () => {
  test("Access Admin UI, log in via Dev Bypass, and verify CMS dashboard", async ({ page }) => {
    // Perform dev-bypass login
    await page.goto("/_emdash/api/auth/dev-bypass");

    // Navigate to EmDash admin
    await page.goto("/_emdash/admin");

    // Verify Admin Dashboard loads
    await expect(page).toHaveURL(/_emdash\/admin/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Authenticated REST API returns valid CMS manifest with collections", async ({ page }) => {
    // Perform dev-bypass login to set session cookie on browser context
    await page.goto("/_emdash/api/auth/dev-bypass");

    // Request manifest via authenticated page context
    const response = await page.request.get("/_emdash/api/manifest", {
      headers: {
        "X-EmDash-Request": "1",
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty("success", true);
    expect(json.data).toHaveProperty("collections");

    const postsCollection = json.data.collections.posts;
    expect(postsCollection).toBeDefined();
    expect(postsCollection.label).toBe("Posts");
  });

  test("Create, publish, and view a new blog post via CMS and verify public rendering", async ({ page }) => {
    // Log in via dev bypass
    await page.goto("/_emdash/api/auth/dev-bypass");

    const testSlug = `e2e-automated-post-${Date.now()}`;
    const testTitle = "Automated E2E Test Article";
    const testExcerpt = "This is an excerpt created by Playwright E2E tests.";

    // 1. Create a draft post via EmDash Content API
    const createRes = await page.request.post("/_emdash/api/content/posts", {
      headers: {
        "X-EmDash-Request": "1",
      },
      data: {
        slug: testSlug,
        status: "draft",
        data: {
          title: testTitle,
          excerpt: testExcerpt,
          content: [
            {
              _type: "block",
              style: "normal",
              children: [
                {
                  _type: "span",
                  text: "This article was created during automated end-to-end verification.",
                },
              ],
            },
          ],
        },
      },
    });

    expect([200, 201]).toContain(createRes.status());
    const createdJson = await createRes.json();
    expect(createdJson.success).toBe(true);
    const postId = createdJson.data?.item?.id || createdJson.data?.id;
    expect(postId).toBeDefined();

    // 2. Publish the post
    const publishRes = await page.request.post(`/_emdash/api/content/posts/${postId}/publish`, {
      headers: {
        "X-EmDash-Request": "1",
      },
    });
    expect(publishRes.status()).toBe(200);

    // 3. Navigate to the newly created public article page
    await page.goto(`/posts/${testSlug}`);
    await expect(page).toHaveURL(`/posts/${testSlug}`);

    const titleEl = page.locator(".detail-title");
    await expect(titleEl).toHaveText(testTitle);
    const proseEl = page.locator(".prose");
    await expect(proseEl).toContainText("This article was created during automated end-to-end verification.");

    // 4. Clean up: delete test entry
    await page.request.delete(`/_emdash/api/content/posts/${postId}/permanent`, {
      headers: {
        "X-EmDash-Request": "1",
      },
    });
  });
});
