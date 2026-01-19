# 複数GitHubリポジトリ対応

## 概要
設定ファイル（JSON）を使って複数リポジトリを管理できるようにする。

## 実装方針

### 1. 設定ファイルの作成
`config/github-repos.json` を新規作成：
```json
{
  "repositories": [
    { "owner": "org1", "repo": "frontend" },
    { "owner": "org1", "repo": "backend" },
    { "owner": "org2", "repo": "shared-lib" }
  ]
}
```

### 2. 修正するファイル

#### `src/commands/githubInit.ts`
- 設定ファイルを読み込み、リポジトリをループ処理
- 各リポジトリのキャッシュを個別に保存（既存の `data/github-{owner}-{repo}.json` 形式を維持）

#### `src/commands/githubUpdate.ts`
- 同様に設定ファイルからリポジトリを読み込みループ処理

### 3. 後方互換性
- `GITHUB_OWNER` / `GITHUB_REPO` 環境変数も引き続きサポート
- 設定ファイルがあれば優先、なければ環境変数を使用

## 変更ファイル一覧
- `config/github-repos.json` (新規)
- `config/github-repos.example.json` (新規) - サンプル設定
- `src/commands/githubInit.ts`
- `src/commands/githubUpdate.ts`

## 検証方法
```bash
# 設定ファイルを作成後
yarn github:init   # 全リポジトリを初期化
yarn github:update # 全リポジトリを更新
```
