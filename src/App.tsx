import { useMemo, useState } from 'react'
import { CaptainPanel } from './components/CaptainPanel'
import { PhaseNav } from './components/PhaseNav'
import { ScoreBoard } from './components/ScoreBoard'
import { SuspectCard } from './components/SuspectCard'
import { SAMPLE_CASE } from './data/case'
import {
  REVISE_BONUS,
  baseScore,
  evaluateSubmission,
} from './logic/captain'
import type { CaptainState, CandidateId, ChallengeResult } from './types'
import './App.css'

const MAX_PRIMES = 3

export default function App() {
  const caseData = SAMPLE_CASE
  const [pinned, setPinned] = useState<CandidateId[]>([])
  const [motives, setMotives] = useState<Record<CandidateId, string>>({})
  const [captainState, setCaptainState] = useState<CaptainState>('idle')
  const [challenge, setChallenge] = useState<ChallengeResult | null>(null)
  const [submittedOnce, setSubmittedOnce] = useState(false)
  const [reviseBonus, setReviseBonus] = useState(0)
  const [lastScored, setLastScored] = useState(0)

  const selections = useMemo(
    () =>
      pinned.map((id) => ({
        candidateId: id,
        motive: motives[id] ?? '',
      })),
    [pinned, motives],
  )

  const displayScore = lastScored + reviseBonus

  function togglePin(id: CandidateId) {
    setPinned((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= MAX_PRIMES) return prev
      return [...prev, id]
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

  const canSubmit = pinned.length > 0

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__badge">SHINJICASE</span>
          <h1 className="app__title">容疑者特定 — PRIME SUSPECT</h1>
          <p className="app__case">{caseData.title}</p>
        </div>
        <ScoreBoard
          score={displayScore}
          reviseBonus={reviseBonus}
          pinnedCount={pinned.length}
          maxPins={MAX_PRIMES}
        />
      </header>

      <PhaseNav active="PRIME_SUSPECT" />

      <p className="app__briefing">{caseData.briefing}</p>

      <div className="app__layout">
        <main className="board" aria-label="捜査ボード">
          <div className="board__header">
            <h2>候補ノード / カード</h2>
            <span className="board__hint">クリックでピン留め（最大 {MAX_PRIMES}）</span>
          </div>

          <div className="board__grid">
            {caseData.candidates.map((c) => (
              <SuspectCard
                key={c.id}
                candidate={c}
                pinned={pinned.includes(c.id)}
                motive={motives[c.id] ?? ''}
                disabledPin={pinned.length >= MAX_PRIMES}
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
          </div>
        </main>

        <CaptainPanel
          state={captainState}
          lines={challenge?.lines ?? []}
          reviseBonusAwarded={reviseBonus > 0}
          onAcknowledge={handleAcknowledge}
        />
      </div>

      <footer className="app__footer">
        ケース面接 ⅲ「ボトルネック特定」モック · 他フェーズはプレースホルダ
      </footer>
    </div>
  )
}
