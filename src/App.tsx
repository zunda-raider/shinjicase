import { useEffect, useMemo, useState } from 'react'
import { CaptainPanel } from './components/CaptainPanel'
import { EvidenceBoard } from './components/EvidenceBoard'
import { IntakeMemos } from './components/IntakeMemos'
import { PhaseNav } from './components/PhaseNav'
import { ScoreBoard } from './components/ScoreBoard'
import { StubPhase } from './components/StubPhase'
import { SuspectCard } from './components/SuspectCard'
import { SAMPLE_CASE } from './data/case'
import { STUB_INTAKE, formatTarget } from './data/intake'
import { PHASES } from './data/phases'
import {
  REVISE_BONUS,
  baseScore,
  evaluateSubmission,
} from './logic/captain'
import { createTree, isEvidenceTree, treeToCandidates } from './logic/evidenceTree'
import type {
  CaptainState,
  CandidateId,
  CaseData,
  ChallengeResult,
  EvidenceTree,
  Phase,
} from './types'
import './App.css'

const MAX_PRIMES = 3
const TREE_STORAGE_KEY = 'shinjicase.evidence.v1'

const PHASE_TITLES: Record<Phase, string> = {
  INTAKE: '事件受理 — INTAKE',
  EVIDENCE: '捜査ボード — EVIDENCE',
  PRIME_SUSPECT: '容疑者特定 — PRIME SUSPECT',
  OPERATION: '逮捕作戦 — OPERATION',
  WARRANT: '令状請求 — WARRANT',
}

function loadTree(rootLabel: string): EvidenceTree {
  try {
    const raw = localStorage.getItem(TREE_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isEvidenceTree(parsed)) return parsed
    }
  } catch {
    // 壊れたデータは捨てて作り直す
  }
  return createTree(rootLabel)
}

export default function App() {
  const intake = STUB_INTAKE
  const [phase, setPhase] = useState<Phase>('EVIDENCE')
  const [tree, setTree] = useState<EvidenceTree>(() => loadTree(intake.target.metric))

  const [pinned, setPinned] = useState<CandidateId[]>([])
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

  /** ⅱ で作ったカードがあればそれを容疑者候補に。空ならサンプル。 */
  const treeCandidates = useMemo(() => treeToCandidates(tree), [tree])
  const fromBoard = treeCandidates.length > 0
  const caseData: CaseData = useMemo(
    () =>
      fromBoard
        ? {
            id: 'evidence-board',
            title: `CASE FILE: ${intake.client.name} — 目標 ${formatTarget(intake.target)}`,
            briefing: `捜査ボードで洗い出したカード（${treeCandidates.length}枚）から、目標達成を阻む「犯人＝ボトルネック」を最大${MAX_PRIMES}名ピン留めし、動機（仮説）を記せ。`,
            idealPrimeCount: Math.min(MAX_PRIMES, treeCandidates.length),
            candidates: treeCandidates,
          }
        : SAMPLE_CASE,
    [fromBoard, treeCandidates, intake],
  )

  // ボードからカードが消えたら、そのピンも外れた扱いにする
  const activePinned = useMemo(
    () => pinned.filter((id) => caseData.candidates.some((c) => c.id === id)),
    [pinned, caseData],
  )

  const selections = useMemo(
    () =>
      activePinned.map((id) => ({
        candidateId: id,
        motive: motives[id] ?? '',
      })),
    [activePinned, motives],
  )

  const displayScore = lastScored + reviseBonus

  function togglePin(id: CandidateId) {
    setPinned((prev) => {
      const current = prev.filter((x) => caseData.candidates.some((c) => c.id === x))
      if (current.includes(id)) {
        return current.filter((x) => x !== id)
      }
      if (current.length >= MAX_PRIMES) return current
      return [...current, id]
    })
  }

  function setMotive(id: CandidateId, value: string) {
    setMotives((prev) => ({ ...prev, [id]: value }))
  }

  function handleSubmit() {
    const result = evaluateSubmission(selections, caseData)
    setChallenge(result)
    setCaptainState('challenging')
    const scored = baseScore(selections, caseData)
    setLastScored(scored)

    if (submittedOnce && reviseBonus === 0) {
      setReviseBonus(REVISE_BONUS)
    }
    setSubmittedOnce(true)
  }

  function handleAcknowledge() {
    setCaptainState('acknowledged')
  }

  function handleResetTree() {
    setTree(createTree(intake.target.metric))
    setPinned([])
    setMotives({})
  }

  const canSubmit = activePinned.length > 0
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
          pinnedCount={activePinned.length}
          maxPins={MAX_PRIMES}
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
            'ここで決めた指標が、EVIDENCE のルート（黒カード）になります。',
          ]}
          nextLabel="捜査ボードへ → EVIDENCE"
          onNext={() => setPhase('EVIDENCE')}
        />
      )}

      {phase === 'EVIDENCE' && (
        <>
          <EvidenceBoard tree={tree} onChange={setTree} onReset={handleResetTree} />
          <div className="board__actions board__actions--outside">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setPhase('PRIME_SUSPECT')}
            >
              容疑者特定へ → PRIME SUSPECT
            </button>
            <span className="board__revise-hint">
              {fromBoard
                ? `名前を入れたカード ${treeCandidates.length} 枚が容疑者候補になります。`
                : 'カードに名前を入れると容疑者候補になります（空ならサンプルケース）。'}
            </span>
          </div>
        </>
      )}

      {phase === 'PRIME_SUSPECT' && (
        <>
          <p className="app__briefing">{caseData.briefing}</p>

          <div className="app__layout">
            <main className="board" aria-label="容疑者ボード">
              <div className="board__header">
                <h2>
                  {fromBoard ? '捜査ボードのカード' : 'サンプルの候補カード'}
                </h2>
                <span className="board__hint">クリックでピン留め（最大 {MAX_PRIMES}）</span>
              </div>

              <div className="board__grid">
                {caseData.candidates.map((c) => (
                  <SuspectCard
                    key={c.id}
                    candidate={c}
                    pinned={activePinned.includes(c.id)}
                    motive={motives[c.id] ?? ''}
                    disabledPin={activePinned.length >= MAX_PRIMES}
                    onTogglePin={() => togglePin(c.id)}
                    onMotiveChange={(v) => setMotive(c.id, v)}
                  />
                ))}
              </div>

              <div className="board__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  {submittedOnce ? '再提出 → CAPTAIN' : 'CAPTAIN に提出'}
                </button>
                {submittedOnce && reviseBonus === 0 && captainState !== 'idle' && (
                  <span className="board__revise-hint">
                    修正して再提出すると REVISE BONUS (+{REVISE_BONUS})
                  </span>
                )}
                {reviseBonus > 0 && (
                  <span className="board__revise-won">REVISE BONUS +{reviseBonus} 獲得</span>
                )}
                {!fromBoard && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setPhase('EVIDENCE')}
                  >
                    ← 捜査ボードでカードを作る
                  </button>
                )}
              </div>
            </main>

            <CaptainPanel
              state={captainState}
              lines={challenge?.lines ?? []}
              reviseBonusAwarded={reviseBonus > 0}
              onAcknowledge={handleAcknowledge}
            />
          </div>
        </>
      )}

      {phase === 'OPERATION' && (
        <StubPhase
          title="逮捕作戦（打ち手立案）"
          lines={[
            '予定：容疑者（赤枠のカード）ごとに作戦カードを作って貼る。',
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
        ケース面接モック · ⅱ EVIDENCE と ⅲ PRIME SUSPECT が動作 · ⅰ は仮置き、ⅳ・ⅴ はプレースホルダ
      </footer>
    </div>
  )
}
