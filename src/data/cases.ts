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
  /** 一覧の一行キャッチ */
  tagline: string
  /** 事件の概要（調書） */
  briefing: string
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
  tagline: 'ガソリンスタンド売上 ×1.3／3年',
  briefing:
    '地方都市のガソリンスタンド「ブルーオアシス」。給油と併設コンビニの合計売上が伸び悩んでいる。オーナーから「3年で売上を1.3倍にしてほしい」と相談が来た。言葉の定義・依頼人・目標を固めたうえで、切り口を変えて構造化し、ボトルネックを特定せよ。',
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
  tagline: '新聞事業の売上 ×1.2／3年',
  briefing:
    '大手新聞社の事業部門。購読部数の減少とデジタル移行の狭間で、新聞事業全体の売上を3年で1.2倍にせよ、と役員から指示が出た。購読者×単価で未購読まで分解する王道の切り口と、広告＋購読の収益分解の両方を検討せよ。',
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
      '紙もデジタルも含めた新聞事業の売上を、3年で今の1.2倍にしてほしい。購読者が減っているのは分かっている。どこから手を打つべきか、構造で示してくれ。',
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
  tagline: '飲食店の売上回復（客数×単価）',
  briefing:
    '駅近の和食居酒屋「ヒノマルキッチン」。昨年から売上が落ち続け、オーナーは「客が来なくなった」と嘆く。売上＝客数×客単価で分解し、既存離反（頻度低下・リピート低下）まで掘り下げて打ち手を立案せよ。目標は2年で売上1.25倍。',
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
      '客足が明らかに減った。単価を上げるか、回数を戻すか、新規か…どこがボトルネックか一緒に見てほしい。2年で売上を1.25倍に戻したい。',
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

export const SAMPLE_CASES: SampleCase[] = [BLUE_OASIS, YOMIURI, HINOMARU]

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
