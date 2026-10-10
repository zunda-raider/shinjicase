import type {
  EvidenceNodeId,
  EvidenceTree,
  EvidenceWorkspace,
  IntakeData,
  LinkKind,
} from '../types'
import { ROOT_ID, createTree, decompose } from '../logic/evidenceTree'
import { addMeasure, newSheet, pinKey } from '../logic/workspace'

/** プレイ可能なサンプル事件 */
export interface SampleCase {
  id: string
  /** ナビ・ピッカー用の短い名前 */
  label: string
  /** お題（一行。目標は書かない） */
  odai: string
  intake: IntakeData
  /** 「例を読み込む」用の切り口ツリー */
  buildExample: () => EvidenceWorkspace
  /** 例ロード時に載せる容疑者（シートID + ノードラベル）。前提の例は intake */
  sampleSuspects?: { sheetId: string; nodeLabel: string; motive: string }[]
  /** 例ロード時に載せる施策 */
  sampleMeasures?: { sheetId: string; nodeLabel: string; texts: string[] }[]
}

function findLabel(tree: EvidenceTree, label: string): EvidenceNodeId | null {
  for (const n of Object.values(tree.nodes)) {
    if (n.label === label) return n.id
  }
  return null
}

function split(
  tree: EvidenceTree,
  parentLabelOrRoot: string | typeof ROOT_ID,
  kind: LinkKind,
  labels: string[],
): EvidenceTree {
  const id =
    parentLabelOrRoot === ROOT_ID
      ? ROOT_ID
      : findLabel(tree, parentLabelOrRoot) ?? ROOT_ID
  return decompose(tree, id, kind, labels).tree
}

function sheet(id: string, name: string, tree: EvidenceTree) {
  return newSheet(id, name, tree)
}

/* ------------------------------------------------------------------ */
/* 1) ブルーオアシス（GS）                                              */
/* ------------------------------------------------------------------ */

function buildBlueOasisExample(): EvidenceWorkspace {
  const metric = '売上'
  // 切り口1: 顧客数 × 客単価
  let t1 = createTree(metric)
  t1 = split(t1, ROOT_ID, 'mul', ['顧客数', '客単価'])
  t1 = split(t1, '顧客数', 'add', ['既存顧客', '新規顧客'])

  // 切り口2: 店舗数 × 店舗あたり売上
  let t2 = createTree(metric)
  t2 = split(t2, ROOT_ID, 'mul', ['店舗数', '店舗あたり売上'])

  // 切り口3: 燃料 ＋ 油外（実SS練習の型）
  let t3 = createTree(metric)
  t3 = split(t3, ROOT_ID, 'add', ['燃料', '油外'])
  t3 = split(t3, '燃料', 'mul', ['来車数', '台あたり給油売上'])
  t3 = split(t3, '油外', 'mul', ['来車数', '購入率', '単価'])

  let ws: EvidenceWorkspace = {
    version: 4,
    seq: 3,
    activeSheetId: 's1',
    sheets: [
      sheet('s1', '顧客数×単価', t1),
      sheet('s2', '店舗数×店舗あたり売上', t2),
      sheet('s3', '燃料＋油外', t3),
    ],
  }

  const existing = findLabel(ws.sheets[0].tree, '既存顧客')!
  const fresh = findLabel(ws.sheets[0].tree, '新規顧客')!
  for (const text of ['洗車サブスク', '会員アプリで来店回数UP']) {
    const r = addMeasure(ws, 's1', existing, text)
    ws = r.ws
  }
  const r = addMeasure(ws, 's1', fresh, '法人カード営業')
  ws = r.ws
  return ws
}

const BLUE_OASIS: SampleCase = {
  id: 'blue-oasis',
  label: 'ブルーオアシス',
  odai: 'ガソリンスタンドの売上向上施策',
  intake: {
    status: 'player',
    definition: {
      term: '売上',
      meaning: '給油＋併設コンビニ等、店舗の売上合計',
    },
    client: {
      name: 'ブルーオアシス',
      role: '店舗オーナーからの相談',
    },
    target: { metric: '売上', multiplier: 1.3, years: 3 },
    area: '地方都市・郊外',
    scale: 'single',
    storeCount: null,
    extras: [{ id: 'x1', label: '併設', value: 'コンビニ・洗車機' }],
    statement:
      'うちのスタンド、最近売上がいまいちなんだ。給油もコンビニも合わせて考えてくれ。',
  },
  buildExample: buildBlueOasisExample,
  sampleSuspects: [
    {
      sheetId: 's1',
      nodeLabel: '既存顧客',
      motive: '来店頻度の低下が給油売上の主因になっている',
    },
    {
      sheetId: 's1',
      nodeLabel: '新規顧客',
      motive: '新規は偶然来店に依存し、定常の取り込み手段がない',
    },
  ],
}

