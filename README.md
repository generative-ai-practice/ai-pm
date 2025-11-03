# AI-Powered Project Manager

Slackの会話ログとGitHub Issuesを分析し、チケット化が漏れている話題を自動的に発見・提案するツールです。OpenAIのGPTを使って、チームの議論から重要なタスクを抽出し、GitHub Issueとして作成できます。

## 特徴

- 📊 **日付範囲指定**: 過去N日分のSlack会話を取得（デフォルト2日）
- 💬 **スレッド対応**: メインメッセージだけでなく、スレッド内の返信も含めて分析
- 🤖 **AI分析**: OpenAI GPTで会話内容を分析し、未チケット化の話題を発見
- 🔄 **重複チェック**: 既存のGitHub Issueと照合し、重複を避ける
- ✅ **インタラクティブ**: 提案ごとにY/Nで確認し、承認したものだけIssue化
- 🎯 **自動チャンネル参加**: パブリックチャンネルには自動的に参加
- 💾 **ログ保存**: LLMへの入出力を日付ごとにJSON形式とMarkdown形式で保存

## セットアップ

### 1. 依存パッケージのインストール

```bash
yarn install
```

### 2. Slack App の作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. "Create New App" → "From scratch" を選択
3. App名とワークスペースを設定
4. "OAuth & Permissions" に移動し、以下のBot Token Scopesを追加:
   - `channels:history` - パブリックチャンネルの履歴を読む
   - `channels:read` - チャンネル情報を読む
   - `channels:join` - パブリックチャンネルに自動参加
   - `groups:history` - プライベートチャンネルの履歴を読む
   - `groups:read` - プライベートチャンネル情報を読む
5. "Install to Workspace" をクリック
6. "Bot User OAuth Token" (`xoxb-` で始まる) をコピー

### 3. GitHub Personal Access Token の作成

1. [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens) にアクセス
2. "Generate new token (classic)" をクリック
3. 必要なスコープを選択:
   - `repo` (Issuesの読み書き権限)
4. トークンを生成してコピー

### 4. OpenAI API Key の取得

