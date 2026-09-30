import { test, expect } from "@playwright/test";
import { getPublicKey } from "nostr-tools/pure";
import { TEST_NPUB, TEST_SECRET_KEY } from "./fixtures.mjs";

test.describe("Public Site E2E Tests", () => {
  test("About page shows the Nostr profile and links", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("RikiyaOta");
    await expect(page.locator(".site-name")).toHaveText("RikiyaOta");
    await expect(page.locator('.tabs a[aria-current="page"]')).toHaveText("About");

    await expect(page.locator(".pre-wrap")).toContainText("テスト用のプロフィールです。");
    await expect(page.locator(".links")).toContainText(TEST_NPUB);
    await expect(page.locator(".links")).toContainText("GitHub");
  });

  test("Posts page lists top-level notes and paginates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Posts" }).click();
    await expect(page).toHaveURL("/posts");
    await expect(page.locator('.tabs a[aria-current="page"]')).toHaveText("Posts");

    const posts = page.locator(".post");
    // 20 件取得したうち 1 件はリプライなので 19 件
    await expect(posts).toHaveCount(19);
    await expect(posts.first()).toContainText("リンク付き");
    await expect(posts.first().locator('a[href="https://example.com/"]')).toBeVisible();
    await expect(page.locator("body")).not.toContainText("これはリプライなので表示されない");
    await expect(posts.first().locator(".post-date")).toHaveAttribute("href", /^https:\/\/njump\.me\/nevent1/);

    await page.getByRole("link", { name: "Older →" }).click();
    await expect(page).toHaveURL(/\/posts\?until=\d+/);
    await expect(posts).toHaveCount(4);
    await expect(posts.last()).toContainText("テスト投稿 0");
    await expect(page.getByRole("link", { name: "Older →" })).toHaveCount(0);
  });

  test("NIP-05 endpoint returns the public key with CORS header", async ({ request }) => {
    const res = await request.get("/.well-known/nostr.json");
    expect(res.status()).toBe(200);
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
    const json = await res.json();
    expect(json.names._).toBe(getPublicKey(TEST_SECRET_KEY));
  });

  test("Nonexistent route returns 404 page", async ({ page }) => {
    const response = await page.goto("/non-existent-page-xyz");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h2")).toContainText("404");
  });
});
