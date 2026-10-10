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
import { IntakeSetup } from './components/IntakeSetup'
import { TitleScreen } from './components/TitleScreen'
import type { ArchiveTab } from './components/ArchiveViewer'
import { ModelMode } from './components/ModelMode'
import { PHASE_TITLES } from './data/phases'
import { ModeCycle } from './components/ModeCycle'
import { hasArchive } from './data/archive'
import { getIdeal } from './data/ideals'
import { SuspectList } from './components/SuspectList'
import { ReportPhase } from './components/ReportPhase'
import { ResultPhase } from './components/ResultPhase'
import { WarrantPhase } from './components/WarrantPhase'
import { formatTarget, intakeMetric } from './data/intake'
import { applySampleSuspects, getCase } from './data/cases'
import {
  REVISE_BONUS,
  baseScore,
  evaluateSubmission,
} from './logic/captain'
import { MAX_PINS, createTree, subtreeIds } from './logic/evidenceTree'
import {
  collectMeasures,
  isFullyRated,
  namedAxes,
  pruneWarrant,
  addAxis as warrantAddAxis,
  removeAxis as warrantRemoveAxis,
  renameAxis as warrantRenameAxis,
  setFinalAnswer,
  setRating,
  createWarrantState,
} from './logic/warrant'
import {
  buildScorePacket,
  ensureDefaultCards,
  pruneReportCards,
  reportMeasures,
  setActiveCard,
  setFeaturedMeasures,
  updatePitchCard,
  createReportState,
} from './logic/report'
import { scoreCase } from './scoring/llamaClient'
import type { ScoreResult } from './scoring/types'
import {
  caseStorageKey,
  loadActiveCaseId,
  loadCaseIntake,
  loadCaseReport,
  loadCaseSuspects,
  loadCaseWarrant,
  loadCaseWorkspace,
  saveActiveCaseId,
  writeJson,
} from './logic/caseStorage'
import {
  activeSheet,
  addMeasure,
  addSheet,
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
  IntakeData,
  Phase,
  SheetId,
  ReportState,
  WarrantState,
} from './types'
import './App.css'




