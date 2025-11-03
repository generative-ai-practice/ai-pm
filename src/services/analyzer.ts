import OpenAI from 'openai';
import { IssueProposal } from '../types/index.js';

export class AnalyzerService {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Slackの会話と既存のGitHub Issueを分析して、
   * チケット化が漏れている話題を提案
   */
  async analyzeAndPropose(
    slackMessages: string,
    existingIssues: string
  ): Promise<IssueProposal[]> {
    console.log('\nAnalyzing Slack conversations with OpenAI...');

    const prompt = `あなたはプロジェクトマネージャーのアシスタントです。
以下のSlackの会話ログと、既存のGitHub Issueを分析して、チケット化されていない重要な話題や課題を抽出してください。

## Slack会話ログ
${slackMessages}

## 既存のGitHub Issues
${existingIssues}

## タスク
1. Slackの会話から、以下のような要素を抽出してください：
   - バグ報告
   - 新機能の提案や議論
   - 改善案
   - 技術的な課題
   - TODO項目

2. それぞれの要素について、既存のGitHub Issueで既にカバーされているか確認してください。

3. まだチケット化されていない重要な話題について、Issue提案を作成してください。

## 出力形式
JSON形式で、以下のような配列を返してください：

[
  {
    "title": "Issueのタイトル（簡潔に）",
    "description": "Issueの詳細説明（Markdown形式）",
    "relatedSlackMessages": ["関連するSlackメッセージのタイムスタンプや引用"],
    "reasoning": "なぜこのIssueを作成すべきか（既存Issueとの違いなど）"
  }
]

提案がない場合は空の配列 [] を返してください。

JSONのみを返してください。他のテキストは含めないでください。`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'あなたはプロジェクト管理を支援するAIアシスタントです。Slackの会話を分析し、GitHub Issueの提案を行います。必ずJSON形式で回答してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('No response from OpenAI');
        return [];
      }

      // JSONをパース
      const parsed = JSON.parse(content);

      // 配列が直接返される場合と、proposalsキーで返される場合の両方に対応
      const proposals = Array.isArray(parsed) ? parsed : parsed.proposals || [];

      console.log(`Found ${proposals.length} issue proposals`);
      return proposals as IssueProposal[];
    } catch (error) {
      console.error('Error analyzing with OpenAI:', error);
      throw error;
    }
  }

  /**
   * 提案を読みやすい形式でフォーマット
   */
  formatProposals(proposals: IssueProposal[]): string {
    if (proposals.length === 0) {
      return '\n✓ No new issues to propose. All topics seem to be covered!';
    }

    let output = `\n📋 Found ${proposals.length} issue proposal(s):\n`;
    output += '='.repeat(80) + '\n';

    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      output += `\n[${i + 1}] ${proposal.title}\n`;
      output += '-'.repeat(80) + '\n';
      output += `\n${proposal.description}\n`;
      output += `\n💭 Reasoning: ${proposal.reasoning}\n`;

      if (proposal.relatedSlackMessages.length > 0) {
        output += `\n📎 Related Slack messages:\n`;
        for (const msg of proposal.relatedSlackMessages) {
          output += `  - ${msg}\n`;
        }
      }

      output += '\n' + '='.repeat(80) + '\n';
    }

    return output;
  }
}
