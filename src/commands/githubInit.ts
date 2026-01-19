import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { GitHubService } from "../services/github.js";
import { GitHubCacheService } from "../services/githubCache.js";

dotenv.config();

interface RepoConfig {
  owner: string;
  repo: string;
}

interface GitHubReposConfig {
  repositories: RepoConfig[];
}

/**
 * 設定ファイルからリポジトリ一覧を読み込む
 */
function loadReposConfig(): RepoConfig[] | null {
  const configPath = path.join(process.cwd(), "config", "github-repos.json");

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(configPath, "utf-8");
    const config: GitHubReposConfig = JSON.parse(data);
    return config.repositories;
  } catch (error) {
    console.error(`Error loading config from ${configPath}:`, error);
    return null;
  }
}

/**
 * 単一リポジトリを初期化
 */
async function initializeRepo(
  githubToken: string,
  owner: string,
  repo: string,
  cacheService: GitHubCacheService,
): Promise<boolean> {
  console.log(`\n📺 Repository: ${owner}/${repo}`);

  // 既存キャッシュをチェック
  const existingCache = cacheService.loadCache(owner, repo);
  if (existingCache) {
    console.log("   ⚠️  Cache already exists!");
    console.log(`   Existing issues: ${existingCache.issues.length}`);
    console.log(`   Last updated: ${existingCache.lastUpdated}`);
    console.log("   💡 Use `yarn github:update` to fetch only new issues.");
    return false;
  }

  const githubService = new GitHubService(githubToken, owner, repo);

  // 全Issueを取得（PRも含む）
  const issues = await githubService.getAllIssues(true);

  // キャッシュに保存
  const cache = {
    owner: owner,
    repo: repo,
    lastUpdated: new Date().toISOString(),
    issues: issues,
  };

  cacheService.saveCache(cache);

  console.log(`   ✅ Initialized! Total issues: ${issues.length}`);
  console.log(
    `   Latest issue number: ${cacheService.getLatestIssueNumber(issues)}`,
  );
  return true;
}

/**
 * GitHub全Issueを取得してキャッシュに保存
 */
async function main() {
  console.log("🚀 GitHub Cache Initialization\n");

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
        const initialized = await initializeRepo(
          githubToken,
          repoConfig.owner,
          repoConfig.repo,
          cacheService,
        );
        if (initialized) {
          successCount++;
        } else {
          skipCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error}`);
      }
    }

    console.log(
      `\n✨ Done! Initialized: ${successCount}, Skipped: ${skipCount}`,
    );
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
      await initializeRepo(githubToken, githubOwner, githubRepo, cacheService);
      console.log("\n✨ Done!");
    } catch (error) {
      console.error("\n❌ Error:", error);
      process.exit(1);
    }
  }
}

main();
