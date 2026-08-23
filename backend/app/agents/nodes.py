import os
import json
import logging
from typing import Dict, Any, List, Optional
from langchain_core.runnables import RunnableConfig
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageColor

from ..core.llm import get_llm_model
from ..core.events import emit_event
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
from .state import PoetryStudioState

logger = logging.getLogger("poetrystudio.nodes")

PROMPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../prompts"))

def load_prompt(filename: str) -> str:
    path = os.path.join(PROMPTS_DIR, filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    # Fallback default templates if file not found
    logger.warning(f"Prompt file not found at: {path}. Using fallback.")
    return ""

# Hindi Phonetic Matra Counting Algorithm
class HindiSyllabifier:
    @staticmethod
    def count_word_matras(word: str) -> int:
        laghu_vowels = set("अइउऋ")
        laghu_signs = set("िुृँ")
        guru_vowels = set("आईऊएऐओऔ")
        guru_signs = set("ाीूेैोौंः")
        
        def is_base_char(c):
            o = ord(c)
            # Devanagari consonants and extensions
            return (0x0905 <= o <= 0x0939) or (0x0958 <= o <= 0x095F) or (o == 0x0950)

        chars = []
        for c in word:
            if c in laghu_vowels:
                chars.append({'char': c, 'type': 'vowel', 'val': 1})
            elif c in guru_vowels:
                chars.append({'char': c, 'type': 'vowel', 'val': 2})
            elif is_base_char(c):
                chars.append({'char': c, 'type': 'consonant', 'val': 1})
            elif c in laghu_signs:
                chars.append({'char': c, 'type': 'short_sign', 'val': 0})
            elif c in guru_signs:
                chars.append({'char': c, 'type': 'long_sign', 'val': 0})
            elif c == '्':
                chars.append({'char': c, 'type': 'halant', 'val': 0})
            else:
                pass
                
        base_indices = []
        for i, ch in enumerate(chars):
            if ch['type'] in ('vowel', 'consonant'):
                base_indices.append(i)

        for i, ch in enumerate(chars):
            if ch['type'] == 'long_sign':
                prec_bases = [idx for idx in base_indices if idx < i]
                if prec_bases:
                    chars[prec_bases[-1]]['val'] = 2
            elif ch['type'] == 'halant':
                prec_bases = [idx for idx in base_indices if idx < i]
                if prec_bases:
                    target_consonant_idx = prec_bases[-1]
                    chars[target_consonant_idx]['val'] = 0
                    
                    prev_bases = [idx for idx in base_indices if idx < target_consonant_idx]
                    if prev_bases:
                        prev_idx = prev_bases[-1]
                        if chars[prev_idx]['val'] == 1:
                            chars[prev_idx]['val'] = 2

        total = sum(ch['val'] for ch in chars if ch['type'] in ('vowel', 'consonant'))
        return total

    @classmethod
    def analyze_line(cls, line: str) -> int:
        words = line.strip().split()
        return sum(cls.count_word_matras(w) for w in words)

# ----------------- LangGraph Nodes -----------------

def fetch_node(state: PoetryStudioState, config: RunnableConfig = None) -> Dict[str, Any]:
    """Imports and cleans raw poetry formatting."""
    db = config["configurable"]["db"]
    log_repo = LogRepository(db)
    
    original_text = state["original_text"]
    title = state.get("title", "Untitled") or "Untitled"
    
    # Text normalization: remove duplicate whitespace/blank lines
    cleaned_lines = []
    for line in original_text.splitlines():
        cleaned_line = " ".join(line.strip().split())
        if cleaned_line:
            cleaned_lines.append(cleaned_line)
    cleaned_text = "\n".join(cleaned_lines)
    
    # Save/Update poem in Database
    poem_repo = PoemRepository(db)
    ver_repo = VersionRepository(db)
    
    poem_id = state.get("poem_id")
    if not poem_id:
        # Create new poem
        poem = poem_repo.create(
            title=title,
            original_text=cleaned_text,
            language=state.get("language", "Hindi"),
            source=state.get("source", "manual"),
            google_keep_id=state.get("google_keep_id")
        )
        poem_id = poem.id
        # Version 1 creation
        ver_repo.create_version(poem_id, cleaned_text, "user", "FetchAgent", "Initial import and formatting cleanup")
    else:
        # Update existing
        poem = poem_repo.update(poem_id, {"original_text": cleaned_text, "title": title})
    
    log_repo.log_agent_call(poem_id, "FetchAgent", {"original_text": original_text}, {"cleaned_text": cleaned_text})
    emit_event(db, "poem.imported", poem_id, {"title": title})

    return {
        "poem_id": poem_id,
        "title": title,
        "original_text": cleaned_text,
        "logs": state.get("logs", []) + [f"FetchAgent cleaned and imported: {title}"]
    }

def translation_node(state: PoetryStudioState, config: RunnableConfig = None) -> Dict[str, Any]:
    """Generates Hinglish and English versions."""
    db = config["configurable"]["db"]
    poem_id = state["poem_id"]
    original_text = state["original_text"]
    
    trans_repo = TranslationRepository(db)
    log_repo = LogRepository(db)
    llm = get_llm_model()

    translations = {}
    # Translate to English and Hinglish
    for lang in ["English", "Hinglish"]:
        prompt_template = load_prompt("translation.txt")
        if not prompt_template:
            # Fallback
            prompt_template = "Translate this poem to {target_language}:\n{original_text}"
        
        prompt = prompt_template.format(target_language=lang, original_text=original_text)
        
        response = llm.invoke(prompt)
        translated_text = response.content.strip()
        
        # Save to database
        trans_repo.save_translation(poem_id, lang, translated_text)
        translations[lang] = translated_text
        
        log_repo.log_agent_call(poem_id, "TranslationAgent", {"target_language": lang}, {"translation": translated_text})

    emit_event(db, "translation.completed", poem_id, {"languages": list(translations.keys())})
    return {
        "translations": translations,
        "logs": state.get("logs", []) + [f"TranslationAgent translated to {list(translations.keys())}"]
    }

def meter_node(state: PoetryStudioState, config: RunnableConfig = None) -> Dict[str, Any]:
    """Analyzes meter counts and requests suggestions for line mismatches."""
    db = config["configurable"]["db"]
    poem_id = state["poem_id"]
    original_text = state["original_text"]
    
    meter_repo = MeterRepository(db)
    log_repo = LogRepository(db)
    llm = get_llm_model()
    
    # 1. Compute exact matra counts using syllabifier
    lines = [line.strip() for line in original_text.splitlines() if line.strip()]
    matra_analysis = []
    
    for idx, line in enumerate(lines):
        count = HindiSyllabifier.analyze_line(line)
        matra_analysis.append({"line_number": idx + 1, "line_text": line, "matra_count": count})
    
    # 2. Check for rhythm consistency
    # Assuming first line is the baseline target matra count
    target_matra = matra_analysis[0]["matra_count"] if matra_analysis else 24
    suggestions = []
    
    for entry in matra_analysis:
        curr_count = entry["matra_count"]
        # Allow +/- 1 discrepancy, otherwise flag
        if abs(curr_count - target_matra) > 1:
            # Call LLM for word substitution
            prompt_template = load_prompt("meter.txt")
            if not prompt_template:
                prompt_template = "Fix meter for: {line_text}. Target {target_matra} matras."
            
            prompt = prompt_template.format(
                original_text=original_text,
                line_number=entry["line_number"],
                line_text=entry["line_text"],
                current_matra=curr_count,
                target_matra=target_matra
            )
            
            try:
                response = llm.invoke(prompt)
                suggestion_data = json.loads(response.content.strip())
                suggestions.append({
                    "line_number": entry["line_number"],
                    "line_text": entry["line_text"],
                    "current_matra": curr_count,
                    "target_matra": target_matra,
                    "reason": suggestion_data.get("reason"),
                    "recommendations": suggestion_data.get("suggestions", [])
                })
            except Exception as e:
                logger.error(f"Meter LLM parsing error: {e}")
                suggestions.append({
                    "line_number": entry["line_number"],
                    "line_text": entry["line_text"],
                    "current_matra": curr_count,
                    "target_matra": target_matra,
                    "reason": "Failed to parse suggestions",
                    "recommendations": []
                })

    bahr_chhand = f"Baseline Matra: {target_matra}"
    rhyming_consistency = "Consistent" if len(suggestions) == 0 else "Inconsistent"

    # Save to database
    meter_repo.save_analysis(
        poem_id=poem_id,
        bahr_chhand=bahr_chhand,
        rhyming_consistency=rhyming_consistency,
        suggestions=suggestions,
        matras=matra_analysis
    )
    
    log_repo.log_agent_call(poem_id, "MeterAgent", {"matras": matra_analysis}, {"suggestions": suggestions})
    emit_event(db, "meter.completed", poem_id, {"target_matra": target_matra, "mismatches": len(suggestions)})

    return {
        "meter_analysis": {
            "bahr_chhand": bahr_chhand,
            "rhyming_consistency": rhyming_consistency,
            "suggestions": suggestions,
            "matras": matra_analysis
        },
        "logs": state.get("logs", []) + [f"MeterAgent completed matra counts (Target: {target_matra})"]
    }

# Parallel Audience Nodes
def audience_romantic_node(state: PoetryStudioState, config: RunnableConfig = None) -> Dict[str, Any]:
    db = config["configurable"]["db"]
    poem_id = state["poem_id"]
    original_text = state["original_text"]
    
    llm = get_llm_model()
    log_repo = LogRepository(db)
    review_repo = ReviewRepository(db)
    
    prompt = load_prompt("audience_romantic.txt").format(original_text=original_text)
    
    review_data = {"rating": 5, "strengths": [], "weaknesses": [], "favorite_line": "", "confusing_line": "", "suggestion": "", "final_emotion": ""}
    try:
        res = llm.invoke(prompt)
        review_data = json.loads(res.content.strip())
    except Exception as e:
        logger.error(f"Romantic reviewer parsing error: {e}")
        
    review_repo.save_review(
        poem_id=poem_id,
        persona_name="Romantic Lover",
        rating=review_data["rating"],
        strengths=review_data["strengths"],
        weaknesses=review_data["weaknesses"],
        favorite_line=review_data["favorite_line"],
        confusing_line=review_data.get("confusing_line"),
        suggestion=review_data["suggestion"],
        final_emotion=review_data["final_emotion"]
    )
    
    log_repo.log_agent_call(poem_id, "AudienceAgent_Romantic", {}, review_data)
    review_data["persona_name"] = "Romantic Lover"
    return {"reviews": [review_data]}

def audience_critic_node(state: PoetryStudioState, config: RunnableConfig = None) -> Dict[str, Any]:
    db = config["configurable"]["db"]
    poem_id = state["poem_id"]
    original_text = state["original_text"]
    
    llm = get_llm_model()
    log_repo = LogRepository(db)
    review_repo = ReviewRepository(db)
    
    prompt = load_prompt("audience_critic.txt").format(original_text=original_text)
    
    review_data = {"rating": 5, "strengths": [], "weaknesses": [], "favorite_line": "", "confusing_line": "", "suggestion": "", "final_emotion": ""}
    try:
        res = llm.invoke(prompt)
        review_data = json.loads(res.content.strip())
    except Exception as e:
        logger.error(f"Critic reviewer parsing error: {e}")
        
    review_repo.save_review(
        poem_id=poem_id,
        persona_name="Literary Critic",
        rating=review_data["rating"],
        strengths=review_data["strengths"],
        weaknesses=review_data["weaknesses"],
        favorite_line=review_data["favorite_line"],
        confusing_line=review_data.get("confusing_line"),
        suggestion=review_data["suggestion"],
        final_emotion=review_data["final_emotion"]
    )
    
    log_repo.log_agent_call(poem_id, "AudienceAgent_Critic", {}, review_data)
    review_data["persona_name"] = "Literary Critic"
    return {"reviews": [review_data]}

def audience_instagrammer_node(state: PoetryStudioState, config: RunnableConfig = None) -> Dict[str, Any]:
    db = config["configurable"]["db"]
    poem_id = state["poem_id"]
    original_text = state["original_text"]
    
    llm = get_llm_model()
    log_repo = LogRepository(db)
    review_repo = ReviewRepository(db)
    
    prompt = load_prompt("audience_instagram.txt").format(original_text=original_text)
    
    review_data = {"rating": 5, "strengths": [], "weaknesses": [], "favorite_line": "", "confusing_line": "", "suggestion": "", "final_emotion": ""}
    try:
        res = llm.invoke(prompt)
        review_data = json.loads(res.content.strip())
    except Exception as e:
        logger.error(f"Instagrammer reviewer parsing error: {e}")
        
    review_repo.save_review(
        poem_id=poem_id,
        persona_name="Instagram Reader",
        rating=review_data["rating"],
        strengths=review_data["strengths"],
        weaknesses=review_data["weaknesses"],
        favorite_line=review_data["favorite_line"],
        confusing_line=review_data.get("confusing_line"),
        suggestion=review_data["suggestion"],
        final_emotion=review_data["final_emotion"]
    )
    
    log_repo.log_agent_call(poem_id, "AudienceAgent_Instagram", {}, review_data)
    review_data["persona_name"] = "Instagram Reader"
    return {"reviews": [review_data]}

def aggregator_node(state: PoetryStudioState, config: RunnableConfig = None) -> Dict[str, Any]:
    """Combines all persona reviews into a single consolidated summary review."""
    db = config["configurable"]["db"]
    poem_id = state["poem_id"]
    reviews = state["reviews"]
    
    review_repo = ReviewRepository(db)
    log_repo = LogRepository(db)
    
    ratings = [r["rating"] for r in reviews]
    avg_rating = int(round(sum(ratings) / len(ratings))) if ratings else 0
    
    strengths = []
    weaknesses = []
    suggestions = []
    emotions = []
    
    for r in reviews:
        strengths.extend(r.get("strengths", []))
        weaknesses.extend(r.get("weaknesses", []))
        suggestions.append(f"{r['persona_name']}: {r.get('suggestion')}")
        emotions.append(r.get("final_emotion"))

    # De-duplicate
    strengths = list(set(strengths))[:5]
    weaknesses = list(set(weaknesses))[:5]
    final_suggestion = " | ".join(suggestions)
    consensus_emotion = emotions[0] if emotions else "Mixed"

    aggregated_review = review_repo.save_review(
        poem_id=poem_id,
        persona_name="Aggregator",
        rating=avg_rating,
        strengths=strengths,
        weaknesses=weaknesses,
        favorite_line=reviews[0].get("favorite_line") if reviews else "",
        confusing_line=reviews[0].get("confusing_line") if reviews else None,
        suggestion=final_suggestion,
        final_emotion=consensus_emotion
    )

    log_repo.log_agent_call(poem_id, "ReviewAggregator", {"reviews_count": len(reviews)}, {"average_rating": avg_rating})
    emit_event(db, "audience.reviewed", poem_id, {"avg_rating": avg_rating})

    return {
        "aggregate_review": {
            "rating": avg_rating,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestion": final_suggestion,
            "final_emotion": consensus_emotion
        },
        "logs": state.get("logs", []) + [f"ReviewAggregator combined {len(reviews)} reviews. Average: {avg_rating}/10"]
    }

def design_node(state: PoetryStudioState, config: RunnableConfig = None) -> Dict[str, Any]:
    """Generates visual graphic cards using Pillow."""
    db = config["configurable"]["db"]
    poem_id = state["poem_id"]
    title = state["title"]
    original_text = state["original_text"]
    
    media_repo = MediaRepository(db)
    log_repo = LogRepository(db)
    
    # Create static directory if missing
    media_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../static/media"))
    os.makedirs(media_dir, exist_ok=True)
    
    # Pick a few lines to draw (first 4 lines)
    poem_lines = [line.strip() for line in original_text.splitlines() if line.strip()][:4]
    
    templates = {
        "Dark": {"bg": (20, 15, 35), "text": (245, 230, 255), "accent": (212, 175, 55)},
        "Vintage": {"bg": (240, 230, 210), "text": (65, 45, 30), "accent": (139, 90, 43)},
        "Minimal": {"bg": (250, 250, 250), "text": (20, 20, 20), "accent": (120, 120, 120)},
        "Paper": {"bg": (224, 224, 220), "text": (40, 40, 50), "accent": (90, 110, 130)}
    }
    
    image_paths = []
    
    for name, colors in templates.items():
        # 1080x1080 social media canvas
        img = Image.new("RGB", (1080, 1080), color=colors["bg"])
        draw = ImageDraw.Draw(img)
        
        # Draw a double line decorative border
        draw.rectangle([50, 50, 1030, 1030], outline=colors["accent"], width=3)
        draw.rectangle([60, 60, 1020, 1020], outline=colors["accent"], width=1)
        
        # Load a default font
        try:
            # Try loading a system serif font
            font_title = ImageFont.truetype("georgia.ttf", 60)
            font_body = ImageFont.truetype("georgia.ttf", 40)
            font_footer = ImageFont.truetype("georgia.ttf", 28)
        except IOError:
            font_title = ImageFont.load_default()
            font_body = ImageFont.load_default()
            font_footer = ImageFont.load_default()
            
        # Draw Title
        draw.text((540, 200), title, fill=colors["text"], font=font_title, anchor="mm")
        
        # Draw Separator Line
        draw.line([480, 260, 600, 260], fill=colors["accent"], width=2)
        
        # Draw Poem Body Lines
        y_cursor = 400
        for line in poem_lines:
            draw.text((540, y_cursor), line, fill=colors["text"], font=font_body, anchor="mm")
            y_cursor += 80
            
        # Draw Footer
        draw.text((540, 920), "~ Poetry Studio MVP ~", fill=colors["accent"], font=font_footer, anchor="mm")
        
        filename = f"poem_{poem_id}_{name.lower()}.png"
        filepath = os.path.join(media_dir, filename)
        img.save(filepath)
        
        # Save in database
        media_repo.save_media(poem_id, name, f"/static/media/{filename}")
        image_paths.append(f"/static/media/{filename}")
        
    log_repo.log_agent_call(poem_id, "DesignAgent", {"templates": list(templates.keys())}, {"image_paths": image_paths})
    emit_event(db, "design.completed", poem_id, {"images_generated": len(image_paths)})
    
    return {
        "image_paths": image_paths,
        "logs": state.get("logs", []) + [f"DesignAgent generated {len(image_paths)} visual cards"]
    }

def publish_node(state: PoetryStudioState, config: RunnableConfig = None) -> Dict[str, Any]:
    """Prepares posts in scheduled pipeline for user approval."""
    db = config["configurable"]["db"]
    poem_id = state["poem_id"]
    image_paths = state.get("image_paths", [])
    
    pub_repo = PublishingRepository(db)
    log_repo = LogRepository(db)
    media_repo = MediaRepository(db)
    
    # Retrieve generated media database ID if available
    media_list = media_repo.get_media_by_poem(poem_id)
    media_id = media_list[0].id if media_list else None
    
    # Schedule posts for platforms
    scheduled_at = datetime.utcnow()
    platforms = ["Instagram", "LinkedIn", "Threads"]
    
    post = pub_repo.schedule_post(
        poem_id=poem_id,
        media_id=media_id,
        platforms=platforms,
        caption=f"New poetry: {state['title']}. Crafted with #PoetryStudio",
        scheduled_at=scheduled_at
    )
    
    log_repo.log_agent_call(
        poem_id,
        "PublishingAgent",
        {"platforms": platforms, "media_id": media_id},
        {"scheduled_post_id": post.id, "status": post.status}
    )
    emit_event(db, "publish.scheduled", poem_id, {"post_id": post.id, "platforms": platforms})
    
    return {
        "publish_status": {
            "post_id": post.id,
            "status": "pending",
            "platforms": platforms,
            "scheduled_at": scheduled_at.isoformat()
        },
        "logs": state.get("logs", []) + [f"PublishingAgent staged posts for: {platforms}"]
    }
