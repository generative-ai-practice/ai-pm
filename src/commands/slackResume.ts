import dotenv from "dotenv";
import { SlackService } from "../services/slack.js";
import { SlackCacheService } from "../services/slackCache.js";

dotenv.config();

/**
 * 中断されたslack:initを途中から再開
 * 既存のキャッシュがある場合、lastFetchedTs以前から現在までを取得してマージ
 */
async function main() {
  console.log("🔄 Slack Cache Resume\n");

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

    // 既存キャッシュを読み込み
    const existingCache = cacheService.loadCache(targetChannelId);
    if (!existingCache) {
      console.log("❌ No cache found. Please run `yarn slack:init` first.");
      process.exit(1);
    }

    console.log(`📂 Found existing cache:`);
    console.log(`   Existing messages: ${existingCache.messages.length}`);
    console.log(`   Last fetched: ${existingCache.lastFetchedTs}`);
    console.log(
      `   Last date: ${new Date(parseFloat(existingCache.lastFetchedTs) * 1000).toISOString()}`,
    );
    console.log();

    // 全期間のメッセージを取得（lastFetchedTs以前も含む）
    console.log("💬 Fetching all messages to resume...");
    const allMessages = await slackService.getMessagesInDateRange(
      targetChannelId,
      {
        startDate: new Date(0), // Unix epoch
        endDate: new Date(), // 現在
      },
    );

    // メッセージをマージ
    const mergedMessages = cacheService.mergeMessages(
      existingCache.messages,
      allMessages,
    );

    // 最新タイムスタンプを取得
    const latestTs = cacheService.getLatestTimestamp(mergedMessages);

    // キャッシュを更新
    const updatedCache = {
      channelId: targetChannelId,
      channelName: targetChannelName || existingCache.channelName,
      lastFetchedTs: latestTs,
      messages: mergedMessages,
    };

    cacheService.saveCache(updatedCache);

    console.log(`\n✅ Successfully resumed and updated cache!`);
    console.log(`   Total messages: ${mergedMessages.length}`);
    console.log(`   Previous: ${existingCache.messages.length}`);
    console.log(
      `   Added/Updated: ${mergedMessages.length - existingCache.messages.length}`,
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
