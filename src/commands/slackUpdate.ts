import dotenv from "dotenv";
import { SlackService } from "../services/slack.js";
import { SlackCacheService } from "../services/slackCache.js";

dotenv.config();

/**
 * 前回取得以降の差分メッセージを取得してキャッシュに追加
 */
async function main() {
  console.log("🔄 Slack Cache Update\n");

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
      console.log(`   Found Channel ID: ${targetChannelId}`);
    } else {
      throw new Error("Unreachable");
    }

    console.log();

    // 既存キャッシュを読み込み
    const existingCache = cacheService.loadCache(targetChannelId);
    if (!existingCache) {
      console.error("❌ Cache not found. Please run `yarn slack:init` first.");
      process.exit(1);
    }

    console.log(`📂 Loaded existing cache:`);
    console.log(`   Last fetched: ${existingCache.lastFetchedTs}`);
    console.log(
      `   Last date: ${new Date(parseFloat(existingCache.lastFetchedTs) * 1000).toISOString()}`,
    );
    console.log(`   Existing messages: ${existingCache.messages.length}`);
    console.log();

    // 最終取得以降のメッセージを取得
    console.log("💬 Fetching new messages...");
    const newMessages = await slackService.getMessagesInDateRange(
      targetChannelId,
      {
        startDate: new Date(parseFloat(existingCache.lastFetchedTs) * 1000),
        endDate: new Date(),
      },
    );

    console.log(`   Fetched ${newMessages.length} new messages`);

    // メッセージをマージ
    const mergedMessages = cacheService.mergeMessages(
      existingCache.messages,
      newMessages,
    );

    // 最新タイムスタンプを取得
    const latestTs = cacheService.getLatestTimestamp(mergedMessages);

    // キャッシュを更新
    const updatedCache = {
      ...existingCache,
      lastFetchedTs: latestTs,
      messages: mergedMessages,
    };

    cacheService.saveCache(updatedCache);

    console.log(`\n✅ Successfully updated cache!`);
    console.log(`   Total messages: ${mergedMessages.length}`);
    console.log(
      `   New messages added: ${mergedMessages.length - existingCache.messages.length}`,
    );
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
