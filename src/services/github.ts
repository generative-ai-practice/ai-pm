import { Octokit } from "@octokit/rest";
import { DateRange } from "../types/index.js";

export interface GitHubComment {
  id: number;
  user: string;
  created_at: string;
  body: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  created_at: string;
  html_url: string;
  state: string;
  labels: string[];
  comments?: GitHubComment[];
}

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * 全てのIssueを取得（PRも含む、state: all）
   */
  async getAllIssues(
    includePullRequests: boolean = true,
    includeComments: boolean = true,
  ): Promise<GitHubIssue[]> {
    try {
      console.log("📋 Fetching all GitHub issues...");

      const issues: GitHubIssue[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        console.log(`   Fetching page ${page}...`);

        const response = await this.octokit.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: "all",
          sort: "created",
          direction: "desc",
          per_page: perPage,
          page: page,
        });

        if (response.data.length === 0) {
          break;
        }

        for (const issue of response.data) {
          // プルリクエストの扱い
          if (issue.pull_request && !includePullRequests) {
            continue;
          }

          issues.push({
            number: issue.number,
            title: issue.title,
            body: issue.body,
            created_at: issue.created_at,
            html_url: issue.html_url,
            state: issue.state,
            labels: issue.labels.map((label) =>
              typeof label === "string" ? label : label.name || "",
            ),
          });
        }

        page++;
      }

      console.log(`   Fetched ${issues.length} issues total`);

      // コメントを取得
      if (includeComments) {
        console.log("💬 Fetching comments for each issue...");
        for (let i = 0; i < issues.length; i++) {
          const issue = issues[i];
          if ((i + 1) % 50 === 0) {
            console.log(`   Processing ${i + 1}/${issues.length}...`);
          }
          issue.comments = await this.getCommentsForIssue(issue.number);
        }
        console.log("   Comments fetched for all issues");
      }

      return issues;
    } catch (error) {
      console.error("Error fetching GitHub issues:", error);
      throw error;
    }
  }

  /**
   * Issue のコメントを取得
   */
  async getCommentsForIssue(issueNumber: number): Promise<GitHubComment[]> {
    try {
      const comments: GitHubComment[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await this.octokit.issues.listComments({
          owner: this.owner,
          repo: this.repo,
          issue_number: issueNumber,
          per_page: perPage,
          page: page,
        });

        if (response.data.length === 0) {
          break;
        }

        for (const comment of response.data) {
          comments.push({
            id: comment.id,
            user: comment.user?.login || "unknown",
            created_at: comment.created_at,
            body: comment.body || "",
          });
        }

        page++;
      }

      return comments;
    } catch (error) {
      console.error(
        `Error fetching comments for issue #${issueNumber}:`,
        error,
      );
      return [];
    }
  }

  /**
   * 指定日時以降に更新されたIssueを取得（差分取得用）
   */
  async getIssuesSince(
    since: string,
    includePullRequests: boolean = true,
    includeComments: boolean = true,
  ): Promise<GitHubIssue[]> {
    try {
      console.log(`📋 Fetching GitHub issues updated since ${since}...`);

      const issues: GitHubIssue[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        console.log(`   Fetching page ${page}...`);

        const response = await this.octokit.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: "all",
          since: since,
          sort: "updated",
          direction: "desc",
          per_page: perPage,
          page: page,
        });

        if (response.data.length === 0) {
          break;
        }

        for (const issue of response.data) {
          // プルリクエストの扱い
          if (issue.pull_request && !includePullRequests) {
            continue;
          }

          issues.push({
            number: issue.number,
            title: issue.title,
            body: issue.body,
            created_at: issue.created_at,
            html_url: issue.html_url,
            state: issue.state,
            labels: issue.labels.map((label) =>
              typeof label === "string" ? label : label.name || "",
            ),
          });
        }

        page++;
      }

      console.log(`   Fetched ${issues.length} updated issues`);

      // コメントを取得
      if (includeComments && issues.length > 0) {
        console.log("💬 Fetching comments for updated issues...");
        for (let i = 0; i < issues.length; i++) {
          const issue = issues[i];
          if ((i + 1) % 50 === 0) {
            console.log(`   Processing ${i + 1}/${issues.length}...`);
          }
          issue.comments = await this.getCommentsForIssue(issue.number);
        }
        console.log("   Comments fetched for all updated issues");
      }

      return issues;
    } catch (error) {
      console.error("Error fetching GitHub issues:", error);
      throw error;
    }
  }

  /**
   * 日付範囲内に作成されたIssueを取得
   */
  async getIssuesInDateRange(dateRange: DateRange): Promise<GitHubIssue[]> {
    try {
      console.log(
        `Fetching GitHub issues from ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`,
      );

      const issues: GitHubIssue[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await this.octokit.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: "all",
          sort: "created",
          direction: "desc",
          per_page: perPage,
          page: page,
        });

        if (response.data.length === 0) {
          break;
        }

        for (const issue of response.data) {
          // プルリクエストは除外
          if (issue.pull_request) {
            continue;
          }

          const createdAt = new Date(issue.created_at);

          // 日付範囲より前のものが出てきたら終了
          if (createdAt < dateRange.startDate) {
            console.log(`Fetched ${issues.length} issues in date range`);
            return issues;
          }

          // 日付範囲内のものを追加
          if (
            createdAt >= dateRange.startDate &&
            createdAt <= dateRange.endDate
          ) {
            issues.push({
              number: issue.number,
              title: issue.title,
              body: issue.body,
              created_at: issue.created_at,
              html_url: issue.html_url,
              state: issue.state,
              labels: issue.labels.map((label) =>
                typeof label === "string" ? label : label.name || "",
              ),
            });
          }
        }

        page++;
      }

      console.log(`Fetched ${issues.length} issues in date range`);
      return issues;
    } catch (error) {
      console.error("Error fetching GitHub issues:", error);
      throw error;
    }
  }

  /**
   * 新しいIssueを作成
   */
  async createIssue(
    title: string,
    body: string,
    labels?: string[],
  ): Promise<GitHubIssue> {
    try {
      const response = await this.octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels,
      });

      console.log(
        `Created issue #${response.data.number}: ${response.data.title}`,
      );

      return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        created_at: response.data.created_at,
        html_url: response.data.html_url,
        state: response.data.state,
        labels: response.data.labels.map((label) =>
          typeof label === "string" ? label : label.name || "",
        ),
      };
    } catch (error) {
      console.error("Error creating GitHub issue:", error);
      throw error;
    }
  }

  /**
   * Issueを文字列としてフォーマット
   */
  formatIssues(issues: GitHubIssue[]): string {
    if (issues.length === 0) {
      return "No issues found in the date range.";
    }

    let output = "";
    for (const issue of issues) {
      output += `\n#${issue.number}: ${issue.title}\n`;
      output += `Created: ${issue.created_at}\n`;
      output += `State: ${issue.state}\n`;
      if (issue.labels.length > 0) {
        output += `Labels: ${issue.labels.join(", ")}\n`;
      }
      if (issue.body) {
        output += `Body:\n${issue.body}\n`;
      }
      output += `URL: ${issue.html_url}\n`;
      output += "---\n";
    }
    return output;
  }
}
