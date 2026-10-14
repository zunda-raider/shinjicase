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
- **answerN.md**: 1つの優秀な生徒の回答。必ず次の2節をこの見出しで分ける。
  - `## 許容解（GHOST）` … 最初の5分発表レベル
  - `## 完全解（GOD）` … 質疑まで盛り込んだ版（〔質疑n〕付き可）
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
