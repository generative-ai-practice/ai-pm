import { WebClient } from "@slack/web-api";
import { SlackMessage, DateRange } from "../types/index.js";

export class SlackService {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  /**
   * チャンネル名からチャンネルIDを取得
   */
  async getChannelIdByName(channelName: string): Promise<string | null> {
    try {
      const cleanChannelName = channelName.replace(/^#/, "");

      let cursor: string | undefined;
      do {
        const result = await this.client.conversations.list({
          types: "public_channel,private_channel",
          limit: 200,
          cursor: cursor,
        });

        if (result.channels) {
          const channel = result.channels.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ch: any) => ch.name === cleanChannelName,
          );
          if (channel) {
            return channel.id as string;
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
  async joinChannel(channelId: string): Promise<boolean> {
    try {
      await this.client.conversations.join({
        channel: channelId,
      });
      console.log(`Successfully joined channel: ${channelId}`);
      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.data?.error === "already_in_channel") {
        console.log(`Already in channel: ${channelId}`);
        return true;
      }
      if (error.data?.error === "is_archived") {
        console.error("Cannot join: Channel is archived");
        return false;
      }
      if (error.data?.error === "method_not_supported_for_channel_type") {
        console.error(
          "Cannot join: This is a private channel. Please manually invite the bot.",
        );
        return false;
      }
      console.error("Error joining channel:", error);
      return false;
    }
  }

  /**
   * スレッドの返信を取得（日付範囲内のもののみ）
   */
  async getThreadReplies(
    channelId: string,
    threadTs: string,
    dateRange: DateRange,
  ): Promise<SlackMessage[]> {
    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs,
        oldest: Math.floor(dateRange.startDate.getTime() / 1000).toString(),
        latest: Math.floor(dateRange.endDate.getTime() / 1000).toString(),
      });

      if (!result.messages) {
        return [];
      }

      // 最初のメッセージ（親メッセージ）を除く
      return result.messages.slice(1) as SlackMessage[];
    } catch (error) {
      console.error(`Error fetching thread replies for ${threadTs}:`, error);
      return [];
    }
  }

  /**
   * 日付範囲内のメッセージを取得（スレッド返信含む）
   */
  async getMessagesInDateRange(
    channelId: string,
    dateRange: DateRange,
  ): Promise<SlackMessage[]> {
    const oldestTimestamp = Math.floor(
      dateRange.startDate.getTime() / 1000,
    ).toString();
    const latestTimestamp = Math.floor(
      dateRange.endDate.getTime() / 1000,
    ).toString();

    console.log(
      `Fetching messages from ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`,
    );
    console.log(`Timestamp range: ${oldestTimestamp} to ${latestTimestamp}`);

    const messages: SlackMessage[] = [];
    let cursor: string | undefined;

    try {
      // メインメッセージを取得
      do {
        const result = await this.client.conversations.history({
          channel: channelId,
          oldest: oldestTimestamp,
          latest: latestTimestamp,
          limit: 100,
          cursor: cursor,
        });

        if (result.messages) {
          messages.push(...(result.messages as SlackMessage[]));
        }

        cursor = result.response_metadata?.next_cursor;
      } while (cursor);

      console.log(`Fetched ${messages.length} main messages`);

      // スレッド返信を取得
      const messagesWithThreads = messages.filter(
        (msg) => msg.thread_ts && msg.reply_count && msg.reply_count > 0,
      );

      if (messagesWithThreads.length > 0) {
        console.log(
          `\n🧵 Fetching thread replies from ${messagesWithThreads.length} threads...`,
        );
        console.log(`   (This may take a while due to API rate limits)`);
      }

      let threadRepliesCount = 0;
      for (let i = 0; i < messagesWithThreads.length; i++) {
        const message = messagesWithThreads[i];

        // 進捗表示（10件ごと、または最後）
        if ((i + 1) % 10 === 0 || i === messagesWithThreads.length - 1) {
          console.log(
            `   Progress: ${i + 1}/${messagesWithThreads.length} threads processed`,
          );
        }

        const replies = await this.getThreadReplies(
          channelId,
          message.thread_ts!,
          dateRange,
        );
        message.replies = replies;
        threadRepliesCount += replies.length;

        // Rate limit対策: 1.2秒待機（50リクエスト/分 = 1リクエスト/1.2秒）
        if (i < messagesWithThreads.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }

      if (messagesWithThreads.length > 0) {
        console.log(`\n✅ Fetched ${threadRepliesCount} thread replies`);
      }
      console.log(`Total messages: ${messages.length + threadRepliesCount}`);

      return messages;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.data?.error === "not_in_channel") {
        console.log("\nBot is not in the channel. Attempting to join...");
        const joined = await this.joinChannel(channelId);

        if (!joined) {
          console.error("\nFailed to join channel automatically.");
          console.error("For private channels, manually invite the bot:");
          console.error("  1. Open the channel in Slack");
          console.error("  2. Type: /invite @your-bot-name");
          throw error;
        }

        console.log("Retrying to fetch messages...\n");
        return this.getMessagesInDateRange(channelId, dateRange);
      }

      console.error("Error fetching messages:", error);
      throw error;
    }
  }

  /**
   * メッセージをフォーマットして文字列に変換
   */
  formatMessages(messages: SlackMessage[]): string {
    let output = "";

    // タイムスタンプでソート
    messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

    for (const msg of messages) {
      const date = new Date(parseFloat(msg.ts) * 1000);
      output += `\n[${date.toISOString()}] ${msg.user || "unknown"}\n`;
      output += `${msg.text}\n`;

      // スレッド返信があれば追加
      if (msg.replies && msg.replies.length > 0) {
        for (const reply of msg.replies) {
          const replyDate = new Date(parseFloat(reply.ts) * 1000);
          output += `  ↳ [${replyDate.toISOString()}] ${reply.user || "unknown"}\n`;
          output += `    ${reply.text}\n`;
        }
      }
    }

    return output;
  }
}
