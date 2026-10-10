import { useEffect, useMemo, useState } from 'react'
import { CaptainPanel } from './components/CaptainPanel'
import { EvidenceBoard } from './components/EvidenceBoard'
import type { BoardMode } from './components/EvidenceBoard'
import { IntakeMemos } from './components/IntakeMemos'
import { OperationPhase } from './components/OperationPhase'
import { PhaseNav } from './components/PhaseNav'
import { PhaseSteps } from './components/PhaseSteps'
import { ScoreBoard } from './components/ScoreBoard'
import { SheetTabs } from './components/SheetTabs'
import { StubPhase } from './components/StubPhase'
import { SuspectList } from './components/SuspectList'
import { ReportPhase } from './components/ReportPhase'
import { WarrantPhase } from './components/WarrantPhase'
import { STUB_INTAKE, formatTarget } from './data/intake'
import { PHASES } from './data/phases'
import {
  REVISE_BONUS,
  baseScore,
  evaluateSubmission,
} from './logic/captain'
import { MAX_PINS, createTree, subtreeIds } from './logic/evidenceTree'
import { isSuspectState } from './logic/operation'
import type { SuspectState } from './logic/operation'
import {
  collectMeasures,
  isFullyRated,
  loadWarrantState,
  namedAxes,
  pruneWarrant,
  addAxis as warrantAddAxis,
  removeAxis as warrantRemoveAxis,
  renameAxis as warrantRenameAxis,
  setFinalAnswer,
  setRating,
} from './logic/warrant'
import {
  buildScorePacket,
  ensureDefaultCards,
  loadReportState,
  pruneReportCards,
  reportMeasures,
  setActiveCard,
  setFeaturedMeasures,
  updatePitchCard,
} from './logic/report'
import { scoreCase } from './scoring/llamaClient'
import type { ScoreResult } from './scoring/types'
import {
  activeSheet,
  addMeasure,
  addSheet,
  createWorkspace,
  exampleWorkspace,
  migrateWorkspace,
  parsePinKey,
  pinKey,
  removeMeasure,
  removeSheet,
  renameSheet,
  selectSheet,
  syncRootLabel,
  toggleWorkspacePin,
  updateMeasure,
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
  ReportState,
  WarrantState,
} from './types'
import './App.css'

/** v4 = 切り口（シート）＋施策 */
const WORKSPACE_STORAGE_KEY = 'shinjicase.evidence.v4'
/** v3 = 切り口のみ（施策なし）、v2 = 単一ツリー。読み込んだら v4 に移行して削除 */
const V3_STORAGE_KEY = 'shinjicase.evidence.v3'
const V2_STORAGE_KEY = 'shinjicase.evidence.v2'
/** 赤ピン＋動機 */
const SUSPECT_STORAGE_KEY = 'shinjicase.suspects.v1'
/** ⅴ 評価軸・評点・最終回答 */
const WARRANT_STORAGE_KEY = 'shinjicase.warrant.v1'
const REPORT_STORAGE_KEY = 'shinjicase.report.v1'
/** 旧形式（自由配置カード）のキー。読み込まずに削除する。 */
const LEGACY_STORAGE_KEYS = ['shinjicase.evidence.v1']

const PHASE_TITLES: Record<Phase, string> = {
  INTAKE: '事件受理 — INTAKE',
  EVIDENCE: '捜査ボード — EVIDENCE',
  OPERATION: '逮捕作戦 — OPERATION',
  WARRANT: '令状請求 — WARRANT',
  REPORT: '最終報告 — REPORT',
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
    const ws = migrateWorkspace(
      {
        v4: readJson(WORKSPACE_STORAGE_KEY),
        v3: readJson(V3_STORAGE_KEY),
        v2: readJson(V2_STORAGE_KEY),
      },
      metric,
    )
    localStorage.removeItem(V3_STORAGE_KEY)
    localStorage.removeItem(V2_STORAGE_KEY)
    if (ws) return ws
  } catch {
    // 壊れた・互換のないデータは捨てて作り直す
  }
  return createWorkspace(metric)
}

function loadSuspects(): SuspectState {
  const v = readJson(SUSPECT_STORAGE_KEY)
  return isSuspectState(v) ? v : { pins: [], motives: {} }
}

function loadWarrant(): WarrantState {
  return loadWarrantState(readJson(WARRANT_STORAGE_KEY))
}

function loadReport(): ReportState {
  return loadReportState(readJson(REPORT_STORAGE_KEY))
}

