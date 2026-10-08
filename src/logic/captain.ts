import type { CaseData, ChallengeResult, PrimeSelection } from '../types'

const MIN_MOTIVE_LEN = 8

export function evaluateSubmission(
  selections: PrimeSelection[],
  caseData: CaseData,
): ChallengeResult {
  const emptyMotives = selections.filter((s) => !s.motive.trim())
  if (emptyMotives.length > 0 || selections.length === 0) {
    return {
      severity: 'empty',
      lines: [
        'CAPTAIN「動機欄が空だ。容疑者を指差すだけで捜査は終わらない。」',
        'CAPTAIN「一人ひとりに“なぜこのボトルネックか”を一行で書け。それから再提出だ。」',
      ],
    }
  }

  const weakMotives = selections.filter(
    (s) => s.motive.trim().length < MIN_MOTIVE_LEN,
  )
  if (weakMotives.length > 0) {
    return {
      severity: 'weak',
      lines: [
        'CAPTAIN「動機が短すぎる。仮説としては弱い。」',
        'CAPTAIN「証拠と因果が繋がる一文に書き直せ。REVISE すればボーナスも出す。」',
      ],
    }
  }

  if (selections.length !== caseData.idealPrimeCount) {
    return {
      severity: 'count',
      lines: [
        `CAPTAIN「プライムは ideally ${caseData.idealPrimeCount} 名だ。今は ${selections.length} 名。」`,
        'CAPTAIN「絞りすぎか、広すぎか。優先順位を見直して再提出しろ。」',
      ],
    }
  }

  return {
    severity: 'ok',
    lines: [
      'CAPTAIN「…悪くない。ただ、容疑者同士の切り分けはまだ甘い。」',
      'CAPTAIN「動機をもう一段シャープにできれば OPERATION へ進める。REVISE BONUS のチャンスだ。」',
    ],
  }
}

export function baseScore(selections: PrimeSelection[], caseData: CaseData): number {
  if (selections.length === 0) return 0
  let score = selections.length * 10
  const filled = selections.filter((s) => s.motive.trim().length >= MIN_MOTIVE_LEN)
  score += filled.length * 15
  if (selections.length === caseData.idealPrimeCount) score += 20
  return score
}

export const REVISE_BONUS = 25
