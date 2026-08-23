from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Poem Version Schemas
class PoemVersionResponse(BaseModel):
    id: int
    poem_id: int
    version_number: int
    created_by: str
    agent_name: Optional[str] = None
    diff_summary: Optional[str] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

# Translation Schemas
class TranslationResponse(BaseModel):
    id: int
    poem_id: int
    language: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Meter Analysis Schemas
class MeterAnalysisResponse(BaseModel):
    id: int
    poem_id: int
    bahr_chhand: Optional[str] = None
    rhyming_consistency: Optional[str] = None
    suggestions_json: Optional[List[Dict[str, Any]]] = None
    matra_counts_json: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Audience Review Schemas
class AudienceReviewResponse(BaseModel):
    id: int
    poem_id: int
    persona_name: str
    rating: int
    strengths_json: Optional[List[str]] = None
    weaknesses_json: Optional[List[str]] = None
    favorite_line: Optional[str] = None
    confusing_line: Optional[str] = None
    suggestion: Optional[str] = None
    final_emotion: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Media Schemas
class GeneratedMediaResponse(BaseModel):
    id: int
    poem_id: int
    template_name: str
    media_url: str
    media_type: str
    created_at: datetime

    class Config:
        from_attributes = True

# Post Scheduling Schemas
class ScheduledPostCreate(BaseModel):
    platforms_json: List[str]
    scheduled_at: datetime
    caption: Optional[str] = None
    media_id: Optional[int] = None

class ScheduledPostResponse(BaseModel):
    id: int
    poem_id: int
    media_id: Optional[int] = None
    platforms_json: List[str]
    caption: Optional[str] = None
    scheduled_at: datetime
    status: str
    failure_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Poem Schemas
class PoemBase(BaseModel):
    title: Optional[str] = "Untitled"
    original_text: str
    language: Optional[str] = "Hindi"
    status: Optional[str] = "draft"
    source: Optional[str] = "manual"
    tags: Optional[str] = None
    category: Optional[str] = None
    visibility: Optional[str] = "private"

class PoemCreate(PoemBase):
    pass

class PoemUpdate(BaseModel):
    title: Optional[str] = None
    original_text: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[str] = None
    category: Optional[str] = None
    visibility: Optional[str] = None

class PoemResponse(PoemBase):
    id: int
    google_keep_id: Optional[str] = None
    is_draft: bool
    is_published: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Audit & Log Schemas
class AgentLogResponse(BaseModel):
    id: int
    poem_id: int
    agent_name: str
    input_data_json: Optional[Dict[str, Any]] = None
    output_data_json: Optional[Dict[str, Any]] = None
    status: str
    error_message: Optional[str] = None
    executed_at: datetime

    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: int
    poem_id: Optional[int] = None
    event_name: str
    payload_json: Optional[Dict[str, Any]] = None
    emitted_at: datetime

    class Config:
        from_attributes = True