/* ------------------------------------------------------------------ */
/* 2) 東都日報（新聞・架空）                                                       */
/* ------------------------------------------------------------------ */

function buildYomiuriExample(): EvidenceWorkspace {
  const metric = '売上'
  // 切り口A: 購読者数 × 顧客単価（新規の先まで深く）
  let t1 = createTree(metric)
  t1 = split(t1, ROOT_ID, 'mul', ['購読者数', '顧客単価'])
  t1 = split(t1, '購読者数', 'add', ['既存購読者', '新規購読者'])
  t1 = split(t1, '新規購読者', 'add', ['他紙購読者', '未購読者'])
  t1 = split(t1, '未購読者', 'add', ['年齢対象外', '日本語圏外', '無関心'])

  // 切り口B: 広告売上 ＋ 購読売上
  let t2 = createTree(metric)
  t2 = split(t2, ROOT_ID, 'add', ['広告売上', '購読売上'])

  let ws: EvidenceWorkspace = {
    version: 4,
    seq: 2,
    activeSheetId: 's1',
    sheets: [
      sheet('s1', '購読者×単価', t1),
      sheet('s2', '広告＋購読', t2),
    ],
  }

  const other = findLabel(ws.sheets[0].tree, '他紙購読者')!
  const unpaid = findLabel(ws.sheets[0].tree, '無関心')!
  let r = addMeasure(ws, 's1', other, '他紙からの乗り換えキャンペーン')
  ws = r.ws
  r = addMeasure(ws, 's1', unpaid, '若年向けダイジェスト配信')
  ws = r.ws
  return ws
}

const YOMIURI: SampleCase = {
  id: 'yomiuri-news',
  label: '東都日報',
  odai: '新聞事業の売上向上施策',
  intake: {
    status: 'player',
    definition: {
      term: '売上',
      meaning: '新聞事業の広告収入＋購読収入の合計',
    },
    client: {
      name: '東都日報',
      role: '事業本部長からの依頼',
    },
    target: { metric: '売上', multiplier: 1.2, years: 3 },
    area: '全国（首都圏中心）',
    scale: 'chain',
    storeCount: 400,
    extras: [{ id: 'x1', label: '媒体', value: '紙＋デジタル' }],
    statement:
      '購読者が減っている。紙もデジタルも含めて、どこから手を打つべきか見てほしい。',
  },
  buildExample: buildYomiuriExample,
  sampleSuspects: [
    {
      sheetId: 's1',
      nodeLabel: '無関心',
      motive: '若年層は新聞習慣がなく、接触チャネルが途切れている',
    },
    {
      sheetId: 's1',
      nodeLabel: '他紙購読者',
      motive: '乗り換え余地はあるが差別化訴求が弱い',
    },
  ],
}

/* ------------------------------------------------------------------ */
/* 3) ヒノマルキッチン風（飲食）                                         */
/* ------------------------------------------------------------------ */

function buildHinomaruExample(): EvidenceWorkspace {
  const metric = '売上'
  let t1 = createTree(metric)
  t1 = split(t1, ROOT_ID, 'mul', ['客数', '客単価'])
  t1 = split(t1, '客数', 'add', ['新規', '既存'])
  t1 = split(t1, '既存', 'add', ['継続客', '既存離反'])
  t1 = split(t1, '既存離反', 'add', ['頻度低下', 'リピート低下'])
  t1 = split(t1, '客単価', 'mul', ['点数', '商品単価'])

  // 切り口2: ランチ ＋ ディナー（時間帯）
  let t2 = createTree(metric)
  t2 = split(t2, ROOT_ID, 'add', ['ランチ売上', 'ディナー売上'])

  let ws: EvidenceWorkspace = {
    version: 4,
    seq: 2,
    activeSheetId: 's1',
    sheets: [
      sheet('s1', '客数×客単価', t1),
      sheet('s2', 'ランチ＋ディナー', t2),
    ],
  }

  const freq = findLabel(ws.sheets[0].tree, '頻度低下')!
  const rep = findLabel(ws.sheets[0].tree, 'リピート低下')!
  let r = addMeasure(ws, 's1', freq, '週次クーポンで来店リズムを戻す')
  ws = r.ws
  r = addMeasure(ws, 's1', rep, '会員スタンプで2回目来店を促す')
  ws = r.ws
  return ws
}

