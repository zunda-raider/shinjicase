import { useEffect, useMemo, useState } from 'react'
import { CaptainPanel } from './components/CaptainPanel'
import { EvidenceBoard } from './components/EvidenceBoard'
import type { BoardMode } from './components/EvidenceBoard'
import { IntakeMemos } from './components/IntakeMemos'
import { PhaseNav } from './components/PhaseNav'
import { ScoreBoard } from './components/ScoreBoard'
import { SheetTabs } from './components/SheetTabs'
import { StubPhase } from './components/StubPhase'
import { SuspectList } from './components/SuspectList'
import { STUB_INTAKE, formatTarget } from './data/intake'
import { PHASES } from './data/phases'
import {
  REVISE_BONUS,
  baseScore,
  evaluateSubmission,
} from './logic/captain'
import { MAX_PINS, createTree, subtreeIds } from './logic/evidenceTree'
import {
  activeSheet,
  addSheet,
  createWorkspace,
  exampleWorkspace,
  migrateWorkspace,
  parsePinKey,
  pinKey,
  removeSheet,
  renameSheet,
  selectSheet,
  syncRootLabel,
  toggleWorkspacePin,
  updateSheetTree,
  workspaceCandidates,
} from './logic/workspace'
import type {
  CaptainState,
  CandidateId,
  CaseData,
  ChallengeResult,
  EvidenceNodeId,
  EvidenceTree,
  EvidenceWorkspace,
  Phase,
  SheetId,
} from './types'
import './App.css'

const WORKSPACE_STORAGE_KEY = 'shinjicase.evidence.v3'
/** v2 = 単一ツリー（切り口1 に移行して削除） */
const V2_STORAGE_KEY = 'shinjicase.evidence.v2'
/** 旧形式（自由配置カード）のキー。読み込まずに削除する。 */
const LEGACY_STORAGE_KEYS = ['shinjicase.evidence.v1']

const PHASE_TITLES: Record<Phase, string> = {
  INTAKE: '事件受理 — INTAKE',
  EVIDENCE: '捜査ボード — EVIDENCE',
  OPERATION: '逮捕作戦 — OPERATION',
  WARRANT: '令状請求 — WARRANT',
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function loadWorkspace(metric: string): EvidenceWorkspace {
  try {
    LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k))
    const ws = migrateWorkspace(readJson(WORKSPACE_STORAGE_KEY), readJson(V2_STORAGE_KEY), metric)
    localStorage.removeItem(V2_STORAGE_KEY)
    if (ws) return ws
  } catch {
    // 壊れた・互換のないデータは捨てて作り直す
  }
  return createWorkspace(metric)
}

