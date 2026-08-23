from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import os

from ..core.database import engine, Base, get_db
from ..models import models
from ..schemas import schemas
from ..services.poem_service import PoemService
from ..repositories.repository import PublishingRepository, ReviewRepository, MeterRepository

# Create Database tables automatically on startup (SQLite zero-config)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Poetry Studio API",
    description="AI-first writing assistant for poets (Hindi, Hinglish, Urdu)",
    version="1.0.0"
)

# Configure CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static generated media files
media_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/media"))
os.makedirs(media_dir, exist_ok=True)
app.mount("/static/media", StaticFiles(directory=media_dir), name="media")

# Helper to check API status
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Poetry Studio Backend"}

# Poem Endpoints
@app.post("/poems/import", response_model=List[schemas.PoemResponse])
def import_poems(db: Session = Depends(get_db)):
    """Triggers FetchAgent to import and analyze notes from Google Keep."""
    service = PoemService(db)
    return service.import_poetry_from_keep()

@app.get("/poems", response_model=List[schemas.PoemResponse])
def get_poems(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    service = PoemService(db)
    return service.get_poems_list(skip, limit)

@app.get("/poems/{poem_id}")
def get_poem(poem_id: int, db: Session = Depends(get_db)):
    service = PoemService(db)
    details = service.get_poem_details(poem_id)
    if not details:
        raise HTTPException(status_code=404, detail="Poem not found")
    return details

@app.put("/poems/{poem_id}", response_model=schemas.PoemResponse)
def update_poem(poem_id: int, poem_in: schemas.PoemUpdate, db: Session = Depends(get_db)):
    service = PoemService(db)
    poem = service.update_poem_content(
        poem_id=poem_id,
        new_text=poem_in.original_text,
        title=poem_in.title,
        author="user"
    )
    if not poem:
        raise HTTPException(status_code=404, detail="Poem not found")
    return poem

@app.post("/poems/{poem_id}/reanalyze")
def reanalyze_poem(poem_id: int, db: Session = Depends(get_db)):
    """Triggers the LangGraph pipeline to re-run AI translations, meter, and reviews."""
    service = PoemService(db)
    details = service.trigger_reanalysis(poem_id)
    if not details:
        raise HTTPException(status_code=404, detail="Poem not found or re-analysis failed")
    return details

# Improvement Agent Endpoints
@app.get("/poems/{poem_id}/improvements")
def get_improvements(poem_id: int, db: Session = Depends(get_db)):
    """Calls the editor agent to generate voice-preserving line improvements."""
    service = PoemService(db)
    return service.get_editor_improvements(poem_id)

@app.post("/poems/{poem_id}/apply-improvement", response_model=schemas.PoemResponse)
def apply_improvement(poem_id: int, payload: Dict[str, str], db: Session = Depends(get_db)):
    """Applies a specific editor word/phrase replacement and creates a new poem version."""
    original_line = payload.get("original_line")
    suggested_line = payload.get("suggested_line")
    if not original_line or not suggested_line:
        raise HTTPException(status_code=400, detail="Missing original_line or suggested_line")
        
    service = PoemService(db)
    poem = service.apply_editor_suggestion(poem_id, original_line, suggested_line)
    if not poem:
        raise HTTPException(status_code=404, detail="Poem not found or suggestion line mismatch")
    return poem

# Trigger Analysis Pipelines Individually (wrappers for endpoints)
@app.post("/translation/{poem_id}")
def run_translation(poem_id: int, db: Session = Depends(get_db)):
    service = PoemService(db)
    return service.trigger_reanalysis(poem_id)

@app.post("/meter/analyze/{poem_id}")
def run_meter(poem_id: int, db: Session = Depends(get_db)):
    service = PoemService(db)
    return service.trigger_reanalysis(poem_id)

@app.post("/review/{poem_id}")
def run_review(poem_id: int, db: Session = Depends(get_db)):
    service = PoemService(db)
    return service.trigger_reanalysis(poem_id)

@app.post("/design/{poem_id}")
def run_design(poem_id: int, db: Session = Depends(get_db)):
    service = PoemService(db)
    return service.trigger_reanalysis(poem_id)

# Publishing Endpoints
@app.get("/publish/queue", response_model=List[schemas.ScheduledPostResponse])
def get_publish_queue(status: Optional[str] = None, db: Session = Depends(get_db)):
    pub_repo = PublishingRepository(db)
    return pub_repo.get_scheduled_posts(status)

@app.post("/publish/{post_id}/approve", response_model=schemas.ScheduledPostResponse)
def approve_publish(post_id: int, db: Session = Depends(get_db)):
    """Approves a scheduled post, simulating publication API calls and logging results."""
    pub_repo = PublishingRepository(db)
    post = pub_repo.update_post_status(post_id, "posted")
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
        
    # Simulate API published log record
    published_record = models.PublishedPost(
        scheduled_post_id=post.id,
        platform=post.platforms_json[0] if post.platforms_json else "Instagram",
        post_id=f"sim_post_{post.id}",
        post_url="https://instagram.com/p/simulated_post_id",
        api_response_json={"status": "success", "response_code": 200, "message": "Successfully published"}
    )
    db.add(published_record)
    db.commit()
    
    from ..core.events import emit_event
    emit_event(db, "publish.completed", post.poem_id, {"post_id": post.id})
    return post

# Aggregate Views
@app.get("/analysis", response_model=List[schemas.MeterAnalysisResponse])
def get_meter_analyses(db: Session = Depends(get_db)):
    return db.query(models.MeterAnalysis).all()

@app.get("/reviews", response_model=List[schemas.AudienceReviewResponse])
def get_all_reviews(db: Session = Depends(get_db)):
    return db.query(models.AudienceReview).all()
