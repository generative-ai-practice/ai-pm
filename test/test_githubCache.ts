import { describe, it } from "node:test";
import assert from "node:assert";
import { GitHubCacheService } from "../src/services/githubCache.js";
import type { GitHubIssue } from "../src/services/github.js";

describe("GitHubCacheService", () => {
  describe("mergeIssues", () => {
    it("should merge new issues with existing ones", () => {
      const cacheService = new GitHubCacheService("test-data");

      const existing: GitHubIssue[] = [
        {
          number: 1,
          title: "Issue 1",
          body: "Body 1",
          created_at: "2024-01-01T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/1",
          state: "open",
          labels: [],
        },
      ];

      const newIssues: GitHubIssue[] = [
        {
          number: 2,
          title: "Issue 2",
          body: "Body 2",
          created_at: "2024-01-02T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/2",
          state: "open",
          labels: [],
        },
      ];

      const merged = cacheService.mergeIssues(existing, newIssues);

      assert.strictEqual(merged.length, 2);
    });

    it("should overwrite duplicate issues by number", () => {
      const cacheService = new GitHubCacheService("test-data");

      const existing: GitHubIssue[] = [
        {
          number: 1,
          title: "Original Title",
          body: "Original Body",
          created_at: "2024-01-01T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/1",
          state: "open",
          labels: [],
        },
      ];

      const newIssues: GitHubIssue[] = [
        {
          number: 1,
          title: "Updated Title",
          body: "Updated Body",
          created_at: "2024-01-01T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/1",
          state: "closed",
          labels: ["bug"],
        },
      ];

      const merged = cacheService.mergeIssues(existing, newIssues);

      assert.strictEqual(merged.length, 1);
      assert.strictEqual(merged[0].title, "Updated Title");
      assert.strictEqual(merged[0].state, "closed");
    });

    it("should sort issues by number descending", () => {
      const cacheService = new GitHubCacheService("test-data");

      const existing: GitHubIssue[] = [
        {
          number: 1,
          title: "Issue 1",
          body: null,
          created_at: "2024-01-01T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/1",
          state: "open",
          labels: [],
        },
      ];

      const newIssues: GitHubIssue[] = [
        {
          number: 3,
          title: "Issue 3",
          body: null,
          created_at: "2024-01-03T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/3",
          state: "open",
          labels: [],
        },
        {
          number: 2,
          title: "Issue 2",
          body: null,
          created_at: "2024-01-02T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/2",
          state: "open",
          labels: [],
        },
      ];

      const merged = cacheService.mergeIssues(existing, newIssues);

      assert.strictEqual(merged[0].number, 3);
      assert.strictEqual(merged[1].number, 2);
      assert.strictEqual(merged[2].number, 1);
    });
  });

  describe("getLatestIssueNumber", () => {
    it("should return the highest issue number", () => {
      const cacheService = new GitHubCacheService("test-data");

      const issues: GitHubIssue[] = [
        {
          number: 5,
          title: "Issue 5",
          body: null,
          created_at: "2024-01-05T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/5",
          state: "open",
          labels: [],
        },
        {
          number: 10,
          title: "Issue 10",
          body: null,
          created_at: "2024-01-10T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/10",
          state: "open",
          labels: [],
        },
        {
          number: 3,
          title: "Issue 3",
          body: null,
          created_at: "2024-01-03T00:00:00Z",
          html_url: "https://github.com/owner/repo/issues/3",
          state: "open",
          labels: [],
        },
      ];

      const latest = cacheService.getLatestIssueNumber(issues);

      assert.strictEqual(latest, 10);
    });

    it("should return 0 for empty issues array", () => {
      const cacheService = new GitHubCacheService("test-data");

      const latest = cacheService.getLatestIssueNumber([]);

      assert.strictEqual(latest, 0);
    });
  });
});
