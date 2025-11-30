import * as fs from "fs";
import * as path from "path";

export interface LogEntry {
  timestamp: string;
  request: {
    slackMessages: string;
    existingIssues: string;
  };
  response: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proposals: any[];
    rawResponse: string;
  };
}

export class LoggerService {
  private outputDir: string;

  constructor(outputDir: string = "output") {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  /**
   * outputディレクトリが存在することを確認
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`Created output directory: ${this.outputDir}`);
    }
  }

  /**
   * 現在の日時から YYYY-MM-DD-HHmmss 形式のファイル名を生成
   */
  private getLogFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}-${hours}${minutes}${seconds}.json`;
  }

  /**
   * ログファイルのフルパスを取得
   */
  private getLogFilePath(): string {
    return path.join(this.outputDir, this.getLogFileName());
  }

  /**
   * ログエントリを保存（毎回新しいファイルを作成）
   */
  saveLog(entry: LogEntry): void {
    const logFilePath = this.getLogFilePath();

    try {
      // 新しいファイルとして保存（配列形式で1エントリのみ）
      fs.writeFileSync(logFilePath, JSON.stringify([entry], null, 2), "utf-8");
      console.log(`\n💾 Log saved to: ${logFilePath}`);
    } catch (error) {
      console.error(`Error saving log: ${error}`);
    }
  }

  /**
   * LLMの入出力をログに記録
   */
  logLLMInteraction(
    slackMessages: string,
    existingIssues: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proposals: any[],
    rawResponse: string,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      request: {
        slackMessages,
        existingIssues,
      },
      response: {
        proposals,
        rawResponse,
      },
    };

    this.saveLog(entry);
  }

  /**
   * 人間が読みやすい形式でログを保存（Markdown形式）
   */
  saveReadableLog(
    slackMessages: string,
    existingIssues: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proposals: any[],
    rawResponse: string,
  ): void {
    const now = new Date();
    const timestamp = now.toISOString();
    const dateStr = this.getLogFileName().replace(".json", "");
    const readableFileName = `${dateStr}.md`;
    const readableFilePath = path.join(this.outputDir, readableFileName);

    let content = `# AI-PM Analysis Log\n\n`;
    content += `**Date**: ${timestamp}\n\n`;
    content += `---\n\n`;

    content += `## 📥 Input: Slack Messages\n\n`;
    content += `\`\`\`\n${slackMessages}\n\`\`\`\n\n`;

    content += `## 📥 Input: Existing GitHub Issues\n\n`;
    content += `\`\`\`\n${existingIssues}\n\`\`\`\n\n`;

    content += `---\n\n`;

    content += `## 📤 Output: LLM Raw Response\n\n`;
    content += `\`\`\`json\n${rawResponse}\n\`\`\`\n\n`;

    content += `## 📤 Output: Parsed Proposals (${proposals.length})\n\n`;
    proposals.forEach((proposal, index) => {
      content += `### Proposal ${index + 1}: ${proposal.title}\n\n`;
      content += `**Description**:\n${proposal.description}\n\n`;
      content += `**Reasoning**:\n${proposal.reasoning}\n\n`;
      if (
        proposal.relatedSlackMessages &&
        proposal.relatedSlackMessages.length > 0
      ) {
        content += `**Related Slack Messages**:\n`;
        proposal.relatedSlackMessages.forEach((msg: string) => {
          content += `- ${msg}\n`;
        });
        content += `\n`;
      }
      content += `---\n\n`;
    });

    try {
      // 新しいファイルとして保存
      fs.writeFileSync(readableFilePath, content, "utf-8");
      console.log(`📄 Readable log saved to: ${readableFilePath}`);
    } catch (error) {
      console.error(`Error saving readable log: ${error}`);
    }
  }
}
