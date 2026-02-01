# MD to Issues 機能 実装計画

## 概要

Markdown ファイルを入力として受け取り、内容を匿名化した上でタスク分解し、GitHub Issue として起票する新機能。

## ユーザー要件

- **入力**: ユーザーが提供する Markdown ファイル
- **匿名化**: 人名 + 組織名（会社名・チーム名）を匿名化
- **タスク粒度**: Story 級（ユーザーストーリー・機能単位）
- **CLI**: `yarn md:issues <file>` で実行

## 既存コード再利用マップ

| コンポーネント | ファイル | 再利用方法 |
|---|---|---|
| GitHub Issue 作成 | `src/services/github.ts` `createIssue()` | そのまま利用 |
| OpenAI 呼び出しパターン | `src/services/analyzer.ts` | プロンプトを変えた新メソッド追加 |
| ログ保存 | `src/services/logger.ts` | そのまま利用 |
| インタラクティブ確認 | `src/index.ts` `askYesNo()`, `processProposals()` | パターンを再利用 |
| `IssueProposal` 型 | `src/types/index.ts` | `relatedSlackMessages` をオプショナルに変更 |
| 環境変数読み込み | `dotenv` | そのまま利用 |

## 実装ステップ

### Step 1: `IssueProposal` 型の拡張

**ファイル**: `src/types/index.ts`

`relatedSlackMessages` を optional に変更し、汎用的な `sourceRef` を追加:

```typescript
export interface IssueProposal {
  title: string;
  description: string;
  relatedSlackMessages?: string[];  // optional に変更
  reasoning: string;
}
```

既存の `analyzer.ts` と `index.ts` で `relatedSlackMessages` を参照している箇所にオプショナルチェーンを追加。

### Step 2: `AnalyzerService` に新メソッド追加

**ファイル**: `src/services/analyzer.ts`

新メソッド `analyzeMarkdown(markdownContent: string)` を追加:

1. **匿名化プロンプト**: 人名・組織名を `Person A`, `Company X` 等に置換するよう指示
2. **タスク分解プロンプト**: Story 級の粒度でタスクを抽出するよう指示
3. OpenAI API 呼び出し（既存パターンを踏襲）
4. JSON レスポンスを `IssueProposal[]` にパース
5. ログ保存

プロンプト設計（日本語版）:

```
あなたはプロジェクト管理を支援するAIアシスタントです。

以下の手順で処理してください：

## ステップ1: 匿名化
入力テキスト内の以下の情報を匿名化してください：
- 個人名 → Person A, Person B, ... に置換
- 組織名（会社名・チーム名） → Organization A, Organization B, ... に置換
※ 技術用語・プロダクト名・OSS名は匿名化しないでください

## ステップ2: タスク分解
匿名化されたテキストから、ストーリー（機能単位）レベルのタスクを抽出してください。
各タスクについて GitHub Issue として起票できる形式で出力してください。

## 出力形式
JSON:
[
  {
    "title": "Issue タイトル",
    "description": "Issue の詳細説明（Markdown形式）",
    "reasoning": "なぜこのタスクが必要か"
  }
]
```

### Step 3: 新コマンド作成

**ファイル**: `src/commands/mdToIssues.ts`

処理フロー:
1. CLI 引数からファイルパスを取得 (`process.argv[2]`)
2. ファイル存在チェック → `fs.readFileSync` で読み込み
3. 環境変数から `GITHUB_TOKEN`, `OPENAI_API_KEY`, `GITHUB_OWNER`, `GITHUB_REPO` を読み込み（Slack系は不要）
4. `AnalyzerService.analyzeMarkdown()` を呼び出し
5. 提案を表示 → `askYesNo()` でインタラクティブ確認
6. 承認分を `GitHubService.createIssue()` で起票

```
Usage: yarn md:issues <markdown-file>
```

### Step 4: `package.json` にスクリプト追加

```json
"md:issues": "tsx src/commands/mdToIssues.ts"
```

### Step 5: 既存コードの互換性修正

`relatedSlackMessages` を optional にしたことで影響を受ける箇所:

- `src/index.ts:115` — `proposal.relatedSlackMessages.length` → optional chain 追加
- `src/services/analyzer.ts:192` — `proposal.relatedSlackMessages.length` → optional chain 追加
- `src/services/logger.ts:133` — `proposal.relatedSlackMessages` チェック済み（影響なし）

## ファイル変更一覧

| 操作 | ファイル |
|---|---|
| 修正 | `src/types/index.ts` |
| 修正 | `src/services/analyzer.ts` |
| 修正 | `src/index.ts` |
| 新規 | `src/commands/mdToIssues.ts` |
| 修正 | `package.json` |

## 必要な環境変数

```
GITHUB_TOKEN=...
GITHUB_OWNER=...
GITHUB_REPO=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o     # optional
LANGUAGE=ja              # optional
```

`SLACK_BOT_TOKEN` / `SLACK_CHANNEL_*` は本コマンドでは不要。
