from app.agents.nodes import HindiSyllabifier
from app.agents.workflow import poetry_app
from app.agents import fetch_agent
from unittest.mock import patch

def test_hindi_syllabifier():
    print("Testing Hindi Syllabifier matra counting...")
    
    # Test cases: (word, expected_matra)
    test_cases = [
        ("कमल", 3),
        ("नमस्ते", 5),
        ("सत्य", 3),
        ("प्यार", 3),
        ("रामायण", 6)
    ]
    
    for word, expected in test_cases:
        count = HindiSyllabifier.count_word_matras(word)
        print(f"Word: '{word}' | Counted: {count} | Expected: {expected}")
        assert count == expected, f"Failed for '{word}': got {count}, expected {expected}"
    print("All syllabification tests passed successfully!")

def test_keep_mocks():
    print("Testing Keep mocks...")
    test_notes = [{"title": "Test Poem", "text": "Lines"}]
    with patch("app.agents.fetch_agent.fetch_notes_from_keep", return_value=test_notes):
        notes = fetch_agent.fetch_notes_from_keep()
        assert len(notes) > 0
    print(f"Successfully loaded {len(notes)} mock notes.")

def test_langgraph_compilation():
    print("Testing LangGraph workflow compilation...")
    assert poetry_app is not None
    print("LangGraph workflow compiled successfully!")

if __name__ == "__main__":
    test_hindi_syllabifier()
    test_keep_mocks()
    test_langgraph_compilation()
    print("--- ALL TESTS PASSED ---")
