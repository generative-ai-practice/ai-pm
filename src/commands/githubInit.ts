import dotenv from "dotenv";
import { GitHubService } from "../services/github.js";
import { GitHubCacheService } from "../services/githubCache.js";

dotenv.config();

/**
 * GitHub全Issueを取得してキャッシュに保存
 */
async function main() {
  console.log("🚀 GitHub Cache Initialization\n");

  // 環境変数チェック
  const githubToken = process.env.GITHUB_TOKEN;
  const githubOwner = process.env.GITHUB_OWNER;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubToken) {
    throw new Error("GITHUB_TOKEN is required");
  }
  if (!githubOwner) {
    throw new Error("GITHUB_OWNER is required");
  }
  if (!githubRepo) {
    throw new Error("GITHUB_REPO is required");
  }

  try {
    // サービス初期化
    const githubService = new GitHubService(
      githubToken,
      githubOwner,
      githubRepo,
    );
    const cacheService = new GitHubCacheService("data");

    console.log(`📺 Repository: ${githubOwner}/${githubRepo}\n`);

    // 既存キャッシュをチェック
    const existingCache = cacheService.loadCache(githubOwner, githubRepo);
    if (existingCache) {
      console.log("⚠️  Cache already exists for this repository!");
      console.log(`   Existing issues: ${existingCache.issues.length}`);
      console.log(`   Last updated: ${existingCache.lastUpdated}`);
      console.log("\n💡 Use `yarn github:update` to fetch only new issues.");
      console.log("   Or delete data/github-*.json to re-initialize.\n");
      process.exit(0);
    }

    // 全Issueを取得（PRも含む）
    const issues = await githubService.getAllIssues(true);

    // キャッシュに保存
    const cache = {
      owner: githubOwner,
      repo: githubRepo,
      lastUpdated: new Date().toISOString(),
      issues: issues,
    };

    cacheService.saveCache(cache);

    console.log(`\n✅ Successfully initialized cache!`);
    console.log(`   Repository: ${githubOwner}/${githubRepo}`);
    console.log(`   Total issues: ${issues.length}`);
    console.log(
      `   Latest issue number: ${cacheService.getLatestIssueNumber(issues)}`,
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
