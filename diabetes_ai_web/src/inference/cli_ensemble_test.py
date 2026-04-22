from src.inference.ensemble_predictor import EnsembleDiabetesPredictor


def ask_float(name: str):
    while True:
        raw = input(f"Ingrese {name} (enter para dejar vacío): ").strip()
        if raw == "":
            return None
        try:
            return float(raw)
        except ValueError:
            print("Valor inválido, intenta otra vez.")

def main():
    print("\n===IA Dos modelos(PyTorch + sklearn) ===\n")
    pred = EnsembleDiabetesPredictor(weight_torch=0.5)
    requested_features = pred.features

    data = {}
    for f in requested_features:
        data[f] = ask_float(f)

    try:
        out = pred.predict(data)
    except ValueError as exc:
        print("\nNo se pudo calcular el riesgo:")
        print(f"  {exc}\n")
        return

    print("\n=== RESULTADO ===")
    print(f"Riesgo final: {out['probability']*100:.1f}%  | Nivel: {out['risk_level']}")
    print(f"  PyTorch:  {out['prob_torch']*100:.1f}%")
    print(f"  Sklearn:  {out['prob_sklearn']*100:.1f}%")
    print(f"Peso PyTorch: {out['weight_torch']}")
    if out["missing_fields"]:
        print("Imputados:", ", ".join(out["missing_fields"]))
    print()

if __name__ == "__main__":
    main()
