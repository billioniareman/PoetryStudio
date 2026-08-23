import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger("poetrystudio.fetch_agent")

def fetch_notes_from_keep() -> List[Dict[str, Any]]:
    """
    Fetches notes from Google Keep.
    """
    use_mock = os.getenv("USE_MOCK_KEEP", "true").lower() == "true"
    email = os.getenv("GOOGLE_KEEP_EMAIL")
    password = os.getenv("GOOGLE_KEEP_PASSWORD")

    if use_mock or not email or not password:
        logger.warning("Google Keep credentials missing or USE_MOCK_KEEP is enabled. Returning empty list.")
        return []

    # Actual gkeepapi fetcher
    try:
        import gkeepapi
        keep = gkeepapi.Keep()
        if password.startswith("aas_et/"):
            logger.info("Master Token detected. Authenticating...")
            keep.authenticate(email, password)
        else:
            logger.info("App Password/Password detected. Logging in...")
            try:
                keep.login(email, password)
            except Exception:
                password_no_spaces = password.replace(" ", "")
                keep.login(email, password_no_spaces)
        
        
        notes = []
        # Find notes tagged with 'poetry' or 'poem'
        for note in keep.all():
            text = note.text or ""
            # Simple heuristic to identify poetry: multiple short lines
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            
            # If the user tagged the note as poetry or it contains the word "poetry"
            is_poetry_note = False
            for label in note.labels.all():
                if "poetry" in label.name.lower() or "poem" in label.name.lower():
                    is_poetry_note = True
                    break
                    
            if is_poetry_note or len(lines) > 2:
                notes.append({
                    "google_keep_id": note.id,
                    "title": note.title or (lines[0] if lines else "Untitled Note"),
                    "text": text,
                    "language": "Hindi",  # Default language detection fallback
                    "metadata": {"tags": ",".join([l.name for l in note.labels.all()])}
                })
        return notes
    except Exception as e:
        logger.error(f"Google Keep authentication/fetching failed: {e}.")
        return []

