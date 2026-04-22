# Diabetes AI Web

Proyecto de inferencia de riesgo de diabetes (PyTorch + sklearn).

## Alcance de validez

El modelo fue entrenado con edades entre `21` y `81` anos.
Entradas fuera de ese rango (por ejemplo, ninos) se rechazan para evitar resultados imprecisos.

## Features activas (sin `SkinThickness`)

- `Pregnancies`
- `Glucose`
- `BloodPressure`
- `Insulin`
- `BMI`
- `DiabetesPedigreeFunction`
- `Age`

`SkinThickness`/`grosorPiel` esta removida del modelo y se ignora si llega en el payload.

## Reentrenar modelos

Desde la raíz del proyecto:

```bash
.venv/bin/python src/training/train_torch.py
.venv/bin/python src/training/train_second_model.py
```

Esto regenera archivos en `models/` (`model.pt`, `imputer.joblib`, `scaler.joblib`, `sk_model.joblib`, `features.json`, etc.).

## Probar modelo PyTorch (CLI)

```bash
PYTHONPATH=. .venv/bin/python src/inference/cli_test.py
```

## Probar modelo Ensemble (CLI)

```bash
PYTHONPATH=. .venv/bin/python src/inference/cli_ensemble_test.py
```

## Verificar features cargadas por el modelo

```bash
cat models/features.json
```