const HINOMARU: SampleCase = {
  id: 'hinomaru-kitchen',
  label: 'ヒノマルキッチン',
  odai: '居酒屋の売上回復施策',
  intake: {
    status: 'player',
    definition: {
      term: '売上',
      meaning: '店内飲食の税抜売上（テイクアウト含む）',
    },
    client: {
      name: 'ヒノマルキッチン',
      role: '店主からの相談',
    },
    target: { metric: '売上', multiplier: 1.25, years: 2 },
    area: '駅前（都内）',
    scale: 'single',
    storeCount: null,
    extras: [{ id: 'x1', label: '業態', value: '和食居酒屋' }],
    statement:
      '客足が明らかに減った。どこがボトルネックか一緒に見てほしい。',
  },
  buildExample: buildHinomaruExample,
  sampleSuspects: [
    {
      sheetId: 's1',
      nodeLabel: '頻度低下',
      motive: '既存客の来店間隔が伸び、月次売上が削られている',
    },
    {
      sheetId: 's1',
      nodeLabel: 'リピート低下',
      motive: '初回後の再来店率が落ち、既存母数が減っている',
    },
  ],
}

/* ------------------------------------------------------------------ */
/* 4) 美容院                                                           */
/* ------------------------------------------------------------------ */

function buildSalonExample(): EvidenceWorkspace {
  let t1 = createTree('売上')
  t1 = split(t1, ROOT_ID, 'mul', ['来店客数', '客単価'])
  t1 = split(t1, '来店客数', 'add', ['新規客', 'リピート客'])
  t1 = split(t1, 'リピート客', 'mul', ['顧客数', '来店頻度'])
  t1 = split(t1, '客単価', 'add', ['施術単価', '店販'])

  let t2 = createTree('売上')
  t2 = split(t2, ROOT_ID, 'mul', ['スタイリスト数', '1人あたり売上'])
  t2 = split(t2, '1人あたり売上', 'mul', ['稼働率', '時間あたり売上'])

  let ws: EvidenceWorkspace = {
    version: 4,
    seq: 2,
    activeSheetId: 's1',
    sheets: [sheet('s1', '客数×客単価', t1), sheet('s2', 'スタイリスト×生産性', t2)],
  }
  const freq = findLabel(ws.sheets[0].tree, '来店頻度')!
  const store = findLabel(ws.sheets[0].tree, '店販')!
  ws = addMeasure(ws, 's1', freq, '次回予約を会計時に取る').ws
  ws = addMeasure(ws, 's1', store, 'ホームケア商品の提案').ws
  return ws
}

const SALON: SampleCase = {
  id: 'hair-salon',
  label: 'サロン・ルミエ',
  odai: '美容院の売上向上施策',
  intake: {
    status: 'player',
    definition: { term: '売上', meaning: '施術売上＋店販売上の合計' },
    client: { name: 'サロン・ルミエ', role: 'オーナースタイリスト' },
    target: { metric: '売上', multiplier: 1.2, years: 2 },
    area: '郊外の住宅街',
    scale: 'single',
    storeCount: null,
    extras: [{ id: 'x1', label: '席数', value: 'セット面6席' }],
    statement: '常連さんは来てくれるけど、売上が頭打ちなんです。',
  },
  buildExample: buildSalonExample,
  sampleSuspects: [
    { sheetId: 's1', nodeLabel: '来店頻度', motive: '来店間隔が伸びてリピート売上が落ちている' },
  ],
}

/* ------------------------------------------------------------------ */
/* 5) 地方百貨店                                                       */
/* ------------------------------------------------------------------ */

function buildDeptExample(): EvidenceWorkspace {
  let t1 = createTree('売上')
  t1 = split(t1, ROOT_ID, 'mul', ['来店客数', '購買率', '客単価'])
  t1 = split(t1, '来店客数', 'add', ['地元客', '観光客'])
  t1 = split(t1, '地元客', 'add', ['シニア', 'ファミリー', '若年層'])

  let t2 = createTree('売上')
  t2 = split(t2, ROOT_ID, 'add', ['自営売場', 'テナント賃料', '外商', 'EC'])

  let ws: EvidenceWorkspace = {
    version: 4,
    seq: 2,
    activeSheetId: 's1',
    sheets: [sheet('s1', '客数×購買率×単価', t1), sheet('s2', '収益源の内訳', t2)],
  }
  const young = findLabel(ws.sheets[0].tree, '若年層')!
  const tour = findLabel(ws.sheets[0].tree, '観光客')!
  ws = addMeasure(ws, 's1', young, '地元カフェ・雑貨のポップアップ誘致').ws
  ws = addMeasure(ws, 's1', tour, '地域物産フロアと免税対応').ws
  return ws
}

