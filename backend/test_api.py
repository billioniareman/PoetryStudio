import os
# Delete SQLite database before importing the app to ensure a clean state
if os.path.exists("poetrystudio.db"):
    try:
        os.remove("poetrystudio.db")
    except Exception:
        pass

from fastapi.testclient import TestClient
import pytest
from app.api.api import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

from unittest.mock import patch
import time

def test_poems_endpoints():
    unique_id = f"test_poem_{int(time.time() * 1000)}"
    test_notes = [
        {
            "google_keep_id": unique_id,
            "title": "रात और चाँद",
            "text": "चाँदनी रात में बहती हुई ठंडी हवा,\nमुस्कुराहट तेरी सब कुछ बदल देती है।\nख़ामोश खड़े हैं रास्ते और पेड़ यहाँ,\nदिल की धड़कन आज कुछ नया कहती है।",
            "language": "Hindi",
            "metadata": {"tags": "Romantic,Nature", "category": "Ghazal"}
        }
    ]
    with patch("app.services.poem_service.fetch_notes_from_keep", return_value=test_notes):
        # 1. Test GET /poems
        response = client.get("/poems")
        assert response.status_code == 200
        initial_count = len(response.json())

        # 2. Test POST /poems/import (triggers simulated keep notes)
        import_response = client.post("/poems/import")
        assert import_response.status_code == 200
        imported_poems = import_response.json()
        assert len(imported_poems) > 0

        # 3. Verify count updated
        list_response = client.get("/poems")
        assert len(list_response.json()) > initial_count

        # 4. Test GET /poems/{id}
        poem_id = imported_poems[0]["id"]
    detail_response = client.get(f"/poems/{poem_id}")
    assert detail_response.status_code == 200
    data = detail_response.json()
    assert "poem" in data
    assert "versions" in data
    assert "translations" in data
    assert "meter_analysis" in data
    assert "audience_reviews" in data

    # 5. Test PUT /poems/{id} (edit content)
    update_response = client.put(
        f"/poems/{poem_id}",
        json={
            "title": "Edited Title",
            "original_text": "Updated text of the poem\nWith new lines for testing."
        }
    )
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Edited Title"

    # 6. Test GET improvements
    imp_response = client.get(f"/poems/{poem_id}/improvements")
    assert imp_response.status_code == 200
    assert "suggestions" in imp_response.json()

    # 7. Test POST audience-review
    aud_response = client.post(f"/poems/{poem_id}/audience-review")
    assert aud_response.status_code == 200
    aud_data = aud_response.json()
    assert "audience_reviews" in aud_data
    assert len(aud_data["audience_reviews"]) >= 3

def test_publishing_endpoints():
    # Get staged posts
    response = client.get("/publish/queue")
    assert response.status_code == 200
    queue = response.json()
    if len(queue) > 0:
        post_id = queue[0]["id"]
        # Approve posting
        approve_res = client.post(f"/publish/{post_id}/approve")
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "posted"
