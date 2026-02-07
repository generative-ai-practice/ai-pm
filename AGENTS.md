# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイドラインです。

## プロジェクト概要

Slackの会話を分析し、未起票のトピックをGitHub Issueとして提案するAI駆動のプロジェクトマネージャー。OpenAI GPTを使ってチーム議論から重要なタスクを抽出する。

## コマンド

```bash
yarn install          # 依存パッケージのインストール
yarn start            # メイン分析の実行（yarn dev と同じ）
yarn lint             # src/ のESLintチェック
yarn format           # Prettierによるフォーマット

# キャッシュ管理 - データをローカルの data/ に取得・保存
yarn slack:init       # Slackメッセージの初回全件取得
yarn slack:update     # 前回以降の新しいメッセージのみ取得
yarn slack:resume     # 中断された取得の再開
yarn slack:export-md  # キャッシュ済みメッセージをMarkdownにエクスポート

yarn github:init      # GitHub Issueの初回全件取得
yarn github:update    # 前回以降の新しいIssueのみ取得
```

## アーキテクチャ

エントリーポイント: `src/index.ts` - ワークフローを制御するCLIツール:
1. 設定されたチャンネルからSlackメッセージ（スレッド含む）を取得
2. 設定されたリポジトリからGitHub Issueを取得
3. 両方をOpenAIに送り、未起票のトピックを分析
4. 各提案についてユーザーに対話的に確認（y/n）
5. 承認された提案をGitHub Issueとして作成

### サービス (`src/services/`)

- **slack.ts** - Slack Web API連携（メッセージ取得、チャンネル解決、自動参加）
- **slackCache.ts** - SlackメッセージのローカルJSONキャッシュ（`data/slack-{channelId}.json`）
- **github.ts** - OctokitベースのGitHub API（Issue取得・作成）
- **githubCache.ts** - GitHub IssueのローカルJSONキャッシュ（`data/github-{owner}-{repo}.json`）
- **analyzer.ts** - OpenAI連携（プロンプト構築、JSONレスポンスを `IssueProposal[]` にパース）
- **logger.ts** - LLMの入出力を `output/` にJSON・Markdown形式で保存

### コマンド (`src/commands/`)

キャッシュ管理用のCLIコマンド。各コマンドはyarnで実行可能なスタンドアロンスクリプト。

### 型定義 (`src/types/index.ts`)

主要インターフェース: `SlackMessage`, `IssueProposal`, `Config`, `DateRange`

## データストレージ

- `data/` - ローカルキャッシュファイル（Slackメッセージ、GitHub Issue）
- `data/knowledge/` - 各リポジトリの知見（主要Issue、決定事項、進行中の取り組み等）
- `output/` - LLM分析ログ（JSON・Markdown形式）

## ナレッジ管理

`data/knowledge/{リポジトリ名}.md` に各リポジトリの知見を蓄積する（git管理外）。

- `/analyze-slack` のStep 3では、`gh search` に加えてナレッジファイルも参照し、既存Issueとの重複を正確に判定する。
- 作業完了後は `/update-knowledge` の実行を提案し、得られた知見を蓄積する。

## 作業完了時のルール

作業（Slack分析、Issue確認、デバッグ等）が完了したら、以下を行う:
1. `/update-knowledge` を実行するかユーザーに確認する
2. `/improve-metadata` を実行するかユーザーに確認する
3. 改善提案があればフィードバックする（コマンドの改善、ワークフローの効率化等）

## 環境変数

必須: `SLACK_BOT_TOKEN`, `GITHUB_TOKEN`, `OPENAI_API_KEY`
GitHub対象: `config/github-repos.json` または `GITHUB_OWNER` + `GITHUB_REPO`
加えて `SLACK_CHANNEL_NAME` または `SLACK_CHANNEL_ID` のいずれか

オプション: `OPENAI_MODEL`（デフォルト: gpt-4o）, `DATE_RANGE_DAYS`（デフォルト: 2）, `LANGUAGE`（デフォルト: ja）
