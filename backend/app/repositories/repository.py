from sqlalchemy.orm import Session
from typing import List, Optional, Type
from ..models import models

class BaseRepository:
    def __init__(self, db: Session):
        self.db = db

class PoemRepository(BaseRepository):
    def get_by_id(self, poem_id: int) -> Optional[models.Poem]:
        return self.db.query(models.Poem).filter(models.Poem.id == poem_id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[models.Poem]:
        return self.db.query(models.Poem).order_by(models.Poem.updated_at.desc()).offset(skip).limit(limit).all()

    def create(self, title: str, original_text: str, language: str = "Hindi", source: str = "manual", google_keep_id: Optional[str] = None) -> models.Poem:
        poem = models.Poem(
            title=title,
            original_text=original_text,
            language=language,
            source=source,
            google_keep_id=google_keep_id
        )
        self.db.add(poem)
        self.db.commit()
        self.db.refresh(poem)
        return poem

    def update(self, poem_id: int, updates: dict) -> Optional[models.Poem]:
        poem = self.get_by_id(poem_id)
        if not poem:
            return None
        for key, value in updates.items():
            if hasattr(poem, key):
                setattr(poem, key, value)
        self.db.commit()
        self.db.refresh(poem)
        return poem

    def delete(self, poem_id: int) -> bool:
        poem = self.get_by_id(poem_id)
        if not poem:
            return False
        self.db.delete(poem)
        self.db.commit()
        return True

class VersionRepository(BaseRepository):
    def create_version(self, poem_id: int, content: str, created_by: str, agent_name: Optional[str] = None, diff_summary: Optional[str] = None) -> models.PoemVersion:
        # Get next version number
        last_version = self.db.query(models.PoemVersion)\
            .filter(models.PoemVersion.poem_id == poem_id)\
            .order_by(models.PoemVersion.version_number.desc())\
            .first()
        
        next_ver = 1 if not last_version else last_version.version_number + 1

        version = models.PoemVersion(
            poem_id=poem_id,
            version_number=next_ver,
            created_by=created_by,
            agent_name=agent_name,
            diff_summary=diff_summary,
            content=content
        )
        self.db.add(version)
        self.db.commit()
        self.db.refresh(version)
        return version

    def get_versions_by_poem(self, poem_id: int) -> List[models.PoemVersion]:
        return self.db.query(models.PoemVersion)\
            .filter(models.PoemVersion.poem_id == poem_id)\
            .order_by(models.PoemVersion.version_number.desc())\
            .all()

class TranslationRepository(BaseRepository):
    def save_translation(self, poem_id: int, language: str, content: str) -> models.Translation:
        existing = self.db.query(models.Translation)\
            .filter(models.Translation.poem_id == poem_id, models.Translation.language == language)\
            .first()
        
        if existing:
            existing.content = content
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            translation = models.Translation(poem_id=poem_id, language=language, content=content)
            self.db.add(translation)
            self.db.commit()
            self.db.refresh(translation)
            return translation

    def get_translations_by_poem(self, poem_id: int) -> List[models.Translation]:
        return self.db.query(models.Translation).filter(models.Translation.poem_id == poem_id).all()

class MeterRepository(BaseRepository):
    def save_analysis(self, poem_id: int, bahr_chhand: str, rhyming_consistency: str, suggestions: list, matras: list) -> models.MeterAnalysis:
        # Clear old analysis
        self.db.query(models.MeterAnalysis).filter(models.MeterAnalysis.poem_id == poem_id).delete()

        analysis = models.MeterAnalysis(
            poem_id=poem_id,
            bahr_chhand=bahr_chhand,
            rhyming_consistency=rhyming_consistency,
            suggestions_json=suggestions,
            matra_counts_json=matras
        )
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def get_analysis_by_poem(self, poem_id: int) -> Optional[models.MeterAnalysis]:
        return self.db.query(models.MeterAnalysis).filter(models.MeterAnalysis.poem_id == poem_id).first()

class ReviewRepository(BaseRepository):
    def save_review(self, poem_id: int, persona_name: str, rating: int, strengths: list, weaknesses: list, favorite_line: str, confusing_line: str, suggestion: str, final_emotion: str) -> models.AudienceReview:
        # Check if already exists for this persona
        existing = self.db.query(models.AudienceReview)\
            .filter(models.AudienceReview.poem_id == poem_id, models.AudienceReview.persona_name == persona_name)\
            .first()

        if existing:
            existing.rating = rating
            existing.strengths_json = strengths
            existing.weaknesses_json = weaknesses
            existing.favorite_line = favorite_line
            existing.confusing_line = confusing_line
            existing.suggestion = suggestion
            existing.final_emotion = final_emotion
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            review = models.AudienceReview(
                poem_id=poem_id,
                persona_name=persona_name,
                rating=rating,
                strengths_json=strengths,
                weaknesses_json=weaknesses,
                favorite_line=favorite_line,
                confusing_line=confusing_line,
                suggestion=suggestion,
                final_emotion=final_emotion
            )
            self.db.add(review)
            self.db.commit()
            self.db.refresh(review)
            return review

    def get_reviews_by_poem(self, poem_id: int) -> List[models.AudienceReview]:
        return self.db.query(models.AudienceReview).filter(models.AudienceReview.poem_id == poem_id).all()

class MediaRepository(BaseRepository):
    def save_media(self, poem_id: int, template_name: str, media_url: str, media_type: str = "image/png") -> models.GeneratedMedia:
        media = models.GeneratedMedia(
            poem_id=poem_id,
            template_name=template_name,
            media_url=media_url,
            media_type=media_type
        )
        self.db.add(media)
        self.db.commit()
        self.db.refresh(media)
        return media

    def get_media_by_poem(self, poem_id: int) -> List[models.GeneratedMedia]:
        return self.db.query(models.GeneratedMedia).filter(models.GeneratedMedia.poem_id == poem_id).all()

class PublishingRepository(BaseRepository):
    def schedule_post(self, poem_id: int, media_id: Optional[int], platforms: list, caption: Optional[str], scheduled_at) -> models.ScheduledPost:
        post = models.ScheduledPost(
            poem_id=poem_id,
            media_id=media_id,
            platforms_json=platforms,
            caption=caption,
            scheduled_at=scheduled_at,
            status="pending"
        )
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def get_scheduled_posts(self, status: Optional[str] = None) -> List[models.ScheduledPost]:
        query = self.db.query(models.ScheduledPost)
        if status:
            query = query.filter(models.ScheduledPost.status == status)
        return query.order_by(models.ScheduledPost.scheduled_at.asc()).all()

    def update_post_status(self, post_id: int, status: str, failure_reason: Optional[str] = None) -> Optional[models.ScheduledPost]:
        post = self.db.query(models.ScheduledPost).filter(models.ScheduledPost.id == post_id).first()
        if post:
            post.status = status
            if failure_reason:
                post.failure_reason = failure_reason
            self.db.commit()
            self.db.refresh(post)
        return post

class LogRepository(BaseRepository):
    def log_agent_call(self, poem_id: int, agent_name: str, input_data: dict, output_data: Optional[dict] = None, status: str = "success", error_message: Optional[str] = None) -> models.AgentLog:
        log = models.AgentLog(
            poem_id=poem_id,
            agent_name=agent_name,
            input_data_json=input_data,
            output_data_json=output_data,
            status=status,
            error_message=error_message
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def log_event(self, poem_id: Optional[int], event_name: str, payload: dict) -> models.Event:
        event = models.Event(
            poem_id=poem_id,
            event_name=event_name,
            payload_json=payload
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def get_events_by_poem(self, poem_id: int) -> List[models.Event]:
        return self.db.query(models.Event).filter(models.Event.poem_id == poem_id).order_by(models.Event.emitted_at.desc()).all()
