import dotenv from "dotenv";
import * as readline from "readline";
import { SlackService } from "./services/slack.js";
import { GitHubService } from "./services/github.js";
import { AnalyzerService } from "./services/analyzer.js";
import { LoggerService } from "./services/logger.js";
import { Config, DateRange, IssueProposal } from "./types/index.js";

// .envファイルから環境変数を読み込む
dotenv.config();

/**
 * 環境変数から設定を読み込む
 */
function loadConfig(): Config {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const githubToken = process.env.GITHUB_TOKEN;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const githubOwner = process.env.GITHUB_OWNER;
  const githubRepo = process.env.GITHUB_REPO;

  if (!slackToken) {
    throw new Error("SLACK_BOT_TOKEN is required");
  }
  if (!githubToken) {
    throw new Error("GITHUB_TOKEN is required");
  }
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  if (!githubOwner) {
    throw new Error("GITHUB_OWNER is required");
  }
  if (!githubRepo) {
    throw new Error("GITHUB_REPO is required");
  }

  return {
    slack: {
      token: slackToken,
      channelName: process.env.SLACK_CHANNEL_NAME,
      channelId: process.env.SLACK_CHANNEL_ID,
    },
    github: {
      token: githubToken,
      owner: githubOwner,
      repo: githubRepo,
    },
    openai: {
      apiKey: openaiApiKey,
      model: process.env.OPENAI_MODEL || "gpt-4o",
    },
    dateRange: {
      days: parseInt(process.env.DATE_RANGE_DAYS || "2", 10),
    },
    language: process.env.LANGUAGE || "ja",
  };
}

/**
 * 日付範囲を計算
 */
function calculateDateRange(days: number): DateRange {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}

/**
 * ユーザーに Y/N の質問をする
 */
function askYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

/**
 * 各提案についてユーザーに確認し、承認されたらIssueを作成
 */
async function processProposals(
  proposals: IssueProposal[],
  githubService: GitHubService,
): Promise<void> {
  console.log("\n📝 Processing proposals...\n");

  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i];

    console.log(`\n[${i + 1}/${proposals.length}] ${proposal.title}`);
    console.log("-".repeat(80));
    console.log(`\n${proposal.description}\n`);
    console.log(`💭 Reasoning: ${proposal.reasoning}\n`);

    const shouldCreate = await askYesNo("🎫 Create this issue on GitHub?");

    if (shouldCreate) {
      try {
        // Issue本文を作成（関連Slackメッセージへの参照を含める）
        let body = proposal.description;

        if (proposal.relatedSlackMessages.length > 0) {
          body += "\n\n## Related Slack Messages\n";
          for (const msg of proposal.relatedSlackMessages) {
            body += `- ${msg}\n`;
          }
        }

        body +=
          "\n\n---\n*This issue was automatically generated from Slack conversations*";

        const createdIssue = await githubService.createIssue(
          proposal.title,
          body,
        );

        console.log(`\n✅ Created: ${createdIssue.html_url}\n`);
      } catch (error) {
        console.error(`\n❌ Failed to create issue: ${error}\n`);
      }
    } else {
      console.log("\n⏭️  Skipped\n");
    }
  }

  console.log("\n✨ All proposals processed!\n");
}

/**
 * メイン処理
 */
async function main() {
  console.log("🚀 AI-Powered Project Manager\n");
  console.log("Analyzing Slack conversations and GitHub issues...\n");

  try {
    // 設定を読み込む
    const config = loadConfig();

    // 日付範囲を計算
    const dateRange = calculateDateRange(config.dateRange.days);
    console.log(
      `📅 Date range: ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`,
    );
    console.log(`   (Last ${config.dateRange.days} days)\n`);

    // サービスを初期化
    const loggerService = new LoggerService("output");
    const slackService = new SlackService(config.slack.token);
    const githubService = new GitHubService(
      config.github.token,
      config.github.owner,
      config.github.repo,
    );
    const analyzerService = new AnalyzerService(
      config.openai.apiKey,
      config.openai.model,
      config.language,
      loggerService,
    );

    // Slackチャンネルを解決
    let channelId: string;
    if (config.slack.channelId) {
      channelId = config.slack.channelId;
      console.log(`📺 Using Channel ID: ${channelId}`);
    } else if (config.slack.channelName) {
      console.log(`📺 Looking up channel: ${config.slack.channelName}`);
      const foundId = await slackService.getChannelIdByName(
        config.slack.channelName,
      );
      if (!foundId) {
        throw new Error(`Channel not found: ${config.slack.channelName}`);
      }
      channelId = foundId;
      console.log(`   Found Channel ID: ${channelId}`);
    } else {
      throw new Error("SLACK_CHANNEL_NAME or SLACK_CHANNEL_ID is required");
    }

    console.log();

    // Slackメッセージを取得
    console.log("💬 Fetching Slack messages...");
    const slackMessages = await slackService.getMessagesInDateRange(
      channelId,
      dateRange,
    );
    const formattedSlack = slackService.formatMessages(slackMessages);

    // GitHub Issuesを取得
    console.log("\n🐙 Fetching GitHub issues...");
    const githubIssues = await githubService.getIssuesInDateRange(dateRange);
    const formattedIssues = githubService.formatIssues(githubIssues);

    // OpenAIで分析
    const proposals = await analyzerService.analyzeAndPropose(
      formattedSlack,
      formattedIssues,
    );

    // 提案を表示
    console.log(analyzerService.formatProposals(proposals));

    // 提案がある場合、ユーザーに確認してIssueを作成
    if (proposals.length > 0) {
      await processProposals(proposals, githubService);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
