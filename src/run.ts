import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";

// .envファイルから環境変数を読み込む
dotenv.config();

interface SlackMessage {
  type: string;
  user?: string;
  text: string;
  ts: string;
  thread_ts?: string;
}

/**
 * チャンネル名からチャンネルIDを取得
 */
async function getChannelIdByName(
  client: WebClient,
  channelName: string,
): Promise<string | null> {
  try {
    // '#' を除去
    const cleanChannelName = channelName.replace(/^#/, "");

    let cursor: string | undefined;
    do {
      const result = await client.conversations.list({
        types: "public_channel,private_channel",
        limit: 200,
        cursor: cursor,
      });

      if (result.channels) {
        const channel = result.channels.find(
          (ch) => (ch as { name?: string }).name === cleanChannelName,
        );
        if (channel) {
          return (channel as { id: string }).id;
        }
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    return null;
  } catch (error) {
    console.error("Error fetching channels:", error);
    throw error;
  }
}

/**
 * Botをチャンネルに参加させる
 */
async function joinChannel(
  client: WebClient,
  channelId: string,
): Promise<boolean> {
  try {
    await client.conversations.join({
      channel: channelId,
    });
    console.log(`Successfully joined channel: ${channelId}`);
    return true;
  } catch (error) {
    if (
      (error as { data?: { error?: string } }).data?.error ===
      "already_in_channel"
    ) {
      console.log(`Already in channel: ${channelId}`);
      return true;
    }
    if (
      (error as { data?: { error?: string } }).data?.error === "is_archived"
    ) {
      console.error("Cannot join: Channel is archived");
      return false;
    }
    if (
      (error as { data?: { error?: string } }).data?.error ===
      "method_not_supported_for_channel_type"
    ) {
      console.error(
        "Cannot join: This is a private channel. Please manually invite the bot.",
      );
      return false;
    }
    console.error("Error joining channel:", error);
    return false;
  }
}

async function getChannelMessagesForDate(
  client: WebClient,
  channelId: string,
  date: Date,
): Promise<SlackMessage[]> {
  // 指定日の00:00:00と23:59:59のUNIXタイムスタンプを取得
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const oldestTimestamp = Math.floor(startOfDay.getTime() / 1000).toString();

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const latestTimestamp = Math.floor(endOfDay.getTime() / 1000).toString();

  console.log(
    `Fetching messages from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`,
  );
  console.log(`Timestamp range: ${oldestTimestamp} to ${latestTimestamp}`);

  const messages: SlackMessage[] = [];
  let cursor: string | undefined;

  try {
    do {
      const result = await client.conversations.history({
        channel: channelId,
        oldest: oldestTimestamp,
        latest: latestTimestamp,
        limit: 100, // 一度に取得する最大メッセージ数
        cursor: cursor,
      });

      if (result.messages) {
        messages.push(...(result.messages as SlackMessage[]));
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    console.log(`Total messages fetched: ${messages.length}`);
    return messages;
  } catch (error) {
    if (
      (error as { data?: { error?: string } }).data?.error === "not_in_channel"
    ) {
      console.log("\nBot is not in the channel. Attempting to join...");
      const joined = await joinChannel(client, channelId);

      if (!joined) {
        console.error("\nFailed to join channel automatically.");
        console.error("For private channels, manually invite the bot:");
        console.error("  1. Open the channel in Slack");
        console.error("  2. Type: /invite @your-bot-name");
        throw error;
      }

      console.log("Retrying to fetch messages...\n");
      // チャンネルに参加できたので再試行
      return getChannelMessagesForDate(client, channelId, date);
    }

    console.error("Error fetching messages:", error);
    throw error;
  }
}

// 使用例
async function main() {
  // 環境変数からトークンを取得
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    console.error("SLACK_BOT_TOKEN environment variable is required");
    process.exit(1);
  }

  const client = new WebClient(token);

  // チャンネル名またはIDを取得
  const channelNameOrId =
    process.env.SLACK_CHANNEL_NAME || process.env.SLACK_CHANNEL_ID;

  if (!channelNameOrId) {
    console.error(
      "SLACK_CHANNEL_NAME or SLACK_CHANNEL_ID environment variable is required",
    );
    process.exit(1);
  }

  // チャンネルIDを取得（名前の場合は変換、IDの場合はそのまま使用）
  let channelId: string;
  if (channelNameOrId.startsWith("C") || channelNameOrId.startsWith("G")) {
    // すでにIDの形式
    channelId = channelNameOrId;
    console.log(`Using Channel ID: ${channelId}`);
  } else {
    // チャンネル名からIDを取得
    console.log(`Looking up channel: ${channelNameOrId}`);
    const foundId = await getChannelIdByName(client, channelNameOrId);
    if (!foundId) {
      console.error(`Channel not found: ${channelNameOrId}`);
      process.exit(1);
    }
    channelId = foundId;
    console.log(`Found Channel ID: ${channelId}`);
  }

  const targetDate = process.env.TARGET_DATE
    ? new Date(process.env.TARGET_DATE)
    : new Date(); // デフォルトは今日

  console.log(`Target Date: ${targetDate.toDateString()}`);

  const messages = await getChannelMessagesForDate(
    client,
    channelId,
    targetDate,
  );

  // メッセージを表示（タイムスタンプでソート）
  messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

  messages.forEach((msg) => {
    const date = new Date(parseFloat(msg.ts) * 1000);
    console.log(`\n[${date.toISOString()}] ${msg.user || "unknown"}`);
    console.log(`${msg.text}`);
  });
}

main().catch(console.error);
