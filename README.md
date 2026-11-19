# Nu - Event Site

Nu のイベントサイトです。もとは Figma Make で作成し、現在はこのリポジトリで管理しています。main ブランチへ push すると、Vercel（プロジェクト nu-vol1-site）が本番に自動でデプロイします。

## 必要なもの

- Node.js 24（Vercel の本番と同じ。`.nvmrc` と `package.json` の `engines` で指定しています）
- npm（Node.js に付属）

## はじめ方

```bash
npm ci          # package-lock.json のとおりに依存関係を入れる
npm run dev     # 開発サーバー（画面のみ）
npm run build   # 本番と同じビルド（出力先は dist/）
```

- パッケージを追加・更新したときは、`package-lock.json` も一緒にコミットしてください。
- `npm run dev` では `/api`（Vercel の関数）は動きません。

## /api と環境変数

`api/votes.ts` と `api/vote-results.ts` は Vercel のサーバー側の関数で、次の環境変数を使います（名前は `.env.example` を参照）。

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`（サーバー側専用の鍵です。ブラウザ側のコードで使ったり、コミットしたりしないでください）

値は Vercel の Environment Variables（Production・Preview）にだけ登録しています。ローカルで `/api` まで動かす場合は、Vercel の Development 環境にも登録したうえで、Vercel CLI で次のようにします。ローカルからも本番のデータベースに書き込まれる点に注意してください。

```bash
vercel link
vercel env pull .env.local
vercel dev
```