export default function App() {
  const intake = STUB_INTAKE
  const [phase, setPhase] = useState<Phase>('EVIDENCE')
  const metric = intake.target.metric
  const [workspace, setWorkspace] = useState<EvidenceWorkspace>(() => loadWorkspace(metric))
  const [mode, setMode] = useState<BoardMode>('decompose')

  const [initialSuspects] = useState(loadSuspects)
  const [pins, setPins] = useState<CandidateId[]>(initialSuspects.pins)
  const [motives, setMotives] = useState<Record<CandidateId, string>>(initialSuspects.motives)
  const [warrant, setWarrant] = useState<WarrantState>(loadWarrant)
  const [report, setReport] = useState<ReportState>(() => loadReport())
  const [scoring, setScoring] = useState(false)
  const [score, setScore] = useState<ScoreResult | null>(null)
  const [scoreError, setScoreError] = useState<string | null>(null)
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

  useEffect(() => {
    try {
      localStorage.setItem(SUSPECT_STORAGE_KEY, JSON.stringify({ pins, motives }))
    } catch {
      // 保存できなくても動作は続ける
    }
  }, [pins, motives])

  // 消えた施策の評点は保存時に捨てる（表示用は下で prune）
  const warrantView = useMemo(() => pruneWarrant(warrant, syncRootLabel(workspace, metric)), [warrant, workspace, metric])

  useEffect(() => {
    try {
      localStorage.setItem(WARRANT_STORAGE_KEY, JSON.stringify(warrantView))
    } catch {
      // 保存できなくても動作は続ける
    }
  }, [warrantView])

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

  const warrantMeasures = useMemo(
    () => collectMeasures(ws, activePins),
    [ws, activePins],
  )
  const warrantDone = useMemo(() => {
    const named = namedAxes(warrantView)
    return (
      named.length >= 2 &&
      named.length === warrantView.axes.length &&
      warrantMeasures.length > 0 &&
      warrantMeasures.every((m) => isFullyRated(warrantView, m.key, named))
    )
  }, [warrantView, warrantMeasures])

  const reportMeasureList = useMemo(
    () => reportMeasures(ws, activePins, warrantView),
    [ws, activePins, warrantView],
  )

  const reportView = useMemo(() => {
    let r = pruneReportCards(report, reportMeasureList)
    r = ensureDefaultCards(r, reportMeasureList, intake)
    return r
  }, [report, reportMeasureList, intake])

  useEffect(() => {
    try {
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reportView))
    } catch {
      // ignore
    }
  }, [reportView])

  function handleToggleFeatured(measureKey: string) {
    const keys = reportView.cards.map((c) => c.measureKey)
    const next = keys.includes(measureKey)
      ? keys.filter((k) => k !== measureKey)
      : [...keys, measureKey]
    setReport(setFeaturedMeasures(reportView, next, reportMeasureList, intake))
  }

  async function handleSubmitReport() {
    setScoring(true)
    setScoreError(null)
    try {
      const packet = buildScorePacket({
        intake,
        ws,
        pins: activePins,
        motives,
        warrant: warrantView,
        report: reportView,
      })
      const result = await scoreCase(packet)
      setScore(result)
    } catch (e) {
      setScoreError(
        e instanceof Error ? e.message : '採点に失敗しました。もう一度提出してください。',
      )
    } finally {
      setScoring(false)
    }
  }


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

  function handleAddMeasure(nodeId: EvidenceNodeId, after?: string): string {
    const r = addMeasure(ws, sheet.id, nodeId, '', after)
    if (r.id) setWorkspace(r.ws)
    return r.id
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

      <PhaseNav active={phase} onSelect={setPhase} warrantDone={warrantDone} />

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
        <OperationPhase
          ws={ws}
          sheet={sheet}
          onSelectSheet={(id) => setWorkspace((prev) => selectSheet(prev, id))}
          pins={activePins}
          onAddMeasure={handleAddMeasure}
          onUpdateMeasure={(nodeId, id, text) =>
            setWorkspace((prev) => updateMeasure(prev, sheet.id, nodeId, id, text))
          }
          onRemoveMeasure={(nodeId, id) =>
            setWorkspace((prev) => removeMeasure(prev, sheet.id, nodeId, id))
          }
        />
      )}

      {phase === 'WARRANT' && (
        <WarrantPhase
          ws={ws}
          pins={activePins}
          warrant={warrantView}
          onAddAxis={() => setWarrant((prev) => warrantAddAxis(prev))}
          onRenameAxis={(id, name) => setWarrant((prev) => warrantRenameAxis(prev, id, name))}
          onRemoveAxis={(id) => setWarrant((prev) => warrantRemoveAxis(prev, id))}
          onRate={(key, axisId, grade) => setWarrant((prev) => setRating(prev, key, axisId, grade))}
          onFinalAnswer={(text) => setWarrant((prev) => setFinalAnswer(prev, text))}
        />
      )}

      {phase === 'REPORT' && (
        <ReportPhase
          measures={reportMeasureList}
          warrant={warrantView}
          report={reportView}
          onToggleFeatured={handleToggleFeatured}
          onSelectTab={(i) => setReport(setActiveCard(reportView, i))}
          onChangeCard={(i, patch) => setReport(updatePitchCard(reportView, i, patch))}
          onSubmit={handleSubmitReport}
          scoring={scoring}
          score={score}
          error={scoreError}
        />
      )}

      <PhaseSteps active={phase} onSelect={setPhase} warrantDone={warrantDone} />

      <footer className="app__footer">
        ケース面接モック · EVIDENCE〜REPORT（ⅱ〜ⅵ）が動作 · ⅰ は仮置き
      </footer>
    </div>
  )
}
