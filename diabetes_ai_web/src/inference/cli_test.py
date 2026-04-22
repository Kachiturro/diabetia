from src.inference.predictor import DiabetesPredictor


def ask_float(name: str):
    while True:
        s = input(f"{name}: ").strip()
        try:
            return float(s)
        except ValueError:
            print("  -> Ingresa un número válido.")

def main():
    predictor = DiabetesPredictor()
    requested_features = predictor.features

    print("\n=== PRUEBA RÁPIDA (Consola) - Riesgo de Diabetes ===")
    print("Escribe los valores y presiona Enter.\n")

    # Mostrar las features esperadas por el modelo
    print("El modelo espera estas variables (en este orden):")
    print(", ".join(requested_features))
    print("\nVamos a pedirlas una por una:\n")

    data = {}
    for f in requested_features:
        data[f] = ask_float(f)

    try:
        result = predictor.predict(data)
    except ValueError as exc:
        print("\nNo se pudo calcular el riesgo:")
        print(f"  {exc}\n")
        return

    p = result["probability"]

    print("\n=== RESULTADO ===")
    print(f"Riesgo estimado: {p*100:.1f}%")
    print(f"Nivel: {result['risk_level']}")

    missing = result.get("missing_fields", [])
    if missing:
        print(f"Campos faltantes que se imputaron: {', '.join(missing)}")

    print("\n(Esto es una estimación y no sustituye diagnóstico médico.)\n")

if __name__ == "__main__":
    main()
