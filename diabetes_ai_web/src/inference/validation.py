from typing import Any, Dict

SUPPORTED_AGE_MIN = 21.0
SUPPORTED_AGE_MAX = 81.0


def validate_age_supported(data: Dict[str, Any]) -> None:
    """Reject requests outside the age range observed during training."""
    age = data.get("Age")
    if age is None:
        return

    try:
        age_value = float(age)
    except (TypeError, ValueError) as exc:
        raise ValueError("Age must be a numeric value.") from exc

    if age_value < SUPPORTED_AGE_MIN or age_value > SUPPORTED_AGE_MAX:
        raise ValueError(
            f"Unsupported Age={age_value:.1f}. "
            f"Model is validated only for ages {int(SUPPORTED_AGE_MIN)}-{int(SUPPORTED_AGE_MAX)}."
        )
