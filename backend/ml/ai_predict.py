"""
VetFlow AI — Stage 1 ML Prediction Script (Integration)

Invoked by the MedFlow backend to run the Stage 1D LogisticRegression
baseline model on symptom input and produce a contract-compliant AIReport.

Reads JSON from stdin: {"symptoms": {"Fever": 0, "Cough": 1, ...}}
Writes JSON to stdout: {"success": true, "data": {...}}

Clinical Safety: Preliminary AI Assessment only. Not a diagnosis.
Veterinarian review is always required.
"""

import json
import os
import sys

import joblib
import numpy as np
import pandas as pd

FEATURE_COLUMNS = ["Fever", "Cough", "Diarrhea", "Lethargy", "Loss_of_Appetite"]
MODEL_VERSION = "vetflow-ml-v1.1.0-dev"
ASSESSMENT_TYPE = "PRELIMINARY_AI_ASSESSMENT"
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vetflow_model_v1_1.pkl")

DISCLAIMER = (
    "This is a preliminary AI assessment and NOT a clinical diagnosis. "
    "Model confidence is NOT medical certainty. "
    "Raw model probabilities are NOT clinically validated. "
    "Veterinarian review is required."
)
CONFIDENCE_NOTE = (
    "This confidence level is model confidence only, NOT medical certainty. "
    "Stage 1D evaluation found that raw model probabilities are not "
    "clinically calibrated. Do not treat these probabilities as clinical "
    "likelihoods."
)


def get_confidence_level(prob):
    if prob >= 0.75:
        return "High"
    if prob >= 0.50:
        return "Moderate"
    return "Low"


def validate_symptoms(symptoms):
    if not isinstance(symptoms, dict):
        raise ValueError("Symptoms must be a dictionary")
    missing = [f for f in FEATURE_COLUMNS if f not in symptoms]
    if missing:
        raise ValueError(f"Missing required symptoms: {missing}")
    unknown = [k for k in symptoms if k not in FEATURE_COLUMNS]
    if unknown:
        raise ValueError(f"Unknown symptom keys: {unknown}")
    normalized = {}
    for feature in FEATURE_COLUMNS:
        value = symptoms[feature]
        if value is None:
            raise ValueError(f"Symptom '{feature}' must not be null")
        if isinstance(value, bool):
            raise ValueError(f"Symptom '{feature}' must be numeric, got bool")
        if not isinstance(value, (int, float, np.integer, np.floating)):
            raise ValueError(f"Symptom '{feature}' must be numeric")
        if value < 0 or value > 3:
            raise ValueError(f"Symptom '{feature}' value {value} outside [0, 3]")
        if float(value) != int(value):
            raise ValueError(f"Symptom '{feature}' must be an integer")
        normalized[feature] = int(value)
    return normalized


def explain_prediction(model, normalized, feature_columns):
    explanation = {
        "type": "statistical_association",
        "note": "These are statistical model associations, not clinical causation.",
        "warning": "Do NOT interpret as medical causation.",
    }
    if hasattr(model, "coef_"):
        coefficients = model.coef_
        classes = model.classes_.tolist()
        input_df = pd.DataFrame(
            [[normalized[f] for f in feature_columns]],
            columns=feature_columns,
        )
        prediction = model.predict(input_df)[0]
        pred_idx = classes.index(prediction)
        contributions = coefficients[pred_idx] * input_df.iloc[0].to_numpy()
        feature_contributions = {
            feature: round(float(contrib), 6)
            for feature, contrib in zip(feature_columns, contributions)
        }
        sorted_features = sorted(
            feature_columns,
            key=lambda f: abs(feature_contributions[f]),
            reverse=True,
        )
        explanation["model_type"] = "logistic_regression"
        explanation["predicted_class"] = str(prediction)
        explanation["feature_contributions"] = feature_contributions
        explanation["top_contributing_features"] = sorted_features
        explanation["interpretation"] = (
            f"For the predicted class '{prediction}', the symptom features "
            f"with the strongest statistical association are: "
            f"{', '.join(sorted_features[:3])}. "
            f"These are statistical model associations, not clinical causation."
        )
    else:
        explanation["model_type"] = "unknown"
        explanation["interpretation"] = (
            "Feature-level explanation is not available for this model type."
        )
    return explanation


def run_prediction(symptoms):
    normalized = validate_symptoms(symptoms)
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    classes = list(model.classes_)
    input_df = pd.DataFrame(
        [[normalized[f] for f in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS
    )
    prediction = model.predict(input_df)[0]
    probabilities = model.predict_proba(input_df)[0]
    probability_map = {cls: float(prob) for cls, prob in zip(classes, probabilities)}
    sorted_probs = sorted(probability_map.items(), key=lambda x: x[1], reverse=True)
    top_predictions = [
        {"condition": cls, "probability": round(float(prob), 6)}
        for cls, prob in sorted_probs[:3]
    ]
    model_probability = float(max(probabilities))
    explanation = explain_prediction(model, normalized, FEATURE_COLUMNS)
    return {
        "assessmentType": ASSESSMENT_TYPE,
        "predictedCondition": str(prediction),
        "modelProbability": model_probability,
        "confidenceLevel": get_confidence_level(model_probability),
        "confidenceNote": CONFIDENCE_NOTE,
        "topPredictions": top_predictions,
        "probabilities": probability_map,
        "explanation": explanation,
        "modelVersion": MODEL_VERSION,
        "featuresUsed": FEATURE_COLUMNS,
        "veterinarianReviewRequired": True,
        "disclaimer": DISCLAIMER,
    }


def main():
    try:
        if len(sys.argv) < 2:
            raise ValueError("No input provided")
        payload = json.loads(sys.argv[1])
        result = run_prediction(payload.get("symptoms", {}))
        print(json.dumps({"success": True, "data": result}))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()