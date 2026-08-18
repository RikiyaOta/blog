import { test, expect } from "@playwright/test";

test.describe("Public Blog E2E Tests", () => {
  test("Top page renders correctly with articles and navigation", async ({ page }) => {
    await page.goto("/");

    // Verify title and header
    await expect(page).toHaveTitle(/Journal/);
    const siteLogo = page.locator(".site-logo");
    await expect(siteLogo).toContainText("Journal");

    // Verify primary navigation
    const navLinks = page.locator(".nav-list .nav-link");
    await expect(navLinks).toHaveCount(4); // Home, Tech, Design, Thoughts

    // Verify post cards exist
    const postCards = page.locator(".post-card");
    const count = await postCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify first post card structure
    const firstPost = postCards.first();
    await expect(firstPost.locator(".card-title")).toBeVisible();
    await expect(firstPost.locator(".card-excerpt")).toBeVisible();
    await expect(firstPost.locator(".card-date")).toBeVisible();
  });

  test("Navigate from top page to post detail page and verify article content", async ({ page }) => {
    await page.goto("/");

    // Click on the first post link
    const firstPostLink = page.locator(".post-card .card-title a").first();
    const firstPostTitle = await firstPostLink.textContent();
    await firstPostLink.click();

    // Verify URL and heading
    await expect(page).toHaveURL(/\/posts\/.+/);
    const detailTitle = page.locator(".detail-title");
    await expect(detailTitle).toBeVisible();
    if (firstPostTitle) {
      await expect(detailTitle).toContainText(firstPostTitle.trim());
    }

    // Verify PortableText rendered content is visible
    const prose = page.locator(".prose");
    await expect(prose).toBeVisible();
    const paragraphs = prose.locator("p");
    expect(await paragraphs.count()).toBeGreaterThan(0);
  });

  test("Category archive page filters posts correctly", async ({ page }) => {
    await page.goto("/categories/tech");

    // Verify page header displays category name
    const archiveTitle = page.locator(".archive-title");
    await expect(archiveTitle).toContainText("Technology");

    // Verify filtered articles exist
    const postCards = page.locator(".post-card");
    expect(await postCards.count()).toBeGreaterThan(0);
  });

  test("Tag archive page filters posts correctly", async ({ page }) => {
    await page.goto("/tags/astro");

    // Verify page header displays tag name
    const archiveTitle = page.locator(".archive-title");
    await expect(archiveTitle).toContainText("Astro");

    // Verify filtered articles exist
    const postCards = page.locator(".post-card");
    expect(await postCards.count()).toBeGreaterThan(0);
  });

  test("Nonexistent route returns 404 page", async ({ page }) => {
    const response = await page.goto("/posts/non-existent-article-slug-xyz");
    expect(response?.status()).toBe(404);

    const errorCode = page.locator(".error-code");
    await expect(errorCode).toContainText("404");
    const errorTitle = page.locator(".error-title");
    await expect(errorTitle).toContainText("Page not found");
  });
});
