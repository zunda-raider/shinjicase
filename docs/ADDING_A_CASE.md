# 事件（ケース）の追加方法

模範解答の **Markdown 正本**は repo ルートの [`data/`](../data/README.md)（カテゴリ × お題 × `answerN.md`）。アプリが読むのは当面 `src/data/*`。新規お題はまず `data/` に置き、ランタイム用に cases / models / archive / ideals を足す。

1つの事件 = 下の 6 ファイル。登録するとそれだけで、TITLE カード・GHOST/GOD・採点・CAPTAIN の突っ込み・OPERATION の既定タブ・事実カードの配置が動きます（共通ルールは自動で適用）。

| # | 何 | ファイル | 必須 |
|---|---|---|---|
| 1 | 事件カード（お題・調書・前提の例・例ツリー） | `src/data/cases.ts` に `SampleCase` を足し、`SAMPLE_CASES` に追加 | 必須 |
| 2 | 原文（ユーザー作成の Markdown） | `src/data/archive/<file>.md` ＋ `src/data/archive/index.ts` に登録 | GHOST/GOD を出すなら必須（ボタンの有効化に使う） |
| 3 | 模範生徒 1〜6（GOD＋GHOST） | `src/data/models/<case>/student1..6.ts`、`index.ts`、`src/data/models/index.ts` に登録 | GHOST/GOD・採点ユニットテスト・講評のアンカーに必須 |
| 4 | 採点ルーブリック（許容解・不可・突っ込み） | `src/data/ideals/<case>.ts` ＋ `src/data/ideals/index.ts` に登録 | 採点に必須（無いと汎用採点） |

`caseId` は 1〜4 で同じ文字列にする（例 `conbini`）。保存キーは `shinjicase.case.<caseId>.*`。登録から外した事件の保存データは起動時に自動で消える。

## 1. 事件カード `SampleCase`

| フィールド | 中身 |
|---|---|
| `id` | caseId |
| `label` | TITLE の事件名 |
| `odai` | お題（一行。目標の数字は書かない） |
| `intake` | 「例」ボタンで入る前提：`definition.meaning`（言葉の定義）, `client {name, role}`, `target {metric, multiplier, years}`, `area`, `scale ('single'|'chain')`, `storeCount`, `extras [{id,label,value}]`, `statement`（依頼人の調書。短く、目標なし） |
| `buildExample()` | 「例ツリー」：`EvidenceWorkspace`（切り口シート1つ以上） |
| `sampleSuspects` | 例の容疑者 `[{sheetId, nodeLabel, motive}]`（任意） |

## 2〜3. 模範生徒 `ModelStudent`（GOD）＋ `ghost`（GHOST）

| フィールド | 中身 | 表示先 |
|---|---|---|
| `no`, `title` | 生徒番号・回答の題 | 生徒ピッカー、講評の題 |
| `premises: [label, value][]` | 前提。**前提条件だけ**がメモになる。`現状の数字`/`売上構成`/`収支`などのラベルは自動で現状扱い | INTAKE・黄色メモ・SUMMARY 前提 |
| `scale`, `target {multiplier, years}` | 規模・目標（原文にあれば） | INTAKE |
| `current: string[]` | 現状の文 | SUMMARY 現状 |
| `sheets: [{key, name, tree}]` | 構造化。`node(label, {op:'mul'|'add', children, qa, splitQa})`、`leaves(...)` | EVIDENCE / OPERATION |
| `focus` | 狙う箱の理由（絞り込み） | 採点の動機 |
| `pins: [{sheet, label}]` | 狙う箱（最大3） | 赤ピン |
| `measures: [{name, body, node:{sheet,label}, ghostNode?, role?}]` | 施策。`role:'メイン'` は原文に「最優先」等があるときだけ | OPERATION・SUMMARY タブ |
| `factCards: [{category, text, qa?}]` | 事実・現状の短いカード（≤25字目安）。category は `数字/収支/競合/市場・人口/顧客/強み弱み/課題/その他` | EVIDENCE ツリーの下 |
| `notes: [{label, text}]` | 試算・KPI・優先順位など。`順番/優先順位/最も不確かな前提` は WARRANT のみ、他は SUMMARY 効果にも。REPORT は SUMMARY から自動生成される通し台本 | WARRANT・SUMMARY・REPORT |
| `reason?: string` on measure | 「なぜその施策を選んだか」原文があるときだけ | WARRANT 理由 |
| `ghost?` | GHOST を原文で別に持つ場合、上と同じ形（premises〜notes）。無ければ GOD から〔質疑n〕つきの文・`qa` 要素を除いて GHOST を作る | GHOST |
| `reach?` | 到達度表があるときだけ | — |

