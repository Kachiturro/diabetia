import json
from pathlib import Path
from typing import Dict, Any

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


class DiabetesPredictor:
    def __init__(self):
        self.features = json.loads((MODELS_DIR / "features.json").read_text(encoding="utf-8"))
        self.imputer = joblib.load(MODELS_DIR / "imputer.joblib")
        self.scaler = joblib.load(MODELS_DIR / "scaler.joblib")

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.model = MLP(in_features=len(self.features)).to(self.device)
        state = torch.load(MODELS_DIR / "model.pt", map_location="cpu")
        self.model.load_state_dict(state)
        self.model.eval()

    def _risk_level(self, p: float) -> str:
        # Ajusta umbrales como prefieras
        if p < 0.33:
            return "Bajo"
        if p < 0.66:
            return "Moderado"
        return "Alto"

    def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        normalized_data = normalize_prediction_input(data)
        validate_age_supported(normalized_data)

        # Asegurar orden de columnas
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
        X = self.imputer.transform(X)
        X = self.scaler.transform(X)

        with torch.no_grad():
            xb = torch.tensor(X, dtype=torch.float32).to(self.device)
            logit = self.model(xb)
            p = torch.sigmoid(logit).cpu().numpy().ravel()[0]

        return {
            "probability": float(p),
            "risk_level": self._risk_level(float(p)),
            "missing_fields": missing
        }
