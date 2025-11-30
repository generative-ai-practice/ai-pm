import * as fs from "fs";
import * as path from "path";
import { GitHubIssue } from "./github.js";

export interface GitHubCache {
  owner: string;
  repo: string;
  lastUpdated: string; // ISO date string
  issues: GitHubIssue[];
}

export class GitHubCacheService {
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
  private getCacheFilePath(owner: string, repo: string): string {
    return path.join(this.cacheDir, `github-${owner}-${repo}.json`);
  }

  /**
   * キャッシュを読み込む
   */
  loadCache(owner: string, repo: string): GitHubCache | null {
    const filePath = this.getCacheFilePath(owner, repo);

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
  saveCache(cache: GitHubCache): void {
    const filePath = this.getCacheFilePath(cache.owner, cache.repo);

    try {
      fs.writeFileSync(filePath, JSON.stringify(cache, null, 2), "utf-8");
      console.log(`Cache saved to ${filePath}`);
    } catch (error) {
      console.error(`Error saving cache to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 新しいIssueをキャッシュにマージ
   * Issue番号をキーにして重複を排除
   */
  mergeIssues(
    existingIssues: GitHubIssue[],
    newIssues: GitHubIssue[],
  ): GitHubIssue[] {
    const issueMap = new Map<number, GitHubIssue>();

    // 既存のIssueをMapに追加
    for (const issue of existingIssues) {
      issueMap.set(issue.number, issue);
    }

    // 新しいIssueをマージ（重複は上書き）
    for (const issue of newIssues) {
      issueMap.set(issue.number, issue);
    }

    // Issue番号でソートして返す
    return Array.from(issueMap.values()).sort((a, b) => b.number - a.number);
  }

  /**
   * 最新のIssue番号を取得
   */
  getLatestIssueNumber(issues: GitHubIssue[]): number {
    if (issues.length === 0) {
      return 0;
    }

    return Math.max(...issues.map((issue) => issue.number));
  }
}
