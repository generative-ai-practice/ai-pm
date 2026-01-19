import * as fs from "fs";
import * as path from "path";

export interface RepoConfig {
  owner: string;
  repo: string;
}

export interface GitHubReposConfig {
  repositories: RepoConfig[];
}

/**
 * 設定ファイルからリポジトリ一覧を読み込む
 * ファイルが存在しない場合は null を返す
 * ファイルが存在するが不正な場合はエラーを throw する
 */
export function loadReposConfig(configPath?: string): RepoConfig[] | null {
  const filePath =
    configPath || path.join(process.cwd(), "config", "github-repos.json");

  if (!fs.existsSync(filePath)) {
    return null;
  }

  // ファイルが存在する場合は正しく読み込めなければエラー
  const data = fs.readFileSync(filePath, "utf-8");
  let config: GitHubReposConfig;

  try {
    config = JSON.parse(data);
  } catch {
    throw new Error(`Invalid JSON in ${filePath}`);
  }

  if (!config.repositories || !Array.isArray(config.repositories)) {
    throw new Error(`"repositories" array is required in ${filePath}`);
  }

  // 各エントリのバリデーション
  for (let i = 0; i < config.repositories.length; i++) {
    const repo = config.repositories[i];
    if (!repo.owner || typeof repo.owner !== "string") {
      throw new Error(
        `Invalid entry at index ${i}: "owner" is required and must be a string`,
      );
    }
    if (!repo.repo || typeof repo.repo !== "string") {
      throw new Error(
        `Invalid entry at index ${i}: "repo" is required and must be a string`,
      );
    }
  }

  return config.repositories;
}
