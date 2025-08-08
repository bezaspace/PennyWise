from datetime import datetime, timezone


def get_current_month_string() -> str:
    """Return current month in YYYY-MM (local time)."""
    return datetime.now().strftime("%Y-%m")


def get_current_date_iso() -> str:
    """Return current date ISO string (YYYY-MM-DD)."""
    return datetime.now().strftime("%Y-%m-%d")


def get_current_timestamp_iso() -> str:
    """Return current timestamp ISO string (to seconds)."""
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


