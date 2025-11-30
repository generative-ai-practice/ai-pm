import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { SlackCacheService } from "../services/slackCache.js";
import { SlackMessage } from "../types/index.js";

dotenv.config();

/**
 * 指定月のSlackメッセージをMarkdown形式で出力
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: yarn slack:export-md <YYYY-MM>");
    console.error("Example: yarn slack:export-md 2025-01");
    process.exit(1);
  }

  const yearMonth = args[0];
  const [year, month] = yearMonth.split("-");

  if (!year || !month || !/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    console.error("Invalid format. Use YYYY-MM (e.g., 2025-01)");
    process.exit(1);
  }

  console.log(`📝 Exporting Slack messages for ${yearMonth}\n`);

  // 環境変数チェック
  const channelName = process.env.SLACK_CHANNEL_NAME;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!channelName && !channelId) {
    throw new Error("SLACK_CHANNEL_NAME or SLACK_CHANNEL_ID is required");
  }

  try {
    const cacheService = new SlackCacheService("data");

    // チャンネルIDを解決
    let targetChannelId: string;
    if (channelId) {
      targetChannelId = channelId;
    } else {
      // channelNameからチャンネルIDを推測（data/ 配下のファイルを探す）
      const dataFiles = fs
        .readdirSync("data")
        .filter((f) => f.startsWith("slack-") && f.endsWith(".json"));
      if (dataFiles.length === 0) {
        throw new Error(
          "No Slack cache found. Please run `yarn slack:init` first.",
        );
      }
      // 最初のファイルから channelId を抽出
      const match = dataFiles[0].match(/slack-(.+)\.json/);
      if (!match) {
        throw new Error("Invalid cache file format");
      }
      targetChannelId = match[1];
    }

    // キャッシュを読み込み
    const cache = cacheService.loadCache(targetChannelId);
    if (!cache) {
      throw new Error(
        `Cache not found for channel ${targetChannelId}. Please run \`yarn slack:init\` first.`,
      );
    }

    console.log(
      `📂 Loaded cache for channel: ${cache.channelName || targetChannelId}`,
    );
    console.log(`   Total messages: ${cache.messages.length}\n`);

    // 指定月のメッセージをフィルタ
    const startDate = new Date(`${year}-${month}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const filteredMessages = filterMessagesByMonth(
      cache.messages,
      startDate,
      endDate,
    );

    console.log(`   Messages in ${yearMonth}: ${filteredMessages.length}`);

    if (filteredMessages.length === 0) {
      console.log("\n⚠️  No messages found for the specified month.");
      process.exit(0);
    }

    // Markdown形式に変換
    const markdown = convertToMarkdown(
      filteredMessages,
      cache.channelName || targetChannelId,
      yearMonth,
    );

    // 出力ディレクトリを作成
    const outputDir = "output";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // ファイルに保存
    const outputPath = path.join(outputDir, `slack-${yearMonth}.md`);
    fs.writeFileSync(outputPath, markdown, "utf-8");

    console.log(`\n✅ Exported to ${outputPath}`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

/**
 * 指定月のメッセージをフィルタ
 */
function filterMessagesByMonth(
  messages: SlackMessage[],
  startDate: Date,
  endDate: Date,
): SlackMessage[] {
  return messages.filter((msg) => {
    const msgDate = new Date(parseFloat(msg.ts) * 1000);
    return msgDate >= startDate && msgDate < endDate;
  });
}

/**
 * メッセージをシンプルなテキスト形式に変換（formatMessages()と同じ形式）
 */
function convertToMarkdown(
  messages: SlackMessage[],
  _channelName: string,
  _yearMonth: string,
): string {
  let output = "";

  // タイムスタンプでソート
  const sortedMessages = [...messages].sort(
    (a, b) => parseFloat(a.ts) - parseFloat(b.ts),
  );

  for (const msg of sortedMessages) {
    const date = new Date(parseFloat(msg.ts) * 1000);
    output += `\n[${date.toISOString()}] ${msg.user || "unknown"}\n`;

    // テキストがある場合はテキストを出力
    if (msg.text && msg.text.trim() !== "") {
      output += `${msg.text}\n`;
    }
    // テキストが無い場合はファイル情報を出力
    else if (msg.files && msg.files.length > 0) {
      for (const file of msg.files) {
        output += `[File: ${file.name || "unknown"} (${file.mimetype || "unknown"})]\n`;
      }
    }

    // スレッド返信
    if (msg.replies && msg.replies.length > 0) {
      for (const reply of msg.replies) {
        const replyDate = new Date(parseFloat(reply.ts) * 1000);
        output += `  ↳ [${replyDate.toISOString()}] ${reply.user || "unknown"}\n`;

        // 返信のテキストがある場合
        if (reply.text && reply.text.trim() !== "") {
          output += `    ${reply.text}\n`;
        }
        // 返信にファイルがある場合
        else if (reply.files && reply.files.length > 0) {
          for (const file of reply.files) {
            output += `    [File: ${file.name || "unknown"} (${file.mimetype || "unknown"})]\n`;
          }
        }
      }
    }
  }

  return output;
}

main();
