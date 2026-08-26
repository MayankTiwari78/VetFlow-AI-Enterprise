"""
VetFlow-AI · Stage 2C CV inference bridge for the MedFlow backend.

Glue script between the Node.js API and the Phase 2C veterinary computer
vision implementation living in reference-ml/stage2_cv.

It intentionally contains NO model logic: it imports the existing Stage 2C
HeadPredictor (inference/cv_predict.py) which owns checkpoint loading,
preprocessing, temperature calibration and the response contract
(modelModality / assessmentType / veterinarianReviewRequired / disclaimer /
imageFindings / imageConfidence).

Usage:
    python cv_predict_bridge.py <image_path> <head_key>

Output (stdout): single JSON line
    {"success": true, "data": {<Stage 2C prediction contract>}}
or {"success": false, "error": "<human readable reason>"}

Never expose filesystem paths to callers: error strings are sanitised here.
"""

from __future__ import annotations

import json
import os
import sys

# head_key -> checkpoint filename pattern; "finetune" heads are the
# production/default checkpoints produced by the Phase 2C ablation.
SUPPORTED_HEADS = (
    "dog_derm_coarse",
    "dog_derm_fine",
    "cat_derm",
    "cattle_lumpy",
)


def _stage2_root() -> str:
    override = os.environ.get("CV_STAGE2_ROOT", "").strip()
    if override:
        return override
    # Default layout: MedFlow-AI-Enterprise/backend/ml/<this file>
    #   ml -> backend -> repo root; workspace sits one level above the repo.
    return os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "..", "..", "..", "reference-ml", "stage2_cv")
    )


def _emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def _fail(message: str) -> None:
    _emit({"success": False, "error": message})


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        _fail("Usage: cv_predict_bridge.py <image_path> <head_key>")
        return 2

    image_path, head_key = argv[1], argv[2]

    if not os.path.isfile(image_path):
        # Deliberately vague: never leak temp paths to the API caller.
        _fail("The uploaded image could not be read for AI assessment.")
        return 3

    if head_key not in SUPPORTED_HEADS:
        _fail(f"AI image assessment unavailable for the requested model head '{head_key}'.")
        return 4

    root = _stage2_root()
    if not os.path.isdir(root):
        _fail("AI image assessment is not available on this server.")
        return 5

    checkpoint = os.path.join(root, "checkpoints", f"{head_key}_finetune_best.pt")
    if not os.path.isfile(checkpoint):
        _fail("AI image assessment models are not installed on this server.")
        return 6

    sys.path.insert(0, root)

    try:
        from inference.cv_predict import HeadPredictor  # noqa: E402 (stage2_cv import)
    except Exception:  # pragma: no cover - dependency/env problems
        _fail("AI image assessment engine could not be initialised.")
        return 7

    try:
        predictor = HeadPredictor(checkpoint)
        result = predictor.predict(image_path)
    except Exception:
        # Swallow internals (tracebacks may contain paths); keep contract clear.
        _fail("AI image assessment failed while analysing this image.")
        return 8

    _emit({"success": True, "data": result})
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
