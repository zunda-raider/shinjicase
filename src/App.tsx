import { useEffect, useMemo, useState } from 'react'
import { CaptainPanel } from './components/CaptainPanel'
import { EvidenceBoard } from './components/EvidenceBoard'
import type { BoardMode } from './components/EvidenceBoard'
import { IntakeMemos } from './components/IntakeMemos'
import { PhaseNav } from './components/PhaseNav'
import { ScoreBoard } from './components/ScoreBoard'
import { StubPhase } from './components/StubPhase'
import { SuspectList } from './components/SuspectList'
import { STUB_INTAKE, formatTarget } from './data/intake'
import { PHASES } from './data/phases'
import {
  REVISE_BONUS,
  baseScore,
  evaluateSubmission,
} from './logic/captain'
import {
  MAX_PINS,
  createTree,
  exampleTree,
  isEvidenceTree,
  togglePin,
  treeToCandidates,
} from './logic/evidenceTree'
import type {
  CaptainState,
  CandidateId,
  CaseData,
  ChallengeResult,
  EvidenceTree,
  Phase,
} from './types'
import './App.css'

const TREE_STORAGE_KEY = 'shinjicase.evidence.v2'
/** 旧形式（自由配置カード）のキー。読み込まずに削除する。 */
const LEGACY_STORAGE_KEYS = ['shinjicase.evidence.v1']

const PHASE_TITLES: Record<Phase, string> = {
  INTAKE: '事件受理 — INTAKE',
  EVIDENCE: '捜査ボード — EVIDENCE',
  OPERATION: '逮捕作戦 — OPERATION',
  WARRANT: '令状請求 — WARRANT',
}

function loadTree(rootLabel: string): EvidenceTree {
  try {
    LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k))
    const raw = localStorage.getItem(TREE_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isEvidenceTree(parsed)) return parsed
    }
  } catch {
    // 壊れた・互換のないデータは捨てて作り直す
  }
  return createTree(rootLabel)
}

export default function App() {
  const intake = STUB_INTAKE
  const [phase, setPhase] = useState<Phase>('EVIDENCE')
  const [tree, setTree] = useState<EvidenceTree>(() => loadTree(intake.target.metric))
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
      localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify(tree))
    } catch {
      // 保存できなくても動作は続ける
    }
  }, [tree])

  const candidates = useMemo(() => treeToCandidates(tree), [tree])
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

  // ツリーから消えた・空欄になったカードのピンは外れた扱い
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

  function handleTogglePin(id: CandidateId) {
    setPins((prev) => togglePin(tree, prev, id))
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

  function replaceTree(next: EvidenceTree) {
    setTree(next)
    setPins([])
    setMotives({})
  }

  function handleLoadExample() {
    const hasWork = Object.keys(tree.nodes).length > 1
    if (hasWork && !window.confirm('今のツリーを例（売上 = 顧客数 × 客単価 …）で置き換えますか？')) {
      return
    }
    replaceTree(exampleTree(intake.target.metric))
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
            'ここで決めた指標が、EVIDENCE のツリーの一番上（黒カード）になります。',
          ]}
          nextLabel="捜査ボードへ → EVIDENCE"
          onNext={() => setPhase('EVIDENCE')}
        />
      )}

      {phase === 'EVIDENCE' && (
        <div className="app__layout">
          <EvidenceBoard
            tree={tree}
            onChange={setTree}
            mode={mode}
            onModeChange={setMode}
            pins={activePins}
            onTogglePin={handleTogglePin}
            onReset={() => replaceTree(createTree(intake.target.metric))}
            onLoadExample={handleLoadExample}
          />

          <div className="app__side">
            <SuspectList
              suspects={suspects}
              maxPins={MAX_PINS}
              motives={motives}
              onMotiveChange={setMotive}
              onUnpin={handleTogglePin}
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
