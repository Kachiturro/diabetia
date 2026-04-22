from typing import Any, Dict


# Campo eliminado del modelo por baja utilidad.
REMOVED_FIELDS = {
    "SkinThickness",
    "grosorPiel",
    "skin_thickness",
    "skinthickness",
}


# Aliases para aceptar payloads desde frontend/backend en espanol o ingles.
FEATURE_ALIASES = {
    "embarazos": "Pregnancies",
    "glucosa": "Glucose",
    "presionSangina": "BloodPressure",
    "presionSanguina": "BloodPressure",
    "insulina": "Insulin",
    "bmi": "BMI",
    "diabetesPedigree": "DiabetesPedigreeFunction",
    "edad": "Age",
    # Campo retirado: se ignora aunque llegue.
    "grosorPiel": None,
    "SkinThickness": None,
}


def normalize_prediction_input(data: Dict[str, Any]) -> Dict[str, Any]:
    normalized: Dict[str, Any] = {}

    for key, value in data.items():
        if key in REMOVED_FIELDS:
            continue

        mapped_key = FEATURE_ALIASES.get(key, key)
        if mapped_key is None or mapped_key in REMOVED_FIELDS:
            continue

        normalized[mapped_key] = value

    return normalized