1. [OpenAI API Keys](https://platform.openai.com/api-keys) にアクセス
2. "Create new secret key" をクリック
3. API Keyをコピー

### 5. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、実際の値を設定:

```bash
# Slack設定
SLACK_BOT_TOKEN=xoxb-your-actual-token
SLACK_CHANNEL_NAME=your-channel-name

# GitHub設定
GITHUB_TOKEN=ghp_your-token
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo-name

# OpenAI設定
OPENAI_API_KEY=sk-your-api-key

# オプション
DATE_RANGE_DAYS=2  # 過去2日分を取得
```

## 使い方

### 基本的な実行

```bash
yarn start
```

### 実行の流れ

1. **データ収集**
   - Slackから指定期間のメッセージを取得（スレッド返信含む）
   - GitHubから同期間に作成されたIssueを取得

2. **AI分析**
   - OpenAI GPTがSlack会話を分析
   - 既存Issueと照合し、未チケット化の話題を抽出

3. **提案の確認**
   - 各提案が表示される
   - `y/n` で承認/却下を選択

4. **Issue作成**
   - `y` を選択した提案がGitHub Issueとして自動作成される

### 実行例

```
🚀 AI-Powered Project Manager

Analyzing Slack conversations and GitHub issues...

📅 Date range: 2025-11-01T15:00:00.000Z to 2025-11-03T14:59:59.999Z
   (Last 2 days)

📺 Looking up channel: general
   Found Channel ID: C1234567890

💬 Fetching Slack messages...
Fetching messages from 2025-11-01T15:00:00.000Z to 2025-11-03T14:59:59.999Z
Fetched 45 main messages
Fetched 23 thread replies
Total messages: 68

🐙 Fetching GitHub issues...
Fetched 5 issues in date range

Analyzing Slack conversations with OpenAI...
Found 3 issue proposals

📋 Found 3 issue proposal(s):
================================================================================

[1] APIレスポンスタイムの改善
--------------------------------------------------------------------------------

ユーザーから/api/searchエンドポイントのレスポンスが遅いという報告があります。
調査と最適化が必要です。

💭 Reasoning: Slackでパフォーマンス問題が議論されていますが、既存のIssueには含まれていません。

📎 Related Slack messages:
  - [2025-11-02T10:30:00.000Z] user1: "/api/searchが3秒くらいかかる"

================================================================================

📝 Processing proposals...

[1/3] APIレスポンスタイムの改善
--------------------------------------------------------------------------------

ユーザーから/api/searchエンドポイントのレスポンスが遅いという報告があります。
調査と最適化が必要です。

💭 Reasoning: Slackでパフォーマンス問題が議論されていますが、既存のIssueには含まれていません。

🎫 Create this issue on GitHub? (y/n): y

✅ Created: https://github.com/owner/repo/issues/42

...

✨ All proposals processed!
```

## 設定オプション

### 環境変数

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|-----------|------|
| `SLACK_BOT_TOKEN` | ✅ | - | Slack Bot User OAuth Token |
| `SLACK_CHANNEL_NAME` | * | - | チャンネル名（例: `general`） |
| `SLACK_CHANNEL_ID` | * | - | チャンネルID（例: `C1234567890`） |
| `GITHUB_TOKEN` | ✅ | - | GitHub Personal Access Token |
| `GITHUB_OWNER` | ✅ | - | GitHubユーザー名または組織名 |
| `GITHUB_REPO` | ✅ | - | リポジトリ名 |
| `OPENAI_API_KEY` | ✅ | - | OpenAI API Key |
| `OPENAI_MODEL` | ❌ | `gpt-4o` | 使用するOpenAIモデル |
| `DATE_RANGE_DAYS` | ❌ | `2` | 過去何日分のデータを取得するか |

\* `SLACK_CHANNEL_NAME` または `SLACK_CHANNEL_ID` のいずれか一方は必須

### 日付範囲のカスタマイズ

```bash
# 過去7日分を分析
DATE_RANGE_DAYS=7 yarn start
```

### OpenAIモデルの変更

```bash
# より高性能なモデルを使用
OPENAI_MODEL=gpt-4-turbo yarn start
```

## プロジェクト構成

```
ai-pm/
├── src/
│   ├── index.ts              # メインアプリケーション
│   ├── types/
│   │   └── index.ts          # 型定義
│   └── services/
│       ├── slack.ts          # Slack API連携
│       ├── github.ts         # GitHub API連携
│       ├── analyzer.ts       # OpenAI分析
│       └── logger.ts         # ログ保存
├── output/                   # ログファイルの保存先（自動生成）
│   ├── YYYY-MM-DD.json      # JSON形式のログ
│   └── YYYY-MM-DD-readable.md # 人間が読みやすいMarkdown形式
├── .env                      # 環境変数（gitignore済み）
├── .env.example              # 環境変数テンプレート
├── package.json
└── README.md
```

## ログ機能

### 自動保存されるログ

ツールを実行するたびに、`output/`ディレクトリに以下のログが保存されます：

1. **JSON形式ログ** (`YYYY-MM-DD.json`)
   - LLMへの入力（Slackメッセージ、既存Issues）
   - LLMからの出力（生のレスポンス、パース済み提案）
   - タイムスタンプ
   - 同じ日に複数回実行した場合は追記される

2. **Markdown形式ログ** (`YYYY-MM-DD-readable.md`)
   - 人間が読みやすい形式で整形
   - 入力データと出力データを見やすく表示
   - 提案ごとに構造化されて記録

### ログの確認

```bash
# 今日のログを確認（JSON形式）
cat output/2025-11-03.json

# 今日のログを確認（Markdown形式）
cat output/2025-11-03-readable.md

# または、お好みのエディタで開く
code output/2025-11-03-readable.md
```

### ログの活用例

- LLMの分析精度を検証
- 過去の提案を振り返る
- プロンプトの改善に活用
- チームメンバーとの共有
- 監査ログとして保持

## トラブルシューティング

### "not_in_channel" エラー

**パブリックチャンネル:**
- `channels:join` スコープを追加
- Slack Appを再インストール（"Reinstall App"）

**プライベートチャンネル:**
- Slackでチャンネルを開く
- `/invite @your-bot-name` を実行

### "missing_scope" エラー

必要なスコープを追加した後、必ず **"Reinstall App"** をクリックしてください。

### OpenAI API エラー

- API Keyが正しいか確認
- API利用可能枠が残っているか確認
- モデル名が正しいか確認（`gpt-4o`, `gpt-4-turbo` など）

### GitHub API エラー

- トークンに `repo` スコープがあるか確認
- `GITHUB_OWNER` と `GITHUB_REPO` が正しいか確認
- リポジトリへのアクセス権限があるか確認

## ライセンス

MIT

## 貢献

Issue や Pull Request を歓迎します！
