import difflib
import logging
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from ..repositories.repository import (
    PoemRepository,
    VersionRepository,
    TranslationRepository,
    MeterRepository,
    ReviewRepository,
    MediaRepository,
    PublishingRepository,
    LogRepository
)
from ..agents.fetch_agent import fetch_notes_from_keep
from ..agents.workflow import poetry_app
from ..agents.improvement_agent import run_improvement_agent
from ..models import models

logger = logging.getLogger("poetrystudio.poem_service")

class PoemService:
    def __init__(self, db: Session):
        self.db = db
        self.poem_repo = PoemRepository(db)
        self.ver_repo = VersionRepository(db)
        self.trans_repo = TranslationRepository(db)
        self.meter_repo = MeterRepository(db)
        self.review_repo = ReviewRepository(db)
        self.media_repo = MediaRepository(db)
        self.pub_repo = PublishingRepository(db)
        self.log_repo = LogRepository(db)

    def import_poetry_from_keep(self) -> List[models.Poem]:
        """
        Fetches notes from Google Keep (mock or real) and initiates the LangGraph AI analysis
        for each new imported poem note.
        """
        notes = fetch_notes_from_keep()
        imported_poems = []

        for note in notes:
            # Check if this Keep ID was already imported
            existing = self.db.query(models.Poem).filter(models.Poem.google_keep_id == note["google_keep_id"]).first()
            if existing:
                logger.info(f"Poem with Keep ID {note['google_keep_id']} already exists. Skipping.")
                imported_poems.append(existing)
                continue

            # Execute LangGraph Pipeline starting with the Fetch node
            # The database session is passed configurationally
            initial_state = {
                "poem_id": None,
                "title": note["title"],
                "original_text": note["text"],
                "language": note["language"],
                "source": "google_keep",
                "google_keep_id": note["google_keep_id"],
                "translations": {},
                "meter_analysis": {},
                "reviews": [],
                "aggregate_review": {},
                "image_paths": [],
                "publish_status": {},
                "logs": []
            }
            
            try:
                # Run compiled LangGraph state graph
                final_state = poetry_app.invoke(
                    initial_state,
                    config={"configurable": {"db": self.db}}
                )
                
                # Fetch the created poem record
                created_poem = self.poem_repo.get_by_id(final_state["poem_id"])
                if created_poem:
                    imported_poems.append(created_poem)
            except Exception as e:
                logger.error(f"LangGraph execution failed for note {note['title']}: {e}")
                self.db.rollback()

        return imported_poems

    def get_poems_list(self, skip: int = 0, limit: int = 100) -> List[models.Poem]:
        return self.poem_repo.get_all(skip, limit)

    def get_poem_details(self, poem_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieves a poem and joins its versions, translations, meter, reviews, and design media.
        """
        poem = self.poem_repo.get_by_id(poem_id)
        if not poem:
            return None

        versions = self.ver_repo.get_versions_by_poem(poem_id)
        translations = self.trans_repo.get_translations_by_poem(poem_id)
        meter = self.meter_repo.get_analysis_by_poem(poem_id)
        reviews = self.review_repo.get_reviews_by_poem(poem_id)
        media = self.media_repo.get_media_by_poem(poem_id)
        logs = self.log_repo.get_events_by_poem(poem_id)

        return {
            "poem": poem,
            "versions": versions,
            "translations": translations,
            "meter_analysis": meter,
            "audience_reviews": reviews,
            "generated_media": media,
            "events": logs
        }

    def update_poem_content(self, poem_id: int, new_text: str, title: Optional[str] = None, author: str = "user") -> Optional[models.Poem]:
        """
        Edits poem content. Generates a line-by-line diff and creates a new PoemVersion record.
        """
        poem = self.poem_repo.get_by_id(poem_id)
        if not poem:
            return None

        old_text = poem.original_text
        if old_text == new_text and (title is None or poem.title == title):
            return poem  # No changes

        # Calculate line-by-line diff
        diff = difflib.ndiff(old_text.splitlines(), new_text.splitlines())
        diff_summary = "\n".join(diff)

        # Update database records
        updates = {"original_text": new_text}
        if title:
            updates["title"] = title
        
        updated_poem = self.poem_repo.update(poem_id, updates)
        
        # Save version history
        self.ver_repo.create_version(
            poem_id=poem_id,
            content=new_text,
            created_by=author,
            agent_name=None if author == "user" else author,
            diff_summary=diff_summary
        )

        # Emit modification event
        from ..core.events import emit_event
        emit_event(self.db, "poem.modified", poem_id, {"by": author})

        return updated_poem

    def trigger_reanalysis(self, poem_id: int) -> Optional[Dict[str, Any]]:
        """
        Manually triggers the translation, meter and review analysis steps of LangGraph.
        """
        poem = self.poem_repo.get_by_id(poem_id)
        if not poem:
            return None

        # Re-run LangGraph from current state
        initial_state = {
            "poem_id": poem.id,
            "title": poem.title,
            "original_text": poem.original_text,
            "language": poem.language,
            "source": poem.source,
            "google_keep_id": poem.google_keep_id,
            "translations": {},
            "meter_analysis": {},
            "reviews": [],
            "aggregate_review": {},
            "image_paths": [],
            "publish_status": {},
            "logs": []
        }

        try:
            poetry_app.invoke(
                initial_state,
                config={"configurable": {"db": self.db}}
            )
            return self.get_poem_details(poem_id)
        except Exception as e:
            logger.error(f"Re-analysis failed for poem {poem_id}: {e}")
            return None

    def get_editor_improvements(self, poem_id: int) -> dict:
        poem = self.poem_repo.get_by_id(poem_id)
        if not poem:
            return {"suggestions": []}
        return run_improvement_agent(poem.original_text)

    def apply_editor_suggestion(self, poem_id: int, original_line: str, suggested_line: str) -> Optional[models.Poem]:
        poem = self.poem_repo.get_by_id(poem_id)
        if not poem:
            return None

        # Find line and replace it
        text = poem.original_text
        if original_line not in text:
            logger.warning(f"Line '{original_line}' not found in poem {poem_id}.")
            return poem

        new_text = text.replace(original_line, suggested_line)
        
        # Save updates as version modification
        return self.update_poem_content(poem_id, new_text, author="ImprovementAgent")
