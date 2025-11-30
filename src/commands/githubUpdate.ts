import dotenv from "dotenv";
import { GitHubService } from "../services/github.js";
import { GitHubCacheService } from "../services/githubCache.js";

dotenv.config();

/**
 * 新しいIssueを取得してキャッシュに追加
 */
async function main() {
  console.log("🔄 GitHub Cache Update\n");

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

    // 既存キャッシュを読み込み
    const existingCache = cacheService.loadCache(githubOwner, githubRepo);
    if (!existingCache) {
      console.error("❌ Cache not found. Please run `yarn github:init` first.");
      process.exit(1);
    }

    console.log(`📂 Loaded existing cache:`);
    console.log(`   Last updated: ${existingCache.lastUpdated}`);
    console.log(`   Existing issues: ${existingCache.issues.length}`);
    console.log();

    // 全Issueを再取得（新しいIssueや更新されたIssueを含む）
    console.log("💬 Fetching all issues to update...");
    const allIssues = await githubService.getAllIssues(true);

    // メッセージをマージ
    const mergedIssues = cacheService.mergeIssues(
      existingCache.issues,
      allIssues,
    );

    // キャッシュを更新
    const updatedCache = {
      owner: githubOwner,
      repo: githubRepo,
      lastUpdated: new Date().toISOString(),
      issues: mergedIssues,
    };

    cacheService.saveCache(updatedCache);

    console.log(`\n✅ Successfully updated cache!`);
    console.log(`   Total issues: ${mergedIssues.length}`);
    console.log(`   Previous: ${existingCache.issues.length}`);
    console.log(
      `   Added/Updated: ${mergedIssues.length - existingCache.issues.length}`,
    );
    console.log(
      `   Latest issue number: ${cacheService.getLatestIssueNumber(mergedIssues)}`,
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
