import json
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, accuracy_score, confusion_matrix


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "diabetes.csv"
MODELS_DIR = PROJECT_ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)
EXCLUDED_FEATURES = {"SkinThickness"}
ZERO_AS_MISSING = {"Glucose", "BloodPressure", "Insulin", "BMI"}
TARGET_CANDIDATES = ("target", "Target", "Outcome")


class TabularDataset(Dataset):
    def __init__(self, X: np.ndarray, y: np.ndarray):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32).view(-1, 1)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx: int):
        return self.X[idx], self.y[idx]


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
            nn.Linear(32, 1)  # salida logit
        )

    def forward(self, x):
        return self.net(x)


def evaluate(model, loader, device):
    model.eval()
    probs = []
    ys = []
    with torch.no_grad():
        for Xb, yb in loader:
            Xb = Xb.to(device)
            logits = model(Xb)
            pb = torch.sigmoid(logits).cpu().numpy().ravel()
            probs.append(pb)
            ys.append(yb.numpy().ravel())
    probs = np.concatenate(probs)
    ys = np.concatenate(ys)
    preds = (probs >= 0.5).astype(int)
    auc = roc_auc_score(ys, probs) if len(np.unique(ys)) > 1 else float("nan")
    acc = accuracy_score(ys, preds)
    cm = confusion_matrix(ys, preds)
    return auc, acc, cm


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"No encuentro el dataset en: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    for col in ZERO_AS_MISSING:
        if col in df.columns:
            df.loc[df[col] == 0, col] = np.nan

    target_col = next((col for col in TARGET_CANDIDATES if col in df.columns), None)
    if target_col is None:
        raise ValueError("No se encontro columna objetivo (target / Target / Outcome).")

    # Features y target
    y = df[target_col].astype(int).values
    X_df = df.drop(columns=[target_col])
    X_df = X_df.drop(columns=[c for c in EXCLUDED_FEATURES if c in X_df.columns])

    # Guardamos lista de features 
    features = list(X_df.columns)

    # Imputación + escalado
    imputer = SimpleImputer(strategy="median")
    scaler = StandardScaler()

    X = imputer.fit_transform(X_df.values)
    X = scaler.fit_transform(X)

    # Split train/val/test
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    train_ds = TabularDataset(X_train, y_train)
    val_ds = TabularDataset(X_val, y_val)
    test_ds = TabularDataset(X_test, y_test)

    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=256, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=256, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = MLP(in_features=X_train.shape[1]).to(device)

    # Ponderación para desbalance 
    pos = (y_train == 1).sum()
    neg = (y_train == 0).sum()
    pos_weight = torch.tensor([neg / max(pos, 1)], dtype=torch.float32).to(device)

    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    best_val_auc = -1
    best_state = None

    for epoch in range(1, 51):
        model.train()
        for Xb, yb in train_loader:
            Xb = Xb.to(device)
            yb = yb.to(device)

            optimizer.zero_grad()
            logits = model(Xb)
            loss = criterion(logits, yb)
            loss.backward()
            optimizer.step()

        val_auc, val_acc, val_cm = evaluate(model, val_loader, device)
        print(f"Epoch {epoch:02d} | val_auc={val_auc:.4f} val_acc={val_acc:.4f}")

        # Early-ish
        if np.isfinite(val_auc) and val_auc > best_val_auc:
            best_val_auc = val_auc
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    if best_state is None:
        best_state = model.state_dict()

    # Cargar mejor estado
    model.load_state_dict(best_state)

    test_auc, test_acc, test_cm = evaluate(model, test_loader, device)
    print("\n=== TEST ===")
    print(f"AUC: {test_auc:.4f}  ACC: {test_acc:.4f}")
    print("Confusion Matrix:\n", test_cm)

    # Guardar artefactos
    torch.save(model.state_dict(), MODELS_DIR / "model.pt")
    joblib.dump(imputer, MODELS_DIR / "imputer.joblib")
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")
    (MODELS_DIR / "features.json").write_text(json.dumps(features, indent=2), encoding="utf-8")

    print("\nGuardado en /models:")
    print("- model.pt")
    print("- imputer.joblib")
    print("- scaler.joblib")
    print("- features.json")


if __name__ == "__main__":
    main()