export default function App() {
  const [caseId, setCaseId] = useState(() => loadActiveCaseId())
  const sample = getCase(caseId)
  const [intake, setIntake] = useState<IntakeData>(() => loadCaseIntake(loadActiveCaseId()))
  const [onTitle, setOnTitle] = useState(true)
  const [model, setModel] = useState<{ caseId: string; tab: ArchiveTab; phase?: Phase } | null>(null)
  const [phase, setPhase] = useState<Phase>('INTAKE')
  const metric = intakeMetric(intake)
  const [workspace, setWorkspace] = useState<EvidenceWorkspace>(() =>
    loadCaseWorkspace(loadActiveCaseId(), intakeMetric(loadCaseIntake(loadActiveCaseId()))),
  )
  const [mode, setMode] = useState<BoardMode>('decompose')

  const [pins, setPins] = useState<CandidateId[]>(
    () => loadCaseSuspects(loadActiveCaseId()).pins,
  )
  const [motives, setMotives] = useState<Record<CandidateId, string>>(
    () => loadCaseSuspects(loadActiveCaseId()).motives,
  )
  const [warrant, setWarrant] = useState<WarrantState>(() => loadCaseWarrant(loadActiveCaseId()))
  const [report, setReport] = useState<ReportState>(() => loadCaseReport(loadActiveCaseId()))
  const [scoring, setScoring] = useState(false)
  const [score, setScore] = useState<ScoreResult | null>(null)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [captainState, setCaptainState] = useState<CaptainState>('idle')
  const [challenge, setChallenge] = useState<ChallengeResult | null>(null)
  const [submittedOnce, setSubmittedOnce] = useState(false)
  const [reviseBonus, setReviseBonus] = useState(0)
  const [lastScored, setLastScored] = useState(0)

  useEffect(() => {
    saveActiveCaseId(caseId)
  }, [caseId])

  useEffect(() => {
    const { statement: _s, ...rest } = intake
    void _s
    writeJson(caseStorageKey(caseId, 'intake'), rest)
  }, [caseId, intake])

  useEffect(() => {
    writeJson(caseStorageKey(caseId, 'evidence'), workspace)
  }, [caseId, workspace])

  useEffect(() => {
    writeJson(caseStorageKey(caseId, 'suspects'), { pins, motives })
  }, [caseId, pins, motives])

  // 消えた施策の評点は保存時に捨てる（表示用は下で prune）
  const warrantView = useMemo(() => pruneWarrant(warrant, syncRootLabel(workspace, metric)), [warrant, workspace, metric])

  useEffect(() => {
    writeJson(caseStorageKey(caseId, 'warrant'), warrantView)
  }, [caseId, warrantView])

  // ルートは常に ⅰ の指標（INTAKE が変われば全切り口のルートも変わる）
  const ws = useMemo(() => syncRootLabel(workspace, metric), [workspace, metric])
  const sheet = activeSheet(ws)

  const tree = sheet.tree

  const candidates = useMemo(() => workspaceCandidates(ws), [ws])
  const caseData: CaseData = useMemo(
    () => ({
      id: sample.id,
      title: `CASE FILE: ${intake.client.name} — 目標 ${formatTarget(intake.target)}`,
      briefing: sample.odai,
      idealPrimeCount: Math.max(1, Math.min(MAX_PINS, candidates.length || 2)),
      candidates,
    }),
    [candidates, intake, sample],
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
    writeJson(caseStorageKey(caseId, 'report'), reportView)
  }, [caseId, reportView])

  function handleSwapMeasure(index: number, measureKey: string) {
    const keys = reportView.cards.map((c) => c.measureKey)
    keys[index] = measureKey
    setReport({ ...setFeaturedMeasures(reportView, keys, reportMeasureList, intake), manual: true })
  }

  async function handleSubmitReport(goToResult = true) {
    setScoring(true)
    setScoreError(null)
    if (goToResult) setPhase('RESULT')
    try {
      const packet = buildScorePacket({
        intake,
        ws,
        pins: activePins,
        motives,
        warrant: warrantView,
        report: reportView,
        rubric: getIdeal(caseId),
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
        `すべての切り口を「${sample.label}」の例ツリーで置き換えますか？（施策・ピンも例に合わせます）`,
      )
    ) {
      return
    }
    const ex = sample.buildExample()
    const { pins: sp, motives: sm } = applySampleSuspects(sample, ex)
    setWorkspace(ex)
    setPins(sp)
    setMotives(sm)
    setWarrant(createWarrantState())
    setReport(createReportState())
    setScore(null)
    setMode('decompose')
  }

  function handleOpenCase(nextId: string) {
    setOnTitle(false)
    if (nextId === caseId) {
      setPhase('INTAKE')
      return
    }
    const nextIntake = loadCaseIntake(nextId)
    const m = intakeMetric(nextIntake)
    setIntake(nextIntake)
    setCaseId(nextId)
    saveActiveCaseId(nextId)
    setWorkspace(loadCaseWorkspace(nextId, m))
    const sus = loadCaseSuspects(nextId)
    setPins(sus.pins)
    setMotives(sus.motives)
    setWarrant(loadCaseWarrant(nextId))
    setReport(loadCaseReport(nextId))
    setScore(null)
    setScoreError(null)
    setChallenge(null)
    setCaptainState('idle')
    setSubmittedOnce(false)
    setReviseBonus(0)
    setLastScored(0)
    setMode('decompose')
    setPhase('INTAKE')
  }


  function fillExampleIntake() {
    setIntake({ ...sample.intake, status: 'player', statement: sample.intake.statement })
  }

  if (model) {
    return (
      <ModelMode
        key={model.caseId}
        caseId={model.caseId}
        mode={model.tab}
        initialPhase={model.phase}
        onViewMode={(m, ph) => {
          if (m === 'NORMAL') {
            setModel(null)
            setPhase(ph)
          } else setModel({ caseId: model.caseId, tab: m, phase: ph })
        }}
      />
    )
  }

  if (onTitle) {
    return (
      <>
        <TitleScreen
          activeId={caseId}
          onOpen={handleOpenCase}
          onArchive={(id, tab) => setModel({ caseId: id, tab })}
        />
      </>
    )
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <h1 className="app__title">{PHASE_TITLES[phase]}</h1>
          <ModeCycle
            mode="NORMAL"
            available={hasArchive(caseId)}
            onChange={(m) => m !== 'NORMAL' && setModel({ caseId, tab: m, phase: phase === 'RESULT' ? 'REPORT' : phase })}
          />
        </div>
        <ScoreBoard
          score={displayScore}
          reviseBonus={reviseBonus}
          pinnedCount={activePins.length}
          maxPins={MAX_PINS}
        />
      </header>

      <PhaseNav active={phase} onSelect={setPhase} warrantDone={warrantDone} hasScore={score != null} onSubmit={() => void handleSubmitReport(true)} submitDisabled={reportView.cards.length === 0} scoring={scoring} />

      {phase !== 'INTAKE' && <IntakeMemos intake={intake} />}

      {phase === 'INTAKE' && (
        <section className="board intake-brief" aria-label="依頼人の調書">
          <div className="board__header">
            <h2>お題：{sample.odai}</h2>
            <span className="board__hint">{sample.label}</span>
          </div>
          {intake.statement && (
            <blockquote className="intake-brief__statement">
              <p>「{intake.statement}」</p>
            </blockquote>
          )}
          <IntakeSetup intake={intake} onChange={setIntake} onFillExample={fillExampleIntake} />
          <div className="intake-brief__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setOnTitle(true)}>
              ‹ 事件ファイル一覧
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setPhase('EVIDENCE')}>
              捜査を始める（EVIDENCE） ›
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                if (!intake.definition.meaning.trim()) fillExampleIntake()
                const ex = sample.buildExample()
                const { pins: sp, motives: sm } = applySampleSuspects(sample, ex)
                setWorkspace(ex)
                setPins(sp)
                setMotives(sm)
                setMode('decompose')
                setPhase('EVIDENCE')
              }}
            >
              例ツリーを載せて捜査開始
            </button>
          </div>
        </section>
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
          onSwapMeasure={handleSwapMeasure}
          onSelectTab={(i) => setReport(setActiveCard(reportView, i))}
          onChangeCard={(i, patch) => setReport(updatePitchCard(reportView, i, patch))}
          error={scoreError}
          hasScore={score != null}
          onOpenResult={() => setPhase('RESULT')}
        />
      )}

      {phase === 'RESULT' && (
        <ResultPhase
          score={score}
          scoring={scoring}
          error={scoreError}
          onBack={() => setPhase('REPORT')}
          onResubmit={() => void handleSubmitReport(true)}
        />
      )}


      <PhaseSteps active={phase} onSelect={setPhase} warrantDone={warrantDone} hasScore={score != null} onSubmit={() => void handleSubmitReport(true)} submitDisabled={reportView.cards.length === 0} scoring={scoring} />

      <footer className="app__footer">
        ケース面接モック · サンプル事件6件 · INTAKE〜RESULT
      </footer>
    </div>
  )
}
