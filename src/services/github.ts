import { Octokit } from '@octokit/rest';
import { DateRange } from '../types/index.js';

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  created_at: string;
  html_url: string;
  state: string;
  labels: string[];
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
   * 日付範囲内に作成されたIssueを取得
   */
  async getIssuesInDateRange(dateRange: DateRange): Promise<GitHubIssue[]> {
    try {
      console.log(
        `Fetching GitHub issues from ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`
      );

      const issues: GitHubIssue[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await this.octokit.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: 'all',
          sort: 'created',
          direction: 'desc',
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
          if (createdAt >= dateRange.startDate && createdAt <= dateRange.endDate) {
            issues.push({
              number: issue.number,
              title: issue.title,
              body: issue.body,
              created_at: issue.created_at,
              html_url: issue.html_url,
              state: issue.state,
              labels: issue.labels.map((label) =>
                typeof label === 'string' ? label : label.name || ''
              ),
            });
          }
        }

        page++;
      }

      console.log(`Fetched ${issues.length} issues in date range`);
      return issues;
    } catch (error) {
      console.error('Error fetching GitHub issues:', error);
      throw error;
    }
  }

  /**
   * 新しいIssueを作成
   */
  async createIssue(
    title: string,
    body: string,
    labels?: string[]
  ): Promise<GitHubIssue> {
    try {
      const response = await this.octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels,
      });

      console.log(`Created issue #${response.data.number}: ${response.data.title}`);

      return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        created_at: response.data.created_at,
        html_url: response.data.html_url,
        state: response.data.state,
        labels: response.data.labels.map((label) =>
          typeof label === 'string' ? label : label.name || ''
        ),
      };
    } catch (error) {
      console.error('Error creating GitHub issue:', error);
      throw error;
    }
  }

  /**
   * Issueを文字列としてフォーマット
   */
  formatIssues(issues: GitHubIssue[]): string {
    if (issues.length === 0) {
      return 'No issues found in the date range.';
    }

    let output = '';
    for (const issue of issues) {
      output += `\n#${issue.number}: ${issue.title}\n`;
      output += `Created: ${issue.created_at}\n`;
      output += `State: ${issue.state}\n`;
      if (issue.labels.length > 0) {
        output += `Labels: ${issue.labels.join(', ')}\n`;
      }
      if (issue.body) {
        output += `Body:\n${issue.body}\n`;
      }
      output += `URL: ${issue.html_url}\n`;
      output += '---\n';
    }
    return output;
  }
}