export default function App() {
  const intake = STUB_INTAKE
  const [phase, setPhase] = useState<Phase>('EVIDENCE')
  const metric = intake.target.metric
  const [workspace, setWorkspace] = useState<EvidenceWorkspace>(() => loadWorkspace(metric))
  const [mode, setMode] = useState<BoardMode>('decompose')

  const [pins, setPins] = useState<CandidateId[]>([])
  const [motives, setMotives] = useState<Record<CandidateId, string>>({})
  const [captainState, setCaptainState] = useState<CaptainState>('idle')
  const [challenge, setChallenge] = useState<ChallengeResult | null>(null)
  const [submittedOnce, setSubmittedOnce] = useState(false)
  const [reviseBonus, setReviseBonus] = useState(0)
  const [lastScored, setLastScored] = useState(0)

  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
    } catch {
      // 保存できなくても動作は続ける
    }
  }, [workspace])

  // ルートは常に ⅰ の指標（INTAKE が変われば全切り口のルートも変わる）
  const ws = useMemo(() => syncRootLabel(workspace, metric), [workspace, metric])
  const sheet = activeSheet(ws)
  const tree = sheet.tree

  const candidates = useMemo(() => workspaceCandidates(ws), [ws])
  const caseData: CaseData = useMemo(
    () => ({
      id: 'evidence-tree',
      title: `CASE FILE: ${intake.client.name} — 目標 ${formatTarget(intake.target)}`,
      briefing: '',
      idealPrimeCount: Math.max(1, Math.min(MAX_PINS, candidates.length)),
      candidates,
    }),
    [candidates, intake],
  )

  // ツリー・シートから消えた／空欄になったカードのピンは外れた扱い
  const activePins = useMemo(
    () => pins.filter((id) => candidates.some((c) => c.id === id)),
    [pins, candidates],
  )
  const suspects = useMemo(
    () =>
      activePins
        .map((id) => candidates.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => !!c),
    [activePins, candidates],
  )
  const selections = useMemo(
    () => activePins.map((id) => ({ candidateId: id, motive: motives[id] ?? '' })),
    [activePins, motives],
  )

  const displayScore = lastScored + reviseBonus

  /** このシートのノード → 全体のピン番号 */
  const pinNumbers = useMemo(() => {
    const out: Record<EvidenceNodeId, number> = {}
    activePins.forEach((key, i) => {
      const { sheetId, nodeId } = parsePinKey(key)
      if (sheetId === sheet.id) out[nodeId] = i + 1
    })
    return out
  }, [activePins, sheet.id])

  const pinCounts = useMemo(() => {
    const out: Record<SheetId, number> = {}
    activePins.forEach((key) => {
      const { sheetId } = parsePinKey(key)
      out[sheetId] = (out[sheetId] ?? 0) + 1
    })
    return out
  }, [activePins])

  function handleTogglePinKey(key: CandidateId) {
    setPins((prev) => toggleWorkspacePin(ws, prev, key))
  }

  function setTree(next: EvidenceTree) {
    setWorkspace((prev) => updateSheetTree(prev, sheet.id, next))
  }

  function handleRemoveSheet(id: SheetId) {
    const target = ws.sheets.find((s) => s.id === id)
    if (!target) return
    const hasWork = Object.keys(target.tree.nodes).length > 1
    if (hasWork && !window.confirm(`切り口「${target.name}」を削除しますか？`)) return
    setWorkspace((prev) => removeSheet(prev, id))
  }

  function setMotive(id: CandidateId, value: string) {
    setMotives((prev) => ({ ...prev, [id]: value }))
  }

  function handleSubmit() {
    setChallenge(evaluateSubmission(selections, caseData))
    setCaptainState('challenging')
    setLastScored(baseScore(selections, caseData))
    if (submittedOnce && reviseBonus === 0) {
      setReviseBonus(REVISE_BONUS)
    }
    setSubmittedOnce(true)
  }

  /** 今の切り口をルートだけに戻す（この切り口のピンも外す） */
  function handleResetSheet() {
    const keys = new Set(subtreeIds(tree, tree.rootId).map((id) => pinKey(sheet.id, id)))
    setTree(createTree(metric))
    setPins((prev) => prev.filter((k) => !keys.has(k)))
  }

  function handleLoadExample() {
    const hasWork = ws.sheets.some((s) => Object.keys(s.tree.nodes).length > 1)
    if (
      hasWork &&
      !window.confirm(
        'すべての切り口を例（顧客数×単価 ／ 店舗数×店舗あたり売上）で置き換えますか？',
      )
    ) {
      return
    }
    setWorkspace(exampleWorkspace(metric))
    setPins([])
    setMotives({})
    setMode('decompose')
  }

  const phaseInfo = PHASES.find((p) => p.id === phase)

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__badge">SHINJICASE</span>
          <h1 className="app__title">{PHASE_TITLES[phase]}</h1>
          <p className="app__case">
            {phaseInfo?.jp} · {caseData.title}
          </p>
        </div>
        <ScoreBoard
          score={displayScore}
          reviseBonus={reviseBonus}
          pinnedCount={activePins.length}
          maxPins={MAX_PINS}
        />
      </header>

      <PhaseNav active={phase} onSelect={setPhase} />

      <IntakeMemos intake={intake} />

      {phase === 'INTAKE' && (
        <StubPhase
          title="事件受理（前提確認）"
          lines={[
            '今回は仮置き：上の3枚（定義・依頼人・TARGET）は固定値です。',
            '予定：依頼人の調書（相談文）の曖昧な言葉をマーカーでなぞり、定義カードを書く。',
            '予定：依頼人カードで「誰からの相談か」を選ぶ。',
            '予定：目標を「指標・倍率・期限」のダイヤルで入力する（例：売上 ×1.2／3年）。',
            'ここで決めた指標が、EVIDENCE のすべての切り口のツリーの一番上（黒カード）になります。',
          ]}
          nextLabel="捜査ボードへ → EVIDENCE"
          onNext={() => setPhase('EVIDENCE')}
        />
      )}

      {phase === 'EVIDENCE' && (
        <div className="app__layout">
          <EvidenceBoard
            key={sheet.id}
            tree={tree}
            onChange={setTree}
            mode={mode}
            onModeChange={setMode}
            pinNumbers={pinNumbers}
            totalPins={activePins.length}
            onTogglePin={(nodeId) => handleTogglePinKey(pinKey(sheet.id, nodeId))}
            onReset={handleResetSheet}
            onLoadExample={handleLoadExample}
            tabs={
              <SheetTabs
                sheets={ws.sheets}
                activeId={sheet.id}
                pinCounts={pinCounts}
                onSelect={(id) => setWorkspace((prev) => selectSheet(prev, id))}
                onRename={(id, name) => setWorkspace((prev) => renameSheet(prev, id, name))}
                onAdd={() => setWorkspace((prev) => addSheet(prev, metric))}
                onRemove={handleRemoveSheet}
              />
            }
          />

          <div className="app__side">
            <SuspectList
              suspects={suspects}
              maxPins={MAX_PINS}
              motives={motives}
              onMotiveChange={setMotive}
              onUnpin={handleTogglePinKey}
              canSubmit={activePins.length > 0}
              submitLabel={submittedOnce ? '再提出 → CAPTAIN' : 'CAPTAIN に提出'}
              onSubmit={handleSubmit}
              note={
                submittedOnce && reviseBonus === 0 && captainState !== 'idle'
                  ? `修正して再提出すると REVISE BONUS (+${REVISE_BONUS})`
                  : undefined
              }
              bonusNote={reviseBonus > 0 ? `REVISE BONUS +${reviseBonus} 獲得` : undefined}
            />
            <CaptainPanel
              state={captainState}
              lines={challenge?.lines ?? []}
              reviseBonusAwarded={reviseBonus > 0}
              onAcknowledge={() => setCaptainState('acknowledged')}
            />
          </div>
        </div>
      )}

      {phase === 'OPERATION' && (
        <StubPhase
          title="逮捕作戦（打ち手立案）"
          lines={[
            '予定：赤ピンの容疑者ごとに作戦カードを作って貼る。',
            '予定：どの容疑者にも紐づかない作戦は警告（打ち手はツリー上の箱に対応する）。',
          ]}
          nextLabel="令状請求へ → WARRANT"
          onNext={() => setPhase('WARRANT')}
        />
      )}

      {phase === 'WARRANT' && (
        <StubPhase
          title="令状請求（打ち手評価）"
          lines={[
            '予定：作戦ごとに Impact・Feasibility・Time-Span を選ぶ。',
            '予定：優先順位を自動で並べ、最終回答を3行で書いて署長の承認をもらう。',
          ]}
        />
      )}

      <footer className="app__footer">
        ケース面接モック · EVIDENCE（ⅱ分解 ＋ ⅲ容疑者）が動作 · ⅰ は仮置き、ⅳ・ⅴ はプレースホルダ
      </footer>
    </div>
  )
}
