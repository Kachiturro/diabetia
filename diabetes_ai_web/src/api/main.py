from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.inference.ensemble_predictor import EnsembleDiabetesPredictor
from src.inference.predictor import DiabetesPredictor
from src.inference.validation import SUPPORTED_AGE_MIN, SUPPORTED_AGE_MAX


class PredictionInput(BaseModel):
    data: Dict[str, Optional[float]] = Field(
        ...,
        description="Valores de entrada por nombre de feature. Se permite null para imputar.",
    )


@lru_cache(maxsize=1)
def get_torch_predictor() -> DiabetesPredictor:
    return DiabetesPredictor()


@lru_cache(maxsize=1)
def get_ensemble_predictor() -> EnsembleDiabetesPredictor:
    weight_torch = float(os.getenv("WEIGHT_TORCH", "0.5"))
    return EnsembleDiabetesPredictor(weight_torch=weight_torch)


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
