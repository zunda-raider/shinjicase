import { useMemo, useState } from 'react'
import { getModelStudents } from '../data/models'
import type { ModelMode as Mode } from '../data/models/types'
import { pinKey, parsePinKey } from '../logic/workspace'
import { buildModelView, defaultOperationSheet } from '../logic/modelView'
import type { Phase } from '../types'
import { PHASE_TITLES } from '../data/phases'
import { EvidenceBoard } from './EvidenceBoard'
import { OperationPhase } from './OperationPhase'
import { ModeCycle } from './ModeCycle'
import { PhaseNav, type ViewMode } from './PhaseNav'
import { PhaseSteps } from './PhaseSteps'
import { QaText } from './QaText'
import { WarrantList } from './WarrantPhase'
import { ReportPhase } from './ReportPhase'
import { ReviewPanel } from './ReviewPanel'
import { SheetTabs } from './SheetTabs'
import { draftReportScript } from '../logic/report'
import { buildModelReview } from '../logic/modelReview'
import { getIdeal } from '../data/ideals'

interface Props {
  caseId: string
  mode: Mode
  initialPhase?: Phase
  initialStudent?: number
  onTitle: () => void
  onViewMode: (m: ViewMode, phase: Phase) => void
}


/** GHOST MODE / GOD MODE：優秀な生徒の回答をいつもの画面で閲覧（編集不可・保存なし） */
export function ModelMode({ caseId, mode, initialPhase, initialStudent, onTitle, onViewMode }: Props) {
  const students = getModelStudents(caseId)
  const [idx, setIdx] = useState(Math.max(0, (initialStudent ?? 1) - 1))
  const [phase, setPhase] = useState<Phase>(
    initialPhase ?? 'INTAKE',
  )
  // 選んだ切り口は「生徒・モード・OPERATION か否か」が同じ間だけ有効（変わったら既定に戻す）
  const [sheetSel, setSheetSel] = useState<{ ctx: string; id: string } | null>(null)
  const [pitchIdx, setPitchIdx] = useState(0)
  const [pickOpen, setPickOpen] = useState(false)

  const view = useMemo(() => {
    const st = getModelStudents(caseId)[idx]
    return st ? buildModelView(st, mode) : null
  }, [caseId, idx, mode])
  if (!view) return null

  const ctx = `${idx}-${mode}-${phase === 'OPERATION' ? 'op' : 'ev'}`
  const sheetId = sheetSel?.ctx === ctx ? sheetSel.id : null
  const setSheetId = (id: string | null) => setSheetSel(id ? { ctx, id } : null)
  const defaultId = phase === 'OPERATION' ? defaultOperationSheet(view.ws) : view.ws.sheets[0].id
  const sheet =
    view.ws.sheets.find((s) => s.id === sheetId) ?? view.ws.sheets.find((s) => s.id === defaultId) ?? view.ws.sheets[0]
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
  const go = (p: Phase) => setPhase(p)
  const scriptText = draftReportScript(
    view.pitches.map((p) => ({
      measureKey: p.title,
      premiseDefinition: p.premise,
      premiseClient: '',
      premiseTarget: '',
      current: p.current,
      goal: p.goal,
      where: p.where,
      effect: p.effect,
    })),
    view.intake,
  )
  const review = buildModelReview(view.student, mode, getIdeal(caseId))

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
                      setSheetId(null)
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
        onTitle={onTitle}
        readOnly
      />

      <section className="intake-memos" aria-label="前提メモ">
        {view.premises.map((m) => (
          <div key={m.label} className="intake-memo">
            <span className="intake-memo__pin" aria-hidden="true" />
            <span className="intake-memo__label">{m.label}</span>
            <span className="intake-memo__body">
              <QaText text={m.value} />
            </span>
          </div>
        ))}
      </section>

      {phase === 'INTAKE' && (
        <section className="board model-intake" aria-label="前提">
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
        <div className="app__layout app__layout--full">
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
            factCards={view.factCards}
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
          initialMeasures={view.initial}
        />
      )}

      {phase === 'WARRANT' && (
        <section className="board model-warrant warrant-why" aria-label="なぜその施策か">
          <WarrantList rows={view.why} readOnly />
        </section>
      )}

      {phase === 'SUMMARY' && (
        <section className="board report-pitch model-report" aria-label="要点">
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
                {p.role ?? '？'}
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

      {phase === 'REPORT' && (
        <>
          <ReportPhase
            script={{ version: 1, text: scriptText }}
            onChange={() => {}}
            error={null}
            readOnly
          />
          <ReviewPanel review={review} mode={mode} />
        </>
      )}

      <PhaseSteps active={phase} onSelect={go} readOnly />

    </div>
  )
}
