export interface SlackMessage {
  type: string;
  user?: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  replies?: SlackMessage[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface IssueProposal {
  title: string;
  description: string;
  relatedSlackMessages: string[];
  reasoning: string;
}

export interface Config {
  slack: {
    token: string;
    channelName?: string;
    channelId?: string;
  };
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  openai: {
    apiKey: string;
    model?: string;
  };
  dateRange: {
    days: number; // 何日分のデータを取得するか
  };
  language: string; // 分析とチケットの言語
}
