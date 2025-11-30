import * as fs from "fs";
import * as path from "path";
import { SlackMessage } from "../types/index.js";

export interface SlackCache {
  channelId: string;
  channelName?: string;
  lastFetchedTs: string;
  messages: SlackMessage[];
}

export class SlackCacheService {
  private cacheDir: string;

  constructor(cacheDir: string = "data") {
    this.cacheDir = cacheDir;
    this.ensureCacheDir();
  }

  /**
   * キャッシュディレクトリを作成
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * キャッシュファイルのパスを取得
   */
  private getCacheFilePath(channelId: string): string {
    return path.join(this.cacheDir, `slack-${channelId}.json`);
  }

  /**
   * キャッシュを読み込む
   */
  loadCache(channelId: string): SlackCache | null {
    const filePath = this.getCacheFilePath(channelId);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading cache from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * キャッシュを保存
   */
  saveCache(cache: SlackCache): void {
    const filePath = this.getCacheFilePath(cache.channelId);

    try {
      fs.writeFileSync(filePath, JSON.stringify(cache, null, 2), "utf-8");
      console.log(`Cache saved to ${filePath}`);
    } catch (error) {
      console.error(`Error saving cache to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 新しいメッセージをキャッシュにマージ
   */
  mergeMessages(
    existingMessages: SlackMessage[],
    newMessages: SlackMessage[],
  ): SlackMessage[] {
    const messageMap = new Map<string, SlackMessage>();

    // 既存のメッセージをMapに追加
    for (const msg of existingMessages) {
      messageMap.set(msg.ts, msg);
    }

    // 新しいメッセージをマージ（重複は上書き）
    for (const msg of newMessages) {
      messageMap.set(msg.ts, msg);
    }

    // タイムスタンプでソートして返す
    return Array.from(messageMap.values()).sort(
      (a, b) => parseFloat(a.ts) - parseFloat(b.ts),
    );
  }

  /**
   * 最新のタイムスタンプを取得
   */
  getLatestTimestamp(messages: SlackMessage[]): string {
    if (messages.length === 0) {
      return "0";
    }

    // メッセージとスレッド返信を含めた全てのタイムスタンプから最新を取得
    let latestTs = "0";

    for (const msg of messages) {
      if (parseFloat(msg.ts) > parseFloat(latestTs)) {
        latestTs = msg.ts;
      }

      if (msg.replies && msg.replies.length > 0) {
        for (const reply of msg.replies) {
          if (parseFloat(reply.ts) > parseFloat(latestTs)) {
            latestTs = reply.ts;
          }
        }
      }
    }

    return latestTs;
  }
}
