import type {
  EvidenceNodeId,
  EvidenceTree,
  EvidenceWorkspace,
  IntakeData,
  LinkKind,
} from '../types'
import { ROOT_ID, createTree, decompose, findNodeByPath } from '../logic/evidenceTree'
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
  return findNodeByPath(tree, label)
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
/* 1) 地方百貨店                                                       */
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
/* 2) コンビニ（例はパターン1）                                         */
/* ------------------------------------------------------------------ */

function buildConbiniExample(): EvidenceWorkspace {
  let t1 = createTree('売上')
  t1 = split(t1, ROOT_ID, 'mul', ['客数', '単価', '頻度'])
  let t2 = createTree('売上')
  t2 = split(t2, ROOT_ID, 'add', ['通勤客', '住民'])
  t2 = split(t2, '通勤客', 'add', ['朝', '昼', '夜'])
  t2 = split(t2, '住民', 'add', ['朝', '昼', '夜'])
  let ws: EvidenceWorkspace = {
    version: 4,
    seq: 2,
    activeSheetId: 's1',
    sheets: [sheet('s1', '客数×単価×頻度', t1), sheet('s2', '客層×時間帯', t2)],
  }
  const morning = findLabel(ws.sheets[1].tree, '通勤客/朝')!
  ws = addMeasure(ws, 's2', morning, '朝に1,000円以上買うとコーヒーLサイズ無料').ws
  return ws
}

const CONBINI: SampleCase = {
  id: 'conbini',
  label: 'コンビニ',
  odai: 'コンビニの売上向上施策',
  intake: {
    status: 'player',
    definition: { term: '売上', meaning: '' },
    client: { name: '', role: '' },
    target: { metric: '売上', multiplier: 1.2, years: 3 },
    area: '都市部の住宅街とオフィスが混在するエリア',
    scale: 'single',
    storeCount: null,
    extras: [{ id: 'x1', label: '客層', value: '通勤客と住民' }],
    statement: 'うちの店の売上を伸ばしたい。何から手をつければいい？',
  },
  buildExample: buildConbiniExample,
  sampleSuspects: [
    { sheetId: 's2', nodeLabel: '通勤客/朝', motive: '客数は最も多いのに、朝食だけ・コーヒー1杯だけで単価が低い' },
  ],
}

/** 事件の登録先。新しい事件はここに足す（docs/ADDING_A_CASE.md） */
export const SAMPLE_CASES: SampleCase[] = [DEPT, CONBINI]

export const DEFAULT_CASE_ID = DEPT.id

export function getCase(id: string): SampleCase {
  return SAMPLE_CASES.find((c) => c.id === id) ?? DEPT
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
