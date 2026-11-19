# CLAUDE.md（このリポジトリで作業するエージェント向け）

ダンスイベント「Nú Vol.1」（2026-11-28）のサイト。Vite + React 18 + Tailwind v4 の1ページと、投票用の Vercel 関数（`api/`）＋ Supabase。
もとは Figma Make で作成。**2026-11-19 からローカル管理**（Figma からは push しない）。報告は日本語で簡潔に。

## 運用の決まり
- **ブランチは main の1本だけ**。ブランチ・PR は作らない（運営者の決定）。main への push が、そのまま Vercel（プロジェクト nu-vol1-site）の本番デプロイになる。
- そのため **push の前の確認はすべてローカルで行う**：`npm ci` → `npm run build` が通ること。見た目に関わらない変更なら、`dist/assets` の JS・CSS のファイル名（中身のハッシュ）が本番（https://nu-vol1-site.vercel.app/ の index.html が読み込むもの）と同じであること。見た目が変わる変更は、変わる箇所を運営者に確認してから。
- 本番が壊れたら、Vercel の Instant Rollback で直前の本番デプロイに戻す。
- 他の AI（ブラウザ版 Claude など）に渡すプロンプトも丁寧語で書く。運営者の作業は「プロンプトを渡すこと」だけに絞る。
- 記録を変える・戻せない操作（データの削除、Supabase・Vercel の設定変更、本番に見た目の変化が出る push）は、実行の前に何をするかを1行で示して確認する。

## 画面の前提（2026-11-19 運営者）
- **結果画面（`/VoteResults?battle=<key>`）は、イベント会場でプロジェクターに映してみんなで見る → 横長（16:9 のプロジェクター）向けに作る**。
- **それ以外のページ（トップ・投票など）は、来場者が各自のスマホで開く → 縦長（スマホ）向けに作る**。
- 基本のサイト（結果画面以外）のデザインは変えない。2026-11-19 時点の更改の対象は結果画面だけ（「ダサいので、みんなが盛り上がるように」）。

## 結果画面の仕様（2026-11-19 運営者の回答）
- **自動で進む**（キー操作で進めない）。流れ：タイトル → 3位 → 2位 → 1位 → 表彰台（最後は止まったまま）。以前の版は「早すぎる」ので、待ち時間を長くした（約40秒。`VoteResults.tsx` 冒頭の定数で調整）。
- **順位だけを見せ、票数は出さない**。4位以下は出さない。同票は同じ順位で並べて「TIE」と出す。
- 発表の前の「投票受付中」の画面は**出さない**。効果音は**入れない**（音は DJ・MC に任せる）。
- 会場の PC 用のキー（画面には出さない）：**F** で全画面、**R** で最初からやり直し（結果も取り直す）。
- リハーサル用：URL に `&demo` を付けると、データベースを使わずに見本のデータで流れる（例：`/VoteResults?battle=final&demo`。右上に DEMO と出る）。
- 色と書体はサイトに合わせる（地 #07080d、シアン #6de4f5、Barlow Condensed・DM Mono）。1位は金色。

## 環境
- Node 24（`.nvmrc`・`engines`。Vercel も 24.x）。この PC では `E:\Tools\nodejs\node-v24` を PATH の先頭に置いて使う（普段の Node 23 は使わない）。
- パッケージマネージャーは **npm**（`package-lock.json`）。pnpm は使わない。
- コマンド：`npm ci`／`npm run dev`（画面のみ。`/api` は動かない）／`npm run build`／`npm run preview`。
- 環境変数：`SUPABASE_URL`・`SUPABASE_SECRET_KEY`（Vercel の Production・Preview にだけある。値をコミット・表示しない。`SUPABASE_SECRET_KEY` はサーバー側の `api/` だけで使う）。
- リポジトリは公開。個人のメールアドレスを書かない（コミットは GitHub の noreply アドレス）。

## コードの地図
- `src/main.tsx` 入口 → `src/app/App.tsx`（ページ本体。約63KB。パスが `/VoteResults` なら結果画面を出す）、`src/pages/VoteResults.tsx`（`/VoteResults?battle=<key>` の結果画面）
- バトルのキー：`breakin`・`allgenre`・`final`（`App.tsx` の `BATTLES`。出場者は今は仮の BATTLER A〜D の4人ずつ）
- `api/votes.ts`（POST：投票の登録）、`api/vote-results.ts`（GET：`?battle=<key>` の集計）
- `src/styles/`：`index.css` → `fonts.css`・`tailwind.css`（`tw-animate-css` を読み込む。消さない）・`theme.css`
- Tailwind v4 は `src/**/*.{js,ts,jsx,tsx}` の文字列からクラスを生成する。ファイルを消すと CSS が変わる。

## 未完了の作業（済んだら消す）
- [ ] **データベースのテスト投票を消す**（2026-11-19 運営者の決定）：votes テーブルに「BATTLER A」「BATTLER B」などのテストの票が入っている。サイトの更改が済むまでは確認用に残し、**更改が済んだら・イベント（11/28）の前に**必ず消す。消すのは運営者の確認を取ってから（戻せない操作）。
- [ ] **サイトの更改：結果画面の作り直し**（作業中。上の「画面の前提」を参照）。

## Figma Make について
- Figma 側の GitHub 連携は**外さない**（2026-11-19 運営者の決定。いつでも外せて、要らない可能性が高い）。ただし Figma で「Push to GitHub」は押さない（このリポジトリの変更が古い版で上書きされる）。作業の提案に「連携の解除」を出さない。

## 注意
- Supabase は無料プランで、**1週間アクセスが無いと自動で一時停止**する（2026-11-19 に一度止まっていて、運営者が再開した）。停止中は `/api` が「TypeError: fetch failed」を返す。イベントの前日か当日（11/27 か 11/28）に運営者がアクセスする方針（自動の定期アクセスは入れない。2026-11-19 運営者の決定）。