本文中の `〔質疑n〕` は GOD で黄色チップになり、GHOST（自動生成時）では文ごと消える。原文にないことは書かない。

## 4. ルーブリック `IdealAnswer`

| フィールド | 中身 |
|---|---|
| `caseId`, `odai` | |
| `requiredElements` | 合格の条件（premise/decomposition/focusReason/measures/conclusionFirst の passLine） |
| `acceptedFirstDecompositions` | 許容する第1分解（表示・Llama 用の文） |
| `decompositionPatterns` | 判定用：`{name, op, groups: 同義語の配列[], need?}`（ルート直下の子で照合） |
| `fixedFactorKeywords?` | 「動かせない要素を明言」が必須のとき、その判定語 |
| `hotSpots` | 許容するボトルネック／系統：`{id, name, axes, reason, keywords}` |
| `rejected` | 不可：`{text, keywords}` |
| `challenges?` | 突っ込みパターン `{pattern, example}`（CAPTAIN の問い・Llama パケット） |

採点は自動で「その事件の GOD 6人 = 100点」に換算される。追加後は `npx vitest run` で GOD=100・GHOST≥85・悪い回答<40 を確認（`src/scoring/conbini.test.ts` を写して caseId を変える）。

## 最小テンプレート

```ts
// src/data/cases.ts
const NEWCASE: SampleCase = {
  id: 'newcase',
  label: '〇〇',
  odai: '〇〇の売上向上施策',
  intake: {
    status: 'player',
    definition: { term: '売上', meaning: '' },
    client: { name: '', role: '' },
    target: { metric: '売上', multiplier: 1.2, years: 3 },
    area: '', scale: 'single', storeCount: null, extras: [],
    statement: '売上を伸ばしたい。',
  },
  buildExample: () => {
    const t = split(createTree('売上'), ROOT_ID, 'mul', ['客数', '客単価'])
    return { version: 4, seq: 1, activeSheetId: 's1', sheets: [sheet('s1', '客数×客単価', t)] }
  },
}
export const SAMPLE_CASES = [DEPT, CONBINI, NEWCASE]

// src/data/models/newcase/student1.ts
export const STUDENT1: ModelStudent = {
  no: 1,
  title: '…',
  premises: [['対象', '1店舗'], ['時間軸', '3年']],
  current: [],
  sheets: [{ key: 'main', name: '客数×客単価', tree: node('売上', { op: 'mul', children: leaves('客数', '客単価') }) }],
  focus: '…',
  pins: [{ sheet: 'main', label: '客単価' }],
  measures: [{ name: 'A …', body: '…〔質疑1〕', node: { sheet: 'main', label: '客単価' } }],
  factCards: [{ category: '数字', text: '…' }],
  notes: [],
  // ghost: { …同じ形… }  // 原文が GHOST を別に持つときだけ
}

// src/data/ideals/newcase.ts
export const NEWCASE_IDEAL: IdealAnswer = {
  caseId: 'newcase', odai: '…',
  requiredElements: [/* 5項目 */],
  acceptedFirstDecompositions: ['客数×客単価'],
  decompositionPatterns: [{ name: '客数×客単価', op: 'mul', groups: [['客数'], ['単価']] }],
  hotSpots: [{ id: 'x', name: '…', axes: ['…'], reason: '…', keywords: ['…'] }],
  rejected: [{ text: '…', keywords: ['…'] }],
  challenges: [{ pattern: '…', example: '…' }],
}
```

登録：`src/data/archive/index.ts`（md）、`src/data/models/index.ts`（生徒）、`src/data/ideals/index.ts`（ルーブリック）に `newcase` を1行ずつ。
