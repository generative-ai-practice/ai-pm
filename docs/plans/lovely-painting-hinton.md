# Slack分析 → Issue起票 slash command 作成プラン

## 概要

`.claude/commands/analyze-slack.md` を作成し、`/analyze-slack 2026-02` のように呼び出せる slash command を実装する。

## 作成ファイル

**`.claude/commands/analyze-slack.md`** （1ファイルのみ）

新規TSコードは不要。Claude Codeが既存ツール（Read, Bash, gh CLI, yarn コマンド）を使って実行する。

## コマンドの動作フロー

### Step 1: データ更新 & Slackログ読み込み
1. 引数から対象月を取得（例: `2026-02`）
2. `yarn slack:update` → Slackキャッシュを最新化
3. `yarn slack:export-md {YYYY-MM}` → 対象月のMDを生成/更新
4. `output/slack-{YYYY-MM}.md` を読み込む

> **注**: `yarn github:update` は不要。Step 3 で `gh` CLI が直接GitHub APIを叩くため。

### Step 2: Slackログ分析 → Issue候補抽出
1. Slackログを分析し、**Issue化すべきトピック**を抽出
   - タスク依頼、バグ報告、機能要望、TODO、改善提案などを識別
   - 単なる雑談・共有・完了報告は除外
2. 抽出結果をMarkdownの一覧で出力

### Step 3: 既存Issue/PRの確認
1. `config/github-repos.json` を読み込み、監視対象リポジトリ一覧を取得
2. 各トピックについて：
   - **リポジトリ推測**: Slackメッセージ中のGitHub URL・プロジェクト名・技術キーワードから対象リポジトリを推測し、**推測根拠を明示**
   - **既存Issue/PR検索**: `gh search issues "キーワード" --repo {owner}/{repo} --json number,title,url,state` で検索
   - 見つかった場合 → `gh issue view {number} --repo {owner}/{repo}` で詳細取得し、URL + 概要を記載
   - 見つからない場合 → 「未起票」と記載

### Step 4: 未起票Issueの作成
1. 未起票の各トピックについて、**タイトルと本文を提案**（Slack会話の文脈から生成）
2. ユーザーに一覧提示し確認（作成する/しない/修正する）
3. 承認されたものを `gh issue create --repo {owner}/{repo} --title "..." --body "..."` で作成

## 出力フォーマット例

```markdown
## Slack分析結果（2026-02）

### 1. [mulmocast-cli] markdownレイアウトのドキュメント化
- **ステータス**: 関連PR あり
- **関連**: https://github.com/receptron/mulmocast-cli/pull/1141, #1144
- **推測根拠**: メッセージ中にmulmocast-cli PRへの直接リンクあり
- **対応**: ドキュメント化の依頼は未Issue化 → 起票推奨

### 2. [MulmoChat] Gemini tools複雑エラーの対応
- **ステータス**: 未起票
- **推測根拠**: "mulmochat" への言及 + pluginエラーの報告
- **対応**: 起票推奨
- **提案タイトル**: Geminiでplugin数が多い場合にtools複雑エラーが発生する
- **提案本文**:
  > pluginが増えた状態でdefaultのGeminiを使うとtoolsが複雑すぎてエラーになる。
  > role を絞れば回避可能だが、根本対応が必要。
  > 関連Slack: [2026-02-01T20:18:25Z]
```

## コマンドファイル（.claude/commands/analyze-slack.md）の構成

プロンプトとして以下を記述：
1. 引数の受け取り方（`$ARGUMENTS` で月を受け取る）
2. Step 1〜3 のワークフロー指示
3. リポジトリ推測時に根拠を必ず示すルール
4. 出力フォーマットの定義
5. Issue作成前にユーザー確認を必ず取るルール

## 変更範囲

- **作成**: `.claude/commands/analyze-slack.md`（1ファイルのみ）
- **変更なし**: 既存のTS コード、設定ファイル

## 検証方法

1. `/analyze-slack 2026-02` を実行
2. `output/slack-2026-02.md` が読み込まれることを確認
3. Issue候補一覧がMarkdownで出力されることを確認
4. 既存Issue/PRのURL・概要が正しく表示されることを確認
5. 未起票Issueの作成確認プロンプトが出ることを確認
