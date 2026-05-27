DEFAULT_STORE_SETTINGS = {
    "deliveryEstimateDays": 2,
    "originCity": "Kathmandu",
    "originCountry": "Nepal",
    "paymentWindowHours": 24,
}


def _bounded_int(value, fallback, minimum, maximum):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback

    return min(max(parsed, minimum), maximum)


def _string(value, fallback):
    if not isinstance(value, str):
        return fallback

    value = value.strip()
    return value or fallback


def get_store_settings():
    from .models import Layout

    layout = Layout.objects.filter(slug="home").first()
    config = layout.config if layout and isinstance(layout.config, dict) else {}
    settings = config.get("storeSettings")

    if not isinstance(settings, dict):
        settings = {}

    return {
        "deliveryEstimateDays": _bounded_int(
            settings.get("deliveryEstimateDays"),
            DEFAULT_STORE_SETTINGS["deliveryEstimateDays"],
            0,
            365,
        ),
        "originCity": _string(
            settings.get("originCity"),
            DEFAULT_STORE_SETTINGS["originCity"],
        ),
        "originCountry": _string(
            settings.get("originCountry"),
            DEFAULT_STORE_SETTINGS["originCountry"],
        ),
        "paymentWindowHours": _bounded_int(
            settings.get("paymentWindowHours"),
            DEFAULT_STORE_SETTINGS["paymentWindowHours"],
            1,
            168,
        ),
    }


def get_delivery_estimate_days():
    return get_store_settings()["deliveryEstimateDays"]
