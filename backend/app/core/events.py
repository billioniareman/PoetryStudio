from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import logging
from ..repositories.repository import LogRepository

logger = logging.getLogger("poetrystudio.events")

def emit_event(db: Session, event_name: str, poem_id: Optional[int], payload: Dict[str, Any]):
    """
    Records an event in the DB logs and emits it.
    Can be expanded to publish to Redis pub/sub or rabbitmq.
    """
    try:
        log_repo = LogRepository(db)
        event_record = log_repo.log_event(poem_id, event_name, payload)
        logger.info(f"Emitted Event: {event_name} for Poem ID: {poem_id} | Event ID: {event_record.id}")
        return event_record
    except Exception as e:
        logger.error(f"Failed to emit event {event_name}: {e}")
        return None
