import dotenv from "dotenv";
import { SlackService } from "../services/slack.js";
import { SlackCacheService } from "../services/slackCache.js";

dotenv.config();

/**
 * Slack全期間のメッセージを取得してキャッシュに保存
 */
async function main() {
  console.log("🚀 Slack Cache Initialization\n");

  // 環境変数チェック
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) {
    throw new Error("SLACK_BOT_TOKEN is required");
  }

  const channelName = process.env.SLACK_CHANNEL_NAME;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!channelName && !channelId) {
    throw new Error("SLACK_CHANNEL_NAME or SLACK_CHANNEL_ID is required");
  }

  try {
    // サービス初期化
    const slackService = new SlackService(slackToken);
    const cacheService = new SlackCacheService("data");

    // チャンネルID解決
    let targetChannelId: string;
    let targetChannelName: string | undefined;

    if (channelId) {
      targetChannelId = channelId;
      console.log(`📺 Using Channel ID: ${targetChannelId}`);
    } else if (channelName) {
      console.log(`📺 Looking up channel: ${channelName}`);
      const foundId = await slackService.getChannelIdByName(channelName);
      if (!foundId) {
        throw new Error(`Channel not found: ${channelName}`);
      }
      targetChannelId = foundId;
      targetChannelName = channelName;
      console.log(`   Found Channel ID: ${targetChannelId}`);
    } else {
      throw new Error("Unreachable");
    }

    console.log();

    // 既存キャッシュをチェック
    const existingCache = cacheService.loadCache(targetChannelId);
    if (existingCache) {
      console.log("⚠️  Cache already exists for this channel!");
      console.log(`   Existing messages: ${existingCache.messages.length}`);
      console.log(
        `   Last updated: ${new Date(parseFloat(existingCache.lastFetchedTs) * 1000).toISOString()}`,
      );
      console.log("\n💡 Use `yarn slack:update` to fetch only new messages.");
      console.log("   Or delete data/slack-*.json to re-initialize.\n");
      process.exit(0);
    }

    // 全期間のメッセージを取得（oldest/latestを指定しない）
    console.log("💬 Fetching all messages from the channel...");
    const messages = await slackService.getMessagesInDateRange(
      targetChannelId,
      {
        startDate: new Date(0), // Unix epoch
        endDate: new Date(), // 現在
      },
    );

    // 最新タイムスタンプを取得
    const latestTs = cacheService.getLatestTimestamp(messages);

    // キャッシュに保存
    const cache = {
      channelId: targetChannelId,
      channelName: targetChannelName,
      lastFetchedTs: latestTs,
      messages: messages,
    };

    cacheService.saveCache(cache);

    console.log(`\n✅ Successfully initialized cache!`);
    console.log(`   Channel ID: ${targetChannelId}`);
    console.log(`   Total messages: ${messages.length}`);
    console.log(`   Latest timestamp: ${latestTs}`);
    console.log(
      `   Latest date: ${new Date(parseFloat(latestTs) * 1000).toISOString()}`,
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
