// Shared helpers for the AI Health Report workflow.
// - All displayed timestamps come from REAL backend-persisted fields
//   (createdAt / generatedAt / created_at) and are converted to the
//   browser's local timezone, with seconds so same-minute artifacts remain
//   distinguishable.
// - Downloads use a Blob-based text export (no external PDF dependency).
//   Every step can be downloaded separately, and the Combined report is
//   ONE unified artifact containing all three evidence sections.

const SEVERITY_LABELS = {
  0: 'None (0)',
  1: 'Mild (1)',
  2: 'Moderate (2)',
  3: 'Severe (3)'
}

export const pretty = (s) => String(s ?? '').replace(/_/g, ' ')

/** Return the real persisted timestamp for a report/artifact. */
export const reportTimestamp = (report) =>
  report?.createdAt || report?.generatedAt || report?.created_at || report?.updatedAt || ''

/**
 * Format a persisted timestamp as local-time "Aug 27, 2026 • 11:36:42 PM".
 * Seconds are always included so two artifacts saved in the same minute are
 * still distinguishable. Returns '' for invalid/missing values (caller uses a
 * stable fallback).
 */
export const formatDateTime = (value) => {
  const d = new Date(value)
  if (!value || isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  return `${date} • ${time}`
}

export const safeStamp = (value, fallback = 'unknown time') => {
  const s = formatDateTime(value)
  return s || fallback
}

/** Newest-first based on real persisted timestamps; stable for missing. */
export const sortNewestFirst = (list) =>
  [...(list || [])].sort((a, b) => {
    const ta = new Date(reportTimestamp(a)).getTime()
    const tb = new Date(reportTimestamp(b)).getTime()
    const va = isNaN(ta) ? 0 : ta
    const vb = isNaN(tb) ? 0 : tb
    return vb - va
  })

/** Download a plain-text artifact in-browser (no server round-trip). */
export const downloadTextFile = (filename, text) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** STEP 1 — Pet information / history section text. */
export const petInfoText = (pet, capturedHistory) => {
  const g = pet || {}
  const h = capturedHistory || {}
  const lines = []
  lines.push('1. PET INFORMATION')
  lines.push(`   Name: ${g.name || 'Not recorded'}`)
  lines.push(`   Species: ${pretty(g.species) || 'Not recorded'}`)
  lines.push(`   Breed: ${pretty(g.breed) || 'Not recorded'}`)
  lines.push(`   Age: ${g.age != null && g.age !== '' ? `${g.age} yr` : 'Not recorded'}`)
  lines.push(`   Sex: ${pretty(g.gender) || pretty(g.sex) || 'Not recorded'}`)
  if (Array.isArray(g.allergies) && g.allergies.length) lines.push(`   Allergies: ${g.allergies.join(', ')}`)

  if (Array.isArray(h.priorConditions)) lines.push(`   Prior AI report conditions: ${h.priorConditions.length ? h.priorConditions.join(', ') : 'None'}`)
  return lines.join('\n')
}

/** STEP 2 — Symptom evidence section text. */
export const symptomEvidenceText = ({ symptoms, symptomKeys, prediction, timestamp, reportId }) => {
  const lines = []
  lines.push('2. SYMPTOM ASSESSMENT')
  lines.push(`   Generated: ${safeStamp(timestamp)}`)
  if (reportId) lines.push(`   Report reference: ${reportId}`)
  const active = Object.entries(symptoms || {}).filter(([, n]) => Number(n) > 0)
  if (active.length) {
    lines.push('   Symptoms:')
    active.forEach(([k, n]) => lines.push(`    - ${pretty(k)}: ${SEVERITY_LABELS[Number(n)] || n}`))
  } else if (Array.isArray(symptomKeys) && symptomKeys.length) {
    // Persisted combined/symptom reports store the used symptom KEYS only;
    // severities are not re-fabricated for the download.
    lines.push('   Symptoms considered:')
    symptomKeys.forEach((k) => lines.push(`    - ${pretty(k)}`))
  } else {
    lines.push('   Symptoms: none recorded')
  }
  lines.push(`   Symptom model finding: ${pretty(prediction?.predictedCondition) || 'Unknown'}`)
  lines.push(`   Confidence: ${prediction?.confidenceLevel || 'Unknown'}${prediction?.modelProbability != null ? ` (${Math.round(prediction.modelProbability * 100)}%)` : ''}`)
  return lines.join('\n')
}

/** STEP 3 — AI image evidence section text. */
export const imageEvidenceText = ({ imageFindings, imageConfidence, prediction, timestamp, reportId }) => {
  const findings = imageFindings || {}
  const confidence = imageConfidence || {}
  const lines = []
  lines.push('3. AI IMAGE ASSESSMENT')
  lines.push(`   Generated: ${safeStamp(timestamp)}`)
  if (reportId) lines.push(`   Image / evidence reference: ${reportId}`)
  lines.push(`   Predicted condition: ${pretty(findings.predicted_class) || pretty(prediction?.predictedCondition) || 'Unknown'}`)
  lines.push(`   Confidence: ${confidence.band || prediction?.confidenceLevel || 'Unknown'}${confidence.probability != null ? ` (${Math.round((confidence.probability || 0) * 100)}%)` : ''}`)
  if (Array.isArray(findings.top_conditions) && findings.top_conditions.length) {
    lines.push('   Possible conditions:')
    findings.top_conditions.forEach((t) => lines.push(`    - ${pretty(t.class)} (${Math.round((t.probability || 0) * 100)}%)`))
  }
  if (findings.model_version) {
    lines.push(`   Model: ${findings.model_version}${findings.backbone ? ` | backbone ${findings.backbone}` : ''}${findings.mode ? ` | mode ${findings.mode}` : ''}`)
  }
  return lines.join('\n')
}

/** STEP 4 — Combined AI assessment section text. */
export const combinedAssessmentText = ({ result, narrative, evidenceUsed }) => {
  const r = result || {}
  const lines = []
  lines.push('4. COMBINED AI ASSESSMENT')
  lines.push(`   Final preliminary finding: ${pretty(r.predictedCondition) || 'Unknown'}`)
  lines.push(`   Confidence / evidence band: ${r.evidenceBand || 'Unknown'}`)
  lines.push(`   Evidence used: ${evidenceUsed && evidenceUsed.length ? evidenceUsed.join(', ') : 'Not captured'}`)
  if (Array.isArray(r.topConditions) && r.topConditions.length) {
    lines.push('   Possible conditions:')
    r.topConditions.forEach((t) => lines.push(`    - ${pretty(t.condition)} (${Math.round((t.score || 0) * 100)}%) [${(t.source || []).join(', ')}]`))
  }
  if (r.conflicts && r.conflicts.length) {
    lines.push('   Conflict: symptom and image models disagreed; both findings preserved for veterinarian review.')
  }
  return lines.join('\n')
}

export const recommendationsText = (recs) => {
  const list = (recs && recs.length) ? recs : ['Veterinarian review is required before any treatment decision.']
  return `5. RECOMMENDATIONS\n${list.map((r) => `   - ${r}`).join('\n')}`
}

const CLINICAL_WARNING_LINES = [
  '7. MANDATORY CLINICAL WARNING',
  '   This report is a PRELIMINARY AI ASSESSMENT generated from symptom',
  '   indicators, a single image and pet history. It is NOT a diagnosis',
  '   and MUST NOT be used for treatment decisions.',
  '   Veterinarian review is required before any treatment decision.',
  '   Model probabilities are not clinically calibrated and are not medical certainty.'
]

/**
 * Build ONE unified "Combined AI Animal Health Report" text artifact combining
 * pet info + symptom + image + combined result + review + warning.
 */
export const buildCombinedReportText = (props) => {
  const {
    pet,
    capturedHistory,
    symptom,
    image,
    result,
    narrative,
    timestamp,
    reviewStatus,
    evidenceUsed
  } = props
  const lines = []
  lines.push('================================================')
  lines.push('MEDFLOW AI')
  lines.push('Combined AI Animal Health Report')
  lines.push(`Generated: ${safeStamp(timestamp)}`)
  lines.push('================================================')
  lines.push('')
  lines.push(petInfoText(pet, capturedHistory))
  lines.push('')
  lines.push(symptomEvidenceText(symptom || {}))
  lines.push('')
  if (image) {
    lines.push(imageEvidenceText({ ...image, timestamp }))
  } else {
    lines.push('(Image evidence: Not included)')
  }
  lines.push('')
  lines.push(combinedAssessmentText({ result, narrative, evidenceUsed }))
  if (narrative) lines.push(`   AI summary: ${narrative}`)
  lines.push('')
  lines.push(recommendationsText(result?.recommendations))
  lines.push('')
  lines.push('6. VETERINARIAN REVIEW')
  lines.push(`   Status: ${reviewStatus || 'Pending veterinarian review'}`)
  lines.push('')
  CLINICAL_WARNING_LINES.forEach((l) => lines.push(l))
  lines.push('')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Stage 4 — Veterinarian review status helpers.
// Shared display layer for the existing veterinarianReviewStatus lifecycle
// (backward compatible with the legacy pending/reviewed/dismissed values).
// ---------------------------------------------------------------------------

export const REVIEW_STATUS_LABELS = {
  pending: 'Pending Review',
  in_review: 'In Review',
  reviewed: 'Reviewed',
  approved: 'Approved',
  modified: 'Modified',
  dismissed: 'Dismissed',
  consultation_required: 'Consultation Required'
}

export const reviewStatusLabel = (status) =>
  REVIEW_STATUS_LABELS[String(status || '').trim()] || 'Pending Review'

export const reviewBadgeClass = (status) => {
  switch (String(status || '').trim()) {
    case 'approved':
    case 'reviewed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'modified':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'in_review':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'consultation_required':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'dismissed':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-orange-50 text-orange-700 border-orange-200'
  }
}

export const REVIEW_DECISION_LABELS = {
  in_review: 'Review started',
  approve: 'Approved the AI preliminary finding',
  modify: 'Modified / overrode the AI preliminary finding',
  dismiss: 'Dismissed the AI preliminary finding',
  consultation_requested: 'Further consultation required'
}

export const reviewDecisionLabel = (decision) =>
  REVIEW_DECISION_LABELS[String(decision || '').trim()] || pretty(decision) || '—'