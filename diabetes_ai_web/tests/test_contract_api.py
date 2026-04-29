import sys
import types

from fastapi.testclient import TestClient


class FakeTorchPredictor:
    features = [
        "Pregnancies",
        "Glucose",
        "BloodPressure",
        "Insulin",
        "BMI",
        "DiabetesPedigreeFunction",
        "Age",
    ]

    def predict(self, data):
        age = float(data.get("Age", 0))
        if age < 21:
            raise ValueError("Age out of supported range")
        return {"probability": 0.61, "risk_level": "alto"}


class FakeEnsemblePredictor:
    def __init__(self, weight_torch=0.5):
        self.weight_torch = weight_torch

    def predict(self, data):
        age = float(data.get("Age", 0))
        if age < 21:
            raise ValueError("Age out of supported range")
        return {"probability": 0.64, "risk_level": "alto"}


fake_predictor_module = types.ModuleType("src.inference.predictor")
fake_predictor_module.DiabetesPredictor = FakeTorchPredictor
sys.modules["src.inference.predictor"] = fake_predictor_module

fake_ensemble_module = types.ModuleType("src.inference.ensemble_predictor")
fake_ensemble_module.EnsembleDiabetesPredictor = FakeEnsemblePredictor
sys.modules["src.inference.ensemble_predictor"] = fake_ensemble_module

from src.api.main import app


client = TestClient(app)


def test_health_contract():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert isinstance(payload["features"], list)
    assert isinstance(payload["features_count"], int)
    assert isinstance(payload["supported_age_range"], list)


def test_predict_ensemble_contract_success():
    response = client.post(
        "/predict/ensemble",
        json={
            "data": {
                "Pregnancies": 1,
                "Glucose": 160,
                "BloodPressure": 80,
                "Insulin": 90,
                "BMI": 31.2,
                "DiabetesPedigreeFunction": 0.7,
                "Age": 40,
            }
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "probability" in payload
    assert "risk_level" in payload
    assert isinstance(payload["probability"], float)
    assert payload["risk_level"] in {"bajo", "moderado", "alto", "muy alto"}


def test_predict_ensemble_contract_invalid_age():
    response = client.post(
        "/predict/ensemble",
        json={
            "data": {
                "Pregnancies": 1,
                "Glucose": 160,
                "BloodPressure": 80,
                "Insulin": 90,
                "BMI": 31.2,
                "DiabetesPedigreeFunction": 0.7,
                "Age": 12,
            }
        },
    )
    assert response.status_code == 400
    payload = response.json()
    assert "detail" in payload
