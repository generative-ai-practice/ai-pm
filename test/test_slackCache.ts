import { describe, it } from "node:test";
import assert from "node:assert";
import { SlackCacheService } from "../src/services/slackCache.js";
import type { SlackMessage } from "../src/types/index.js";

describe("SlackCacheService", () => {
  describe("mergeMessages", () => {
    it("should merge new messages with existing ones", () => {
      const cacheService = new SlackCacheService("test-data");

      const existing: SlackMessage[] = [
        { ts: "1000.000", user: "U1", text: "message 1" },
        { ts: "2000.000", user: "U2", text: "message 2" },
      ];

      const newMessages: SlackMessage[] = [
        { ts: "3000.000", user: "U3", text: "message 3" },
      ];

      const merged = cacheService.mergeMessages(existing, newMessages);

      assert.strictEqual(merged.length, 3);
      assert.strictEqual(merged[0].ts, "1000.000");
      assert.strictEqual(merged[2].ts, "3000.000");
    });

    it("should overwrite duplicate messages by timestamp", () => {
      const cacheService = new SlackCacheService("test-data");

      const existing: SlackMessage[] = [
        { ts: "1000.000", user: "U1", text: "original" },
      ];

      const newMessages: SlackMessage[] = [
        { ts: "1000.000", user: "U1", text: "updated" },
      ];

      const merged = cacheService.mergeMessages(existing, newMessages);

      assert.strictEqual(merged.length, 1);
      assert.strictEqual(merged[0].text, "updated");
    });

    it("should sort messages by timestamp", () => {
      const cacheService = new SlackCacheService("test-data");

      const existing: SlackMessage[] = [
        { ts: "3000.000", user: "U3", text: "third" },
      ];

      const newMessages: SlackMessage[] = [
        { ts: "1000.000", user: "U1", text: "first" },
        { ts: "2000.000", user: "U2", text: "second" },
      ];

      const merged = cacheService.mergeMessages(existing, newMessages);

      assert.strictEqual(merged[0].ts, "1000.000");
      assert.strictEqual(merged[1].ts, "2000.000");
      assert.strictEqual(merged[2].ts, "3000.000");
    });
  });

  describe("getLatestTimestamp", () => {
    it("should return the latest timestamp from messages", () => {
      const cacheService = new SlackCacheService("test-data");

      const messages: SlackMessage[] = [
        { ts: "1000.000", user: "U1", text: "first" },
        { ts: "3000.000", user: "U2", text: "third" },
        { ts: "2000.000", user: "U3", text: "second" },
      ];

      const latest = cacheService.getLatestTimestamp(messages);

      assert.strictEqual(latest, "3000.000");
    });

    it("should consider thread replies for latest timestamp", () => {
      const cacheService = new SlackCacheService("test-data");

      const messages: SlackMessage[] = [
        {
          ts: "1000.000",
          user: "U1",
          text: "parent",
          replies: [
            { ts: "1001.000", user: "U2", text: "reply 1" },
            { ts: "5000.000", user: "U3", text: "reply 2" },
          ],
        },
        { ts: "2000.000", user: "U4", text: "another message" },
      ];

      const latest = cacheService.getLatestTimestamp(messages);

      assert.strictEqual(latest, "5000.000");
    });

    it("should return '0' for empty messages array", () => {
      const cacheService = new SlackCacheService("test-data");

      const latest = cacheService.getLatestTimestamp([]);

      assert.strictEqual(latest, "0");
    });
  });
});
