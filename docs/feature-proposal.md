# 機能拡張の検討レポート

## 現状の仕組み

```
[Slack API] → 期間内メッセージ取得 →
                                    → [OpenAI] 一括分析 → 提案 → y/n → Issue作成
[GitHub API] → 期間内Issue取得    →
```

- 毎回APIから取得（ローカルキャッシュなし）
- AIに全データを一括で渡してプロンプトで判断させている
- `output/` はログ保存用のみ（分析には使われない）

---

## やりたいこと

### 1. Slackビジネスアイデアのピックアップ
- Slackからビジネスアイデアを抽出したい

### 2. GitHub Issues の優先度提案
- 残っているIssueから「次やるべきもの」をAIに提案させたい

### 3. GitHub Issue 起票の精度向上
- 現状の一括処理から2ステップ処理に変更
- Step 1: Slack全体 → AI → issue候補リスト（仮）を生成
- Step 2: 候補1件ずつ × GitHub Issues全体 → 類似チェック

---

## 提案する新アーキテクチャ

### データ管理（ローカルキャッシュ方式）

```
data/
  slack-{channel}.json      # Slack生データ（fetch専用）
  analysis-{channel}.json   # 分析結果（tsをキーにフラグ管理）
```

**slack-{channel}.json**
```json
{
  "channelId": "C123...",
  "lastFetchedTs": "1234567890.123456",
  "messages": [...]
}
```

**analysis-{channel}.json**
```json
{
  "1234567890.123": { "isBusinessIdea": true, "isIssue": false },
  "1234567891.456": { "isBusinessIdea": false }
}
```

### コマンド

```bash
yarn slack:init     # 全期間取得 → data/slack-{channel}.json
yarn slack:update   # 最新ts以降を取得してマージ
yarn analyze:ideas  # AIが未チェックのメッセージを分析してフラグ付け
```

### 出力

```
生データ × 分析結果 → business-ideas.md（アイデアだけ抽出）
```

---

## 分析精度を上げる案

### 現状（一括処理）
```
Slackメッセージ全部 + GitHub Issue全部 → AI → 提案
```
- ✅ 文脈を見れる、API呼び出し少ない
- ❌ 量が多いと見落とし発生

### 改善案（2ステップ処理）
```
Step 1: Slack全体 → AI → issue候補リスト（仮）を生成
Step 2: 候補1件ずつ × GitHub Issues全体 → 類似チェック
```
- Step 1で文脈を理解してアイデア抽出
- Step 2で1件ずつ丁寧に重複チェック
- 現状より精度が上がる見込み

---

## 次のアクション（案）

1. `yarn slack:init` / `yarn slack:update` の実装
2. 分析結果を別ファイルに保存する仕組み
3. 2ステップ処理の実装
4. `business-ideas.md` 出力機能
