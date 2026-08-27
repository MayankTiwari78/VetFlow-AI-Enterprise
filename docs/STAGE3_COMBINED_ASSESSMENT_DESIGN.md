# VetFlow-AI · Stage 3 — Combined Assessment Engine (Research Note)

Status: implemented, deterministic, unit-tested. NOT clinically validated.
This document explains the fusion design for research review. It deliberately
does NOT claim accuracy, F1, AUROC or any clinical significance — none has been
measured for the fused output.

## Why multimodal fusion

Veterinary skin triage information is naturally multimodal:

* what an owner reports as symptoms (Stage 1 ML),
* how a lesion visually presents on a single photograph (Stage 2C CV),
* the animal's recorded context/history.

Each signal carries different error modes (owner mis-reporting vs image
framing/lighting vs stale history). A single modality alone under-determines
the preliminary picture; combining them gives reviewers a single artifact that
shows ALL evidence, including disagreement.

## Why a deterministic weighted engine first (not a neural fusion model)

* **No fusion training data exists.** We have no labeled corpus pairing
  symptom-vector + image + outcome, so training a joint model would fabricate
  supervision we do not possess.
* **Calibration mismatch (core constraint).** Stage 1 probabilities are
  LogisticRegression `predict_proba` values explicitly flagged
  non-clinically-calibrated; Stage 2C uses temperature calibration over a
  DIFFERENT taxonomy (dog/cat/cattle dermatology classes). Blindly averaging
  p_symptom and p_image mixes incompatible scales and would silently double-
  count modality priors. See `combinedAssessmentService.ts` header comment.
* **Determinism / explainability / auditability** are product requirements:
  identical inputs must produce identical outputs and every contribution must
  be attributable to a source.
* **Replaceability**: the pure function signature
  `runCombinedAssessment(NormalizedEvidence, FusionWeights)` is exactly where a
  learned fusion model plugs in later, without touching controllers/routes.

## Evidence normalization (how incompatible numbers become comparable)

For each modality m with lead probability p_m and lead band b_m:

    support(m, c) = BAND_BASE[b_m] * (0.6 + 0.4 * p_c / maxP_m)

* `BAND_BASE = {High:1.0, Moderate:0.6, Low:0.33}` — band dominates so support
  tracks the calibrated/declared confidence tier, not raw p.
* The intra-modality ratio `p_c/maxP_m` preserves ranking within one modality
  WITHOUT importing its absolute scale into another's.
* Result is a RELATIVE evidence support in [0,1] per candidate condition —
  explicitly NOT a calibrated likelihood ( surfaced in
  `confidenceLimitation`).

## How pet history contributes

History evidence is rule-based and intentionally small-weighted:

* prior AI reports for this pet matching a candidate → +0.18
* medical-history string match → +0.15
* allergy-keyword overlap → +0.08

History can raise/lower ordering slightly but can never override both
modalities; it only contributes to conditions already proposed by symptom/image
evidence.

## Fusion

    S(c) = w_s·support(symptom,c) + w_i·support(image,c) + w_h·support(history,c)

Defaults `w = {symptom:.45, image:.45, history:.10}` (weights are data on the
contract for reproducibility). Candidates are the union of normalized condition
keys; labels preserve canonical taxonomy casing (image wins collisions).
Predicted condition = argmax S; band from conservative thresholds (≥0.66 High,
≥0.4 Moderate else Low). Always `veterinarianReviewRequired=true`.

## Modality disagreement handling

When BOTH modalities are present and their LEADS differ, the engine emits
`modalityDisagreement=true` plus a conflict row containing BOTH conditions and
an evidence-gap magnitude. It never suppresses either side and never resolves a
conflict silently — reviewer sees two competing leads.

## Explainability & reproducibility

Pure function, fixed weights versioned by `engineVersion`, no I/O,
deterministic iteration order, inputs echoed verbatim in `inputs`. Seed-free
(no randomness anywhere in the path).

## Risks / limitations (explicit)

* Supports/bands/weights are heuristic decision-support signals — NOT
  probabilities of disease presence.
* Rare-class CV instability persists from Stage 2C (bacterial_pyoderma n=9).
* History rules are string-matching heuristics; entity normalization is
  lightweight.
* Taxonomies differ across modalities; cross-modal agreement is currently only
  meaningful where normalized labels coincide.
* No external validation of ANY kind yet.

## Future work

1. Learned fusion head once paired-label data exists (replaces weighted sum;
   same interface).
2. Calibration study on fused scores using prospective vet-reviewed outcomes.
3. Real LLM narrative provider behind the existing flag/interface.

### Planned ablation experiments (require future labeled data; not run here)

| # | Configuration | Purpose |
|---|---|---|
| A1 | symptom-only | Stage-1 baseline strength |
| A2 | image-only | Stage-2C baseline strength |
| A3 | history-only | context-only ceiling |
| A4 | symptom+image | core two-modality gain |
| A5 | symptom+history | context correction value |
| A6 | image+history | visual+context value |
| A7 | symptom+image+history | full-engine lift over A4 |

Ablations reuse the SAME engine with subset weights zeroed (`w_x=0`) — no code
fork required.
