import dotenv from "dotenv";
import { GitHubService } from "../services/github.js";
import { GitHubCacheService } from "../services/githubCache.js";
import { loadReposConfig } from "../services/configLoader.js";

dotenv.config();

/**
 * 単一リポジトリを更新
 */
async function updateRepo(
  githubToken: string,
  owner: string,
  repo: string,
  cacheService: GitHubCacheService,
): Promise<boolean> {
  console.log(`\n📺 Repository: ${owner}/${repo}`);

  // 既存キャッシュを読み込み
  const existingCache = cacheService.loadCache(owner, repo);
  if (!existingCache) {
    console.log("   ❌ Cache not found. Run `yarn github:init` first.");
    return false;
  }

  console.log(`   📂 Last updated: ${existingCache.lastUpdated}`);
  console.log(`   Existing issues: ${existingCache.issues.length}`);

  const githubService = new GitHubService(githubToken, owner, repo);

  // 前回更新以降のIssueを差分取得
  const updatedIssues = await githubService.getIssuesSince(
    existingCache.lastUpdated,
    true,
  );

  // Issueをマージ
  const mergedIssues = cacheService.mergeIssues(
    existingCache.issues,
    updatedIssues,
  );

  // キャッシュを更新
  const updatedCache = {
    owner: owner,
    repo: repo,
    lastUpdated: new Date().toISOString(),
    issues: mergedIssues,
  };

  cacheService.saveCache(updatedCache);

  const addedCount = mergedIssues.length - existingCache.issues.length;
  console.log(
    `   ✅ Updated! Added/Updated: ${addedCount >= 0 ? addedCount : 0}`,
  );
  console.log(`   Total issues: ${mergedIssues.length}`);
  return true;
}

/**
 * 新しいIssueを取得してキャッシュに追加
 */
async function main() {
  console.log("🔄 GitHub Cache Update\n");

  // 環境変数チェック
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("GITHUB_TOKEN is required");
  }

  const cacheService = new GitHubCacheService("data");

  // 設定ファイルを確認
  const reposConfig = loadReposConfig();

  if (reposConfig && reposConfig.length > 0) {
    // 設定ファイルから複数リポジトリを処理
    console.log(
      `📋 Found ${reposConfig.length} repositories in config/github-repos.json`,
    );

    let successCount = 0;
    let skipCount = 0;

    for (const repoConfig of reposConfig) {
      try {
        const updated = await updateRepo(
          githubToken,
          repoConfig.owner,
          repoConfig.repo,
          cacheService,
        );
        if (updated) {
          successCount++;
        } else {
          skipCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error}`);
      }
    }

    console.log(`\n✨ Done! Updated: ${successCount}, Skipped: ${skipCount}`);
  } else {
    // 環境変数から単一リポジトリを処理（後方互換性）
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;

    if (!githubOwner) {
      throw new Error(
        "GITHUB_OWNER is required (or create config/github-repos.json)",
      );
    }
    if (!githubRepo) {
      throw new Error(
        "GITHUB_REPO is required (or create config/github-repos.json)",
      );
    }

    try {
      await updateRepo(githubToken, githubOwner, githubRepo, cacheService);
      console.log("\n✨ Done!");
    } catch (error) {
      console.error("\n❌ Error:", error);
      process.exit(1);
    }
  }
}

main();
