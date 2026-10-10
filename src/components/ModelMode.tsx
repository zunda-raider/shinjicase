import { useMemo, useState } from 'react'
import { getModelStudents } from '../data/models'
import type { ModelMode as Mode } from '../data/models/types'
import { pinKey, parsePinKey } from '../logic/workspace'
import { buildModelView } from '../logic/modelView'
import { MAX_PINS } from '../logic/evidenceTree'
import type { Phase } from '../types'
import { PHASE_TITLES } from '../data/phases'
import { EvidenceBoard } from './EvidenceBoard'
import { IntakeMemos } from './IntakeMemos'
import { OperationPhase } from './OperationPhase'
import { ModeCycle } from './ModeCycle'
import { PhaseNav, type ViewMode } from './PhaseNav'
import { PhaseSteps } from './PhaseSteps'
import { QaChip, QaText } from './QaText'
import { SheetTabs } from './SheetTabs'

interface Props {
  caseId: string
  mode: Mode
  initialPhase?: Phase
  onViewMode: (m: ViewMode, phase: Phase) => void
}


/** GHOST MODE / GOD MODE：優秀な生徒の回答をいつもの画面で閲覧（編集不可・保存なし） */
export function ModelMode({ caseId, mode, initialPhase, onViewMode }: Props) {
  const students = getModelStudents(caseId)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>(
    initialPhase && initialPhase !== 'RESULT' ? initialPhase : 'INTAKE',
  )
  const [sheetId, setSheetId] = useState('s1')
  const [pitchIdx, setPitchIdx] = useState(0)
  const [pickOpen, setPickOpen] = useState(false)

  const view = useMemo(() => {
    const st = getModelStudents(caseId)[idx]
    return st ? buildModelView(st, mode) : null
  }, [caseId, idx, mode])
  if (!view) return null

  const sheet = view.ws.sheets.find((s) => s.id === sheetId) ?? view.ws.sheets[0]
  const ws = { ...view.ws, activeSheetId: sheet.id }
  const pinNumbers: Record<string, number> = {}
  view.pins.forEach((k, i) => {
    const p = parsePinKey(k)
    if (p.sheetId === sheet.id) pinNumbers[p.nodeId] = i + 1
  })
  const pinCounts: Record<string, number> = {}
  view.pins.forEach((k) => {
    const p = parsePinKey(k)
    pinCounts[p.sheetId] = (pinCounts[p.sheetId] ?? 0) + 1
  })
  const nodeBadges: Record<string, string> = {}
  for (const id of Object.keys(sheet.tree.nodes)) {
    const q = view.nodeQa[pinKey(sheet.id, id)]
    if (q) nodeBadges[id] = q
  }
  const pitch = view.pitches[Math.min(pitchIdx, view.pitches.length - 1)]
  const go = (p: Phase) => setPhase(p === 'RESULT' ? 'REPORT' : p)

  return (
    <div className={`app model-mode model-mode--${mode.toLowerCase()}`} data-testid="model-mode">
      <header className="app__header">
        <div className="app__brand">
          <h1 className="app__title">{PHASE_TITLES[phase]}</h1>
          <ModeCycle mode={mode} available onChange={(m) => onViewMode(m, phase)} />
          <span className="model-students">
            <button
              type="button"
              className="model-students__toggle"
              aria-expanded={pickOpen}
              onClick={() => setPickOpen((o) => !o)}
            >
              生徒 {view.student.no} ▾
            </button>
            {pickOpen && (
              <span className="model-students__pop" role="listbox" aria-label="生徒">
                {students.map((s, i) => (
                  <button
                    key={s.no}
                    type="button"
                    role="option"
                    aria-selected={i === idx}
                    className={i === idx ? 'is-active' : ''}
                    onClick={() => {
                      setIdx(i)
                      setSheetId('s1')
                      setPitchIdx(0)
                      setPickOpen(false)
                    }}
                  >
                    {s.no}
                  </button>
                ))}
              </span>
            )}
          </span>

        </div>
      </header>

      <PhaseNav
        active={phase}
        onSelect={go}
        readOnly
      />

      {phase !== 'INTAKE' && <IntakeMemos intake={view.intake} />}

      {phase === 'INTAKE' && (
        <section className="board model-intake" aria-label="前提">
          <div className="board__header">
            <h2>前提</h2>
          </div>
          <dl className="model-list">
            {view.premises.map((p) => (
              <div key={p.label} className="model-list__row">
                <dt>{p.label}</dt>
                <dd>
                  <QaText text={p.value} />
                </dd>
              </div>
            ))}
          </dl>
          <div className="board__header">
            <h2>現状</h2>
          </div>
          <ul className="model-bullets">
            {view.current.map((c, i) => (
              <li key={i}>
                <QaText text={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {phase === 'EVIDENCE' && (
        <div className="app__layout">
          <EvidenceBoard
            key={`${idx}-${mode}-${sheet.id}`}
            tree={sheet.tree}
            onChange={() => {}}
            mode="suspect"
            onModeChange={() => {}}
            pinNumbers={pinNumbers}
            totalPins={view.pins.length}
            onTogglePin={() => {}}
            onReset={() => {}}
            onLoadExample={() => {}}
            readOnly
            nodeBadges={nodeBadges}
            tabs={
              <SheetTabs
                sheets={view.ws.sheets}
                activeId={sheet.id}
                pinCounts={pinCounts}
                onSelect={setSheetId}
                onRename={() => {}}
                onAdd={() => {}}
                onRemove={() => {}}
                readOnly
                badges={view.sheetQa}
              />
            }
          />
          <div className="app__side">
            <section className="suspect-list" aria-label="容疑者リスト">
              <header className="suspect-list__header">
                <span className="suspect-list__title">PRIME SUSPECTS</span>
                <span className="suspect-list__count">
                  {view.pins.length}/{MAX_PINS}
                </span>
              </header>
              <p className="model-focus">
                <b>狙う箱</b> {view.focus}
              </p>
              {view.pins.length === 0 ? (
                <p className="suspect-list__empty">容疑者なし</p>
              ) : (
                <ol className="suspect-list__items">
                  {view.pins.map((k, i) => {
                    const p = parsePinKey(k)
                    const sh = view.ws.sheets.find((s) => s.id === p.sheetId)!
                    return (
                      <li key={k} className="suspect-list__item">
                        <div className="suspect-list__row">
                          <span className="suspect-list__no">{i + 1}</span>
                          <span className="suspect-list__name">{sh.tree.nodes[p.nodeId].label}</span>
                          <QaChip label={view.nodeQa[k]} />
                        </div>
                        <span className="suspect-list__path">{sh.name}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}

      {phase === 'OPERATION' && (
        <OperationPhase
          key={`${idx}-${mode}`}
          ws={ws}
          sheet={sheet}
          onSelectSheet={setSheetId}
          pins={view.pins}
          onAddMeasure={() => ''}
          onUpdateMeasure={() => {}}
          onRemoveMeasure={() => {}}
          readOnly
          measureNotes={view.estimates}
        />
      )}

      {phase === 'WARRANT' && (
        <section className="board model-warrant" aria-label="評価">
          <div className="board__header">
            <h2>評価</h2>
          </div>
          <p className="model-empty">評点：記載なし</p>
          {view.notes.length > 0 && (
            <ul className="model-bullets">
              {view.notes.map((n) => (
                <li key={n.label}>
                  <b>{n.label}</b> <QaText text={n.text} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {phase === 'REPORT' && (
        <section className="board report-pitch model-report" aria-label="台本">
          <div className="report-tabs" role="tablist">
            {view.pitches.map((p, i) => (
              <button
                key={p.title}
                type="button"
                role="tab"
                aria-selected={pitch === p}
                className={`report-tab ${pitch === p ? 'is-active' : ''}`}
                onClick={() => setPitchIdx(i)}
              >
                {p.title}
              </button>
            ))}
          </div>
          {pitch ? (
            <dl className="model-list">
              {(
                [
                  ['前提', pitch.premise],
                  ['現状', pitch.current],
                  ['最終ゴール', pitch.goal],
                  ['施策 · ツリーのどこに効くか', pitch.where],
                  ['効果', pitch.effect],
                ] as const
              ).map(([label, text]) => (
                <div key={label} className="model-list__row">
                  <dt>{label}</dt>
                  <dd>{text ? <QaText text={text} /> : <span className="model-empty">記載なし</span>}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="model-empty">記載なし</p>
          )}
        </section>
      )}

      <PhaseSteps active={phase} onSelect={go} readOnly />

    </div>
  )
}
