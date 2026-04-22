import json
from pathlib import Path
from typing import Dict, Any, List, Optional

import numpy as np
import joblib
import torch
import torch.nn as nn

from src.inference.input_mapping import normalize_prediction_input
from src.inference.validation import validate_age_supported

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = PROJECT_ROOT / "models"


class MLP(nn.Module):
    def __init__(self, in_features: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1)
        )

    def forward(self, x):
        return self.net(x)


class EnsembleDiabetesPredictor:
    """
    Ensemble de:
    - Modelo PyTorch (MLP)
    - Modelo sklearn (RandomForest / GradientBoosting)
    """
    def __init__(self, weight_torch: float = 0.5):
        self.weight_torch = float(weight_torch)

        self.features: List[str] = json.loads(
            (MODELS_DIR / "features.json").read_text(encoding="utf-8")
        )

        # Preprocesado PyTorch
        self.imputer = joblib.load(MODELS_DIR / "imputer.joblib")
        self.scaler = joblib.load(MODELS_DIR / "scaler.joblib")

        # Modelo PyTorch
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.torch_model = MLP(in_features=len(self.features)).to(self.device)
        state = torch.load(MODELS_DIR / "model.pt", map_location="cpu")
        self.torch_model.load_state_dict(state)
        self.torch_model.eval()

        # Modelo sklearn (pipeline completo)
        self.sk_model = joblib.load(MODELS_DIR / "sk_model.joblib")

    def _risk_level(self, p: float) -> str:
        if p < 0.33:
            return "Bajo"
        if p < 0.66:
            return "Moderado"
        return "Alto"

    def _row_from_dict(self, data: Dict[str, Any]) -> (np.ndarray, List[str]):
        row = []
        missing = []
        for f in self.features:
            if f not in data or data[f] is None:
                missing.append(f)
                row.append(np.nan)
            else:
                row.append(data[f])
        X = np.array([row], dtype=float)
        return X, missing

    def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        normalized_data = normalize_prediction_input(data)
        validate_age_supported(normalized_data)

        X_raw, missing = self._row_from_dict(normalized_data)

        if len(missing) == len(self.features):
            raise ValueError(
                "No se recibieron variables validas para el modelo. "
                "Verifica nombres de campos y tipos numericos."
            )

        # PyTorch
        X_t = self.imputer.transform(X_raw)
        X_t = self.scaler.transform(X_t)

        with torch.no_grad():
            xb = torch.tensor(X_t, dtype=torch.float32).to(self.device)
            logit = self.torch_model(xb)
            p_torch = float(torch.sigmoid(logit).cpu().numpy().ravel()[0])

        # sklearn (fallback robusto para incompatibilidades de joblib/scikit-learn)
        p_sk: Optional[float] = None
        sklearn_error: Optional[str] = None
        try:
            p_sk = float(self.sk_model.predict_proba(X_raw)[0, 1])
        except Exception as exc:
            sklearn_error = str(exc)

        # Ensemble o fallback a solo PyTorch
        if p_sk is None:
            effective_weight_torch = 1.0
            p = p_torch
        else:
            effective_weight_torch = self.weight_torch
            p = effective_weight_torch * p_torch + (1 - effective_weight_torch) * p_sk

        return {
            "probability": p,
            "prob_torch": p_torch,
            "prob_sklearn": p_sk,
            "risk_level": self._risk_level(p),
            "missing_fields": missing,
            "weight_torch": effective_weight_torch,
            "model_mode": "ensemble" if p_sk is not None else "torch_fallback",
            "sklearn_error": sklearn_error,
        }