const DEPT: SampleCase = {
  id: 'local-dept',
  label: 'まるやま百貨店',
  odai: '地方百貨店の売上を向上させる生き残り戦略',
  intake: {
    status: 'player',
    definition: { term: '売上', meaning: '自営売場＋テナント＋外商＋ECの合計' },
    client: { name: 'まるやま百貨店', role: '経営企画部長' },
    target: { metric: '売上', multiplier: 1.15, years: 5 },
    area: '地方都市の駅前',
    scale: 'single',
    storeCount: null,
    extras: [{ id: 'x1', label: '競合', value: '郊外の大型SC' }],
    statement: '郊外のショッピングモールにお客を取られている。このままでは閉店だ。',
  },
  buildExample: buildDeptExample,
  sampleSuspects: [
    { sheetId: 's1', nodeLabel: '若年層', motive: '若年層の来店理由がなく郊外SCに流れている' },
  ],
}

/* ------------------------------------------------------------------ */
/* 6) フィットネスジム                                                 */
/* ------------------------------------------------------------------ */

function buildGymExample(): EvidenceWorkspace {
  let t1 = createTree('売上')
  t1 = split(t1, ROOT_ID, 'mul', ['会員数', '会員単価'])
  t1 = split(t1, '会員数', 'add', ['新規入会', '継続会員'])
  t1 = split(t1, '継続会員', 'add', ['前月会員', '退会'])
  t1 = split(t1, '会員単価', 'add', ['月会費', 'パーソナル等オプション'])

  let ws: EvidenceWorkspace = {
    version: 4,
    seq: 1,
    activeSheetId: 's1',
    sheets: [sheet('s1', '会員数×会員単価', t1)],
  }
  const churn = findLabel(ws.sheets[0].tree, '退会')!
  const opt = findLabel(ws.sheets[0].tree, 'パーソナル等オプション')!
  ws = addMeasure(ws, 's1', churn, '入会3か月のトレーナー面談').ws
  ws = addMeasure(ws, 's1', opt, '体組成測定つきパーソナル体験').ws
  return ws
}

const GYM: SampleCase = {
  id: 'fitness-gym',
  label: 'アイアンボディ',
  odai: 'フィットネスジムの売上向上施策',
  intake: {
    status: 'player',
    definition: { term: '売上', meaning: '月会費＋オプション売上の合計' },
    client: { name: 'アイアンボディ', role: '本部マーケティング担当' },
    target: { metric: '売上', multiplier: 1.3, years: 3 },
    area: '首都圏',
    scale: 'chain',
    storeCount: 25,
    extras: [{ id: 'x1', label: '業態', value: '24時間ジム' }],
    statement: '入会はそこそこあるのに、なぜか会員数が増えないんだよ。',
  },
  buildExample: buildGymExample,
  sampleSuspects: [
    { sheetId: 's1', nodeLabel: '退会', motive: '入会後数か月の退会が多く会員が積み上がらない' },
  ],
}

export const SAMPLE_CASES: SampleCase[] = [BLUE_OASIS, YOMIURI, HINOMARU, SALON, DEPT, GYM]

export const DEFAULT_CASE_ID = BLUE_OASIS.id

export function getCase(id: string): SampleCase {
  return SAMPLE_CASES.find((c) => c.id === id) ?? BLUE_OASIS
}

/** 例ワークスペースにサンプル容疑者のピンキーと動機を載せる */
export function applySampleSuspects(c: SampleCase, ws: EvidenceWorkspace) {
  const pins: string[] = []
  const motives: Record<string, string> = {}
  for (const s of c.sampleSuspects ?? []) {
    const sheet = ws.sheets.find((x) => x.id === s.sheetId)
    if (!sheet) continue
    const nodeId = findLabel(sheet.tree, s.nodeLabel)
    if (!nodeId) continue
    const key = pinKey(s.sheetId, nodeId)
    pins.push(key)
    motives[key] = s.motive
  }
  return { pins, motives }
}
