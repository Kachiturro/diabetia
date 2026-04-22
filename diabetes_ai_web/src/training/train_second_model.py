import json
from pathlib import Path

import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "diabetes.csv"
MODELS_DIR = PROJECT_ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)
EXCLUDED_FEATURES = {"SkinThickness"}
ZERO_AS_MISSING = {"Glucose", "BloodPressure", "Insulin", "BMI"}
TARGET_CANDIDATES = ("target", "Target", "Outcome")


def main():
    df = pd.read_csv(DATA_PATH)

    # Columnas donde 0 suele significar "dato no medido".
    for col in ZERO_AS_MISSING:
        if col in df.columns:
            df.loc[df[col] == 0, col] = np.nan

    # Detectar columna objetivo
    target_col = None
    for col in TARGET_CANDIDATES:
        if col in df.columns:
            target_col = col
            break

    if target_col is None:
        raise ValueError("No se encontró columna objetivo (target / Target / Outcome).")

    y = df[target_col].astype(int).values
    X_df = df.drop(columns=[target_col])
    X_df = X_df.drop(columns=[c for c in EXCLUDED_FEATURES if c in X_df.columns])
    X = X_df.values
    features = list(X_df.columns)

    candidates = {
        "logreg": LogisticRegression(max_iter=3000),
        "rf": RandomForestClassifier(
            n_estimators=600,
            random_state=42
        ),
        "gb": GradientBoostingClassifier(random_state=42),
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    best_auc = -1
    best_name = None
    best_pipe = None

    for name, model in candidates.items():
        pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", model),
        ])

        aucs = cross_val_score(pipe, X, y, cv=cv, scoring="roc_auc")
        mean_auc = float(np.mean(aucs))

        print(f"{name}: AUC mean={mean_auc:.4f} | folds={np.round(aucs, 4)}")

        if mean_auc > best_auc:
            best_auc = mean_auc
            best_name = name
            best_pipe = pipe

    print(f"\nMejor modelo sklearn: {best_name} (AUC={best_auc:.4f})")

    best_pipe.fit(X, y)

    joblib.dump(best_pipe, MODELS_DIR / "sk_model.joblib")
    (MODELS_DIR / "sk_model_meta.json").write_text(
        json.dumps({"model": best_name, "auc_cv": best_auc}, indent=2),
        encoding="utf-8",
    )
    (MODELS_DIR / "features.json").write_text(
        json.dumps(features, indent=2),
        encoding="utf-8",
    )

    print("\nGuardado en models/:")
    print("- sk_model.joblib")
    print("- sk_model_meta.json")
    print("- features.json")


if __name__ == "__main__":
    main()
