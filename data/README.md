# 模範解答ライブラリ（on-disk）

ケース面接の模範解答を、カテゴリ × お題 × 生徒回答の Markdown で置く置き場。  
**いまのアプリ実行時データはまだ `src/data/*`（cases / models / archive / ideals）を読む。** ここは今後の追加・編集の正本（source of truth）。ローダー未実装。

## ４カテゴリ

| フォルダ | 日本語 |
|---|---|
| `01-fermi/` | １ フェルミ推定 |
| `02-sales/` | ２ 売上向上施策 |
| `03-pros-cons/` | ３ 賛成反対系 |
| `04-social/` | ４ 社会課題系 |

## お題フォルダの中身

```
data/<category>/<slug>/
  meta.md          # お題タイトル・短いメモ・runtime caseId など
  source.md        # 原文の全文（あれば）。canonical なアーカイブ
  answer1.md       # 優秀な生徒1
  answer2.md
  …
  answerN.md
```

- **slug**: 英小文字・ハイフン（例 `maruyama-department`, `convenience`）。
- **answerN.md**: 1人の優秀な生徒の回答。**2部構成**。
  1. `## 原文（ソース）` … ユーザーが書いた原文をそのまま（編集しない・〔質疑n〕も残す）。
     - **許容解（GHOST）** と **完全解（GOD）** をそれぞれ `<!-- 原文:ghost ここから … -->` 〜 `<!-- 原文 ここまで -->`（god も同様）で囲む。
     - 既存2件は `source.md` から自動で抜き出す（コンビニ＝`### パターンN`、まるやま＝到達度表の見出し＋N行目、GOD＝`## 完全解N`）。
  2. `## 導出（アプリ用）` … アプリが原文から作ったもの。**`npm run data:derive` が `src/data/models` から生成**（手で書かない）。
     - GHOST / GOD それぞれ：前提（黄色メモ）、現状、事実カード、構造化（切り口ごとのツリー、各ノードの種類 分解／一部抽出／分析、〔質疑〕）、狙う箱＋動機、施策（付け先ノード・赤番号・メイン/？・理由）、SUMMARY タブ、講評マッピング。
     - 最後に `### 判断したこと（原文に無いもの）`：ラベル短縮、種類の明示、施策の付け先、GHOST での付け先、注記の移動など（自動検出＋`ModelStudent.judgment`）。
- **ずれ防止**: `src/data/library/derive.test.ts` が (a) 原文ブロックが `source.md` と一致、(b) 導出が `src/data/models` から再生成したものと一致、を確認する。モデルを直したら `npm run data:derive` を実行してコミット。

### 新しい回答を足すとき

1. ユーザーが原文を書く：`source.md` に追記（推奨。自動で抜き出せる）か、`answerN.md` の `## 原文（ソース）` にマーカー付きで直接書く。
2. こちらで `src/data/models/<case>/studentN.ts` を作る（`docs/ADDING_A_CASE.md`）。原文に無い判断は `judgment: [...]` に書く。
3. `npm run data:derive` → `## 導出（アプリ用）` が埋まる。`npm test` で一致を確認。

- 事件共通の合格ライン・不可・突っ込みは `meta.md` か `source.md` に置く。

## いま入っているお題（02-sales）

| slug | お題 | runtime caseId | 回答 |
|---|---|---|---|
| `maruyama-department` | 地方百貨店の売上を向上させる生き残り戦略 | `local-dept` | answer1–6 |
| `convenience` | コンビニの売上向上施策 | `conbini` | answer1–6 |

アプリが読むコピー: `src/data/archive/*.md`（`source.md` と同じ内容）。モデルの構造化データは `src/data/models/`。ライブラリを直したら、当面は archive / models も手で揃える。

## 空のカテゴリ

`01-fermi` / `03-pros-cons` / `04-social` はプレースホルダのみ。お題を足すときは上のフォルダ形に合わせる。

## ランタイムとの関係

```
data/          ← 正本（人が書く Markdown）
src/data/      ← アプリが import する TS + archive コピー（ローダーができるまで）
```

詳細なアプリ側の足し方は `docs/ADDING_A_CASE.md`。
