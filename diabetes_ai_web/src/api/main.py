from __future__ import annotations

import os
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.inference.input_mapping import normalize_prediction_input
from src.inference.validation import SUPPORTED_AGE_MIN, SUPPORTED_AGE_MAX
from src.inference.validation import validate_age_supported

try:
    from src.inference.ensemble_predictor import EnsembleDiabetesPredictor
except Exception:
    EnsembleDiabetesPredictor = None

try:
    from src.inference.predictor import DiabetesPredictor
except Exception:
    DiabetesPredictor = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = PROJECT_ROOT / "models"


class PredictionInput(BaseModel):
    data: Dict[str, Optional[float]] = Field(
        ...,
        description="Valores de entrada por nombre de feature. Se permite null para imputar.",
    )


class SklearnPredictor:
    def __init__(self):
        self.features = json.loads((MODELS_DIR / "features.json").read_text(encoding="utf-8"))
        self.sk_model = joblib.load(MODELS_DIR / "sk_model.joblib")

    def _risk_level(self, p: float) -> str:
        if p < 0.33:
            return "Bajo"
        if p < 0.66:
            return "Moderado"
        return "Alto"

    def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        normalized_data = normalize_prediction_input(data)
        validate_age_supported(normalized_data)
        row = []
        missing = []
        for f in self.features:
            if f not in normalized_data or normalized_data[f] is None:
                missing.append(f)
                row.append(np.nan)
            else:
                row.append(normalized_data[f])

        if len(missing) == len(self.features):
            raise ValueError(
                "No se recibieron variables validas para el modelo. "
                "Verifica nombres de campos y tipos numericos."
            )

        X = np.array([row], dtype=float)
        p = float(self.sk_model.predict_proba(X)[0, 1])
        return {
            "probability": p,
            "risk_level": self._risk_level(p),
            "missing_fields": missing,
            "model_mode": "sklearn_only",
        }


@lru_cache(maxsize=1)
def get_torch_predictor():
    if DiabetesPredictor is None:
        return get_sklearn_predictor()
    return DiabetesPredictor()


@lru_cache(maxsize=1)
def get_ensemble_predictor():
    if EnsembleDiabetesPredictor is None:
        return get_sklearn_predictor()
    weight_torch = float(os.getenv("WEIGHT_TORCH", "0.5"))
    return EnsembleDiabetesPredictor(weight_torch=weight_torch)


@lru_cache(maxsize=1)
def get_sklearn_predictor() -> SklearnPredictor:
    return SklearnPredictor()


app = FastAPI(
    title="Diabetes Risk API",
    description="API de inferencia para riesgo de diabetes con modelos PyTorch y Ensemble.",
    version="1.0.0",
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
origins = [item.strip() for item in allowed_origins.split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, Any]:
    torch_pred = get_torch_predictor()
    return {
        "status": "ok",
        "features_count": len(torch_pred.features),
        "features": torch_pred.features,
        "supported_age_range": [int(SUPPORTED_AGE_MIN), int(SUPPORTED_AGE_MAX)],
    }


@app.post("/predict/torch")
def predict_torch(payload: PredictionInput) -> Dict[str, Any]:
    try:
        predictor = get_torch_predictor()
        return predictor.predict(payload.data)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/predict/ensemble")
def predict_ensemble(payload: PredictionInput) -> Dict[str, Any]:
    try:
        predictor = get_ensemble_predictor()
        return predictor.predict(payload.data)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
