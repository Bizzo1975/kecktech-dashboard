"""Proposed evaluator JSON adapter; not installed in Sovereign."""
from datetime import date, datetime, time

from neo4j.time import Date, DateTime, Time


def alert_json_default(value):
    """Preserve Neo4j temporal precision in ISO strings; reject unknown objects."""
    if isinstance(value, (Date, DateTime, Time)):
        return value.iso_format()
    if isinstance(value, (date, datetime, time)):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")
