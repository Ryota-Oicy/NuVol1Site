# CLAUDE.md（このリポジトリで作業するエージェント向け）

ダンスイベント「Nú Vol.1」（2026-11-28）のサイト。Vite + React 18 + Tailwind v4 の1ページと、投票用の Vercel 関数（`api/`）＋ Supabase。
もとは Figma Make で作成。**2026-11-19 からローカル管理**（Figma からは push しない）。報告は日本語で簡潔に。

## 運用の決まり
- **ブランチは main の1本だけ**。ブランチ・PR は作らない（運営者の決定）。main への push が、そのまま Vercel（プロジェクト nu-vol1-site）の本番デプロイになる。
- そのため **push の前の確認はすべてローカルで行う**：`npm ci` → `npm run build` が通ること。見た目に関わらない変更なら、`dist/assets` の JS・CSS のファイル名（中身のハッシュ）が本番（https://nu-vol1-site.vercel.app/ の index.html が読み込むもの）と同じであること。見た目が変わる変更は、変わる箇所を運営者に確認してから。
- 本番が壊れたら、Vercel の Instant Rollback で直前の本番デプロイに戻す。
- 他の AI（ブラウザ版 Claude など）に渡すプロンプトも丁寧語で書く。運営者の作業は「プロンプトを渡すこと」だけに絞る。
- 記録を変える・戻せない操作（データの削除、Supabase・Vercel の設定変更、本番に見た目の変化が出る push）は、実行の前に何をするかを1行で示して確認する。

## 環境
- Node 24（`.nvmrc`・`engines`。Vercel も 24.x）。この PC では `E:\Tools\nodejs\node-v24` を PATH の先頭に置いて使う（普段の Node 23 は使わない）。
- パッケージマネージャーは **npm**（`package-lock.json`）。pnpm は使わない。
- コマンド：`npm ci`／`npm run dev`（画面のみ。`/api` は動かない）／`npm run build`／`npm run preview`。
- 環境変数：`SUPABASE_URL`・`SUPABASE_SECRET_KEY`（Vercel の Production・Preview にだけある。値をコミット・表示しない。`SUPABASE_SECRET_KEY` はサーバー側の `api/` だけで使う）。
- リポジトリは公開。個人のメールアドレスを書かない（コミットは GitHub の noreply アドレス）。

## コードの地図
- `src/main.tsx` 入口 → `src/app/App.tsx`（ページ本体。約63KB）、`src/pages/VoteResults.tsx`（`?battle=<key>` の結果画面）
- バトルのキー：`breakin`・`allgenre`・`final`（`App.tsx` の `BATTLES`）
- `api/votes.ts`（POST：投票の登録）、`api/vote-results.ts`（GET：`?battle=<key>` の集計）
- `src/styles/`：`index.css` → `fonts.css`・`tailwind.css`（`tw-animate-css` を読み込む。消さない）・`theme.css`
- Tailwind v4 は `src/**/*.{js,ts,jsx,tsx}` の文字列からクラスを生成する。ファイルを消すと CSS が変わる。

## 未完了の作業（済んだら消す）
- [ ] **データベースのテスト投票を消す**（2026-11-19 運営者の決定）：votes テーブルに「BATTLER A」「BATTLER B」などのテストの票が入っている。サイトの更改が済むまでは確認用に残し、**更改が済んだら・イベント（11/28）の前に**必ず消す。消すのは運営者の確認を取ってから（戻せない操作）。
- [ ] **Figma Make 側の GitHub 連携を外す**：外すまでは Figma で「Push to GitHub」を押さない（このリポジトリの変更が古い版で上書きされる）。

## 注意
- Supabase は無料プランで、**1週間アクセスが無いと自動で一時停止**する（2026-11-19 に一度止まっていて、運営者が再開した）。停止中は `/api` が「TypeError: fetch failed」を返す。イベントの前日か当日に運営者がアクセスする方針（自動の定期アクセスは入れない。2026-11-19 運営者の決定）。
