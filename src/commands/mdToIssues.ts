import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { GitHubService } from "../services/github.js";
import { AnalyzerService } from "../services/analyzer.js";
import { LoggerService } from "../services/logger.js";
import { IssueProposal } from "../types/index.js";

dotenv.config();

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
        // Issue本文を作成
        let body = proposal.description;

        body +=
          "\n\n---\n*This issue was automatically generated from Markdown file*";

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
  console.log("🚀 Markdown to GitHub Issues\n");

  // CLI引数からファイルパスを取得
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("❌ Error: Please specify a Markdown file path");
    console.log("\nUsage: yarn md:issues <markdown-file>\n");
    process.exit(1);
  }

  // ファイル存在チェック
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`📄 Reading file: ${absolutePath}\n`);

  try {
    // ファイルを読み込み
    const markdownContent = fs.readFileSync(absolutePath, "utf-8");

    // 環境変数チェック
    const githubToken = process.env.GITHUB_TOKEN;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;

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

    // サービスを初期化
    const loggerService = new LoggerService("output");
    const githubService = new GitHubService(
      githubToken,
      githubOwner,
      githubRepo,
    );
    const analyzerService = new AnalyzerService(
      openaiApiKey,
      process.env.OPENAI_MODEL || "gpt-4o",
      process.env.LANGUAGE || "ja",
      loggerService,
    );

    // Markdownを分析してタスクを抽出
    const proposals = await analyzerService.analyzeMarkdown(markdownContent);

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
