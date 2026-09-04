from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from ..core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Poem(Base):
    __tablename__ = "poems"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    original_text = Column(Text, nullable=False)
    language = Column(String, default="Hindi")  # Hindi, Urdu, Hinglish, English
    status = Column(String, default="draft")  # draft, published, archived
    source = Column(String, default="manual")  # manual, google_keep
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Metadata fields
    google_keep_id = Column(String, nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated tags
    category = Column(String, nullable=True)
    visibility = Column(String, default="private")  # private, public
    is_draft = Column(Boolean, default=True)
    is_published = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)

    # Relationships
    versions = relationship("PoemVersion", back_populates="poem", cascade="all, delete-orphan")
    translations = relationship("Translation", back_populates="poem", cascade="all, delete-orphan")
    meter_analyses = relationship("MeterAnalysis", back_populates="poem", cascade="all, delete-orphan")
    audience_reviews = relationship("AudienceReview", back_populates="poem", cascade="all, delete-orphan")
    generated_media = relationship("GeneratedMedia", back_populates="poem", cascade="all, delete-orphan")
    scheduled_posts = relationship("ScheduledPost", back_populates="poem", cascade="all, delete-orphan")
    agent_logs = relationship("AgentLog", back_populates="poem", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="poem", cascade="all, delete-orphan")

class PoemVersion(Base):
    __tablename__ = "poem_versions"

    id = Column(Integer, primary_key=True, index=True)
    poem_id = Column(Integer, ForeignKey("poems.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    created_by = Column(String, default="user")  # user or agent name
    agent_name = Column(String, nullable=True)
    diff_summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    poem = relationship("Poem", back_populates="versions")

class Translation(Base):
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, index=True)
    poem_id = Column(Integer, ForeignKey("poems.id", ondelete="CASCADE"), nullable=False)
    language = Column(String, nullable=False)  # Hindi, Hinglish, English
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    poem = relationship("Poem", back_populates="translations")

class MeterAnalysis(Base):
    __tablename__ = "meter_analysis"

    id = Column(Integer, primary_key=True, index=True)
    poem_id = Column(Integer, ForeignKey("poems.id", ondelete="CASCADE"), nullable=False)
    bahr_chhand = Column(String, nullable=True)
    rhyming_consistency = Column(String, nullable=True)
    suggestions_json = Column(JSON, nullable=True)  # List of weak lines and suggestions
    matra_counts_json = Column(JSON, nullable=True)  # Matra counts per line
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    poem = relationship("Poem", back_populates="meter_analyses")

class AudienceReview(Base):
    __tablename__ = "audience_reviews"

    id = Column(Integer, primary_key=True, index=True)
    poem_id = Column(Integer, ForeignKey("poems.id", ondelete="CASCADE"), nullable=False)
    persona_name = Column(String, nullable=False)  # Romantic, Critic, Instagrammer, Aggregated
    rating = Column(Integer, nullable=False)
    appeal_score = Column(Integer, nullable=True)
    engagement_score = Column(Integer, nullable=True)
    strengths_json = Column(JSON, nullable=True)
    weaknesses_json = Column(JSON, nullable=True)
    favorite_line = Column(Text, nullable=True)
    confusing_line = Column(Text, nullable=True)
    suggestion = Column(Text, nullable=True)
    actionable_enhancements_json = Column(JSON, nullable=True)
    final_emotion = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    poem = relationship("Poem", back_populates="audience_reviews")

class DesignTemplate(Base):
    __tablename__ = "design_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)  # Minimal, Vintage, Dark, Paper, Elegant
    description = Column(String, nullable=True)
    font_family = Column(String, default="serif")
    background_color = Column(String, nullable=True)
    text_color = Column(String, nullable=True)
    layout_json = Column(JSON, nullable=True)

class GeneratedMedia(Base):
    __tablename__ = "generated_media"

    id = Column(Integer, primary_key=True, index=True)
    poem_id = Column(Integer, ForeignKey("poems.id", ondelete="CASCADE"), nullable=False)
    template_name = Column(String, nullable=False)  # Minimal, Vintage, Dark, etc.
    media_url = Column(String, nullable=False)  # Local file path
    media_type = Column(String, default="image/png")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    poem = relationship("Poem", back_populates="generated_media")

class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String, nullable=False)  # Instagram, Threads, LinkedIn, Facebook
    username = Column(String, nullable=False)
    credentials_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ScheduledPost(Base):
    __tablename__ = "scheduled_posts"

    id = Column(Integer, primary_key=True, index=True)
    poem_id = Column(Integer, ForeignKey("poems.id", ondelete="CASCADE"), nullable=False)
    media_id = Column(Integer, ForeignKey("generated_media.id", ondelete="SET NULL"), nullable=True)
    platforms_json = Column(JSON, nullable=False)  # List of target platforms
    caption = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="pending")  # pending, scheduled, posted, failed
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    poem = relationship("Poem", back_populates="scheduled_posts")
    media = relationship("GeneratedMedia")

class PublishedPost(Base):
    __tablename__ = "published_posts"

    id = Column(Integer, primary_key=True, index=True)
    scheduled_post_id = Column(Integer, ForeignKey("scheduled_posts.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String, nullable=False)
    post_id = Column(String, nullable=True)
    post_url = Column(String, nullable=True)
    published_at = Column(DateTime(timezone=True), server_default=func.now())
    api_response_json = Column(JSON, nullable=True)

class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True, index=True)
    poem_id = Column(Integer, ForeignKey("poems.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String, nullable=False)
    input_data_json = Column(JSON, nullable=True)
    output_data_json = Column(JSON, nullable=True)
    status = Column(String, default="success")  # success, failed
    error_message = Column(Text, nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    poem = relationship("Poem", back_populates="agent_logs")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    poem_id = Column(Integer, ForeignKey("poems.id", ondelete="CASCADE"), nullable=True)
    event_name = Column(String, nullable=False)  # e.g., poem.imported, translation.completed
    payload_json = Column(JSON, nullable=True)
    emitted_at = Column(DateTime(timezone=True), server_default=func.now())

    poem = relationship("Poem", back_populates="events")
