import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger("poetrystudio.fetch_agent")

MOCK_POEMS = [
    {
        "google_keep_id": "keep_poem_1",
        "title": "रात और चाँद",
        "text": "चाँदनी रात में बहती हुई ठंडी हवा,\nमुस्कुराहट तेरी सब कुछ बदल देती है।\nख़ामोश खड़े हैं रास्ते और पेड़ यहाँ,\nदिल की धड़कन आज कुछ नया कहती है।",
        "language": "Hindi",
        "metadata": {"tags": "Romantic,Nature", "category": "Ghazal"}
    },
    {
        "google_keep_id": "keep_poem_2",
        "title": "हम देखेंगे",
        "text": "हम देखेंगे, लाज़िम है कि हम भी देखेंगे,\nवो दिन कि जिसका वादा है,\nजो लोह-ए-अज़ल में लिक्खा है।\nजब ज़ुल्म-ओ-सितम के कोह-ए-गिराँ,\nरूई की तरह उड़ जाएँगे।",
        "language": "Urdu",
        "metadata": {"tags": "Revolutionary,Hope", "category": "Nazm"}
    },
    {
        "google_keep_id": "keep_poem_3",
        "title": "पीर पर्वत सी",
        "text": "हो गई है पीर पर्वत सी पिघलनी चाहिए,\nइस हिमालय से कोई गंगा निकलनी चाहिए।\nआज यह दीवार परदों की तरह हिलने लगी,\nशर्त लेकिन थी कि ये बुनियाद हिलनी चाहिए।",
        "language": "Hindi",
        "metadata": {"tags": "Inspirational,Social", "category": "Dushyant"}
    }
]

def fetch_notes_from_keep() -> List[Dict[str, Any]]:
    """
    Fetches notes from Google Keep.
    If USE_MOCK_KEEP=true, returns beautiful mock devanagari poetry data.
    """
    use_mock = os.getenv("USE_MOCK_KEEP", "true").lower() == "true"
    email = os.getenv("GOOGLE_KEEP_EMAIL")
    password = os.getenv("GOOGLE_KEEP_PASSWORD")

    if use_mock or not email or not password:
        logger.info("Using simulated Google Keep fetcher (Mock poems loaded)")
        return MOCK_POEMS

    # Actual gkeepapi fetcher
    try:
        import gkeepapi
        keep = gkeepapi.Keep()
        logger.info(f"Authenticating Keep for {email}...")
        keep.login(email, password)
        
        notes = []
        # Find notes tagged with 'poetry' or 'poem'
        for note in keep.all():
            text = note.text or ""
            # Simple heuristic to identify poetry: multiple short lines
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            
            # If the user tagged the note as poetry or it contains the word "poetry"
            is_poetry_note = False
            for label in note.labels:
                if "poetry" in label.name.lower() or "poem" in label.name.lower():
                    is_poetry_note = True
                    break
                    
            if is_poetry_note or len(lines) > 2:
                notes.append({
                    "google_keep_id": note.id,
                    "title": note.title or (lines[0] if lines else "Untitled Note"),
                    "text": text,
                    "language": "Hindi",  # Default language detection fallback
                    "metadata": {"tags": ",".join([l.name for l in note.labels])}
                })
        return notes
    except Exception as e:
        logger.error(f"Google Keep authentication/fetching failed: {e}. Falling back to mocks.")
        return MOCK_POEMS
