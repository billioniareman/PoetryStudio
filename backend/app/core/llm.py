import os
import json
from typing import List, Optional, Any, Dict
from pydantic import Field
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration

# Try importing ChatLiteLLM, catch if dependencies are still installing
try:
    from langchain_community.chat_models import ChatLiteLLM
    HAS_LITELLM = True
except ImportError:
    HAS_LITELLM = False

# Class for local Mock LLM running when API keys are not provided
class MockChatModel(BaseChatModel):
    model_name: str = Field(default="mock-model")

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        # Combine message texts to check for keywords
        full_text = "\n".join([m.content for m in messages])
        
        # Analyze content to decide which mock response to return
        response_text = ""

        # 1. Translation Agent Check
        if "target_language" in full_text or "translate the following poem" in full_text.lower():
            if "hinglish" in full_text.lower():
                response_text = (
                    "Dheere se chalti hai shaam ki hawa,\n"
                    "Pedon ke beech chupaye koi raaz.\n"
                    "Teri khamoshi mein milta hai sukoon,\n"
                    "Kaash ye haseen raat kabhi khatam na ho."
                )
            elif "english" in full_text.lower():
                response_text = (
                    "Softly whispers the evening breeze,\n"
                    "Carrying secrets through the trees.\n"
                    "In your silence, I find my peace,\n"
                    "May this beautiful night never cease."
                )
            else: # Fallback to Hindi translation
                response_text = (
                    "धीरे से चलती है शाम की हवा,\n"
                    "पेड़ों के बीच छुपाए कोई राज़।\n"
                    "तेरी ख़ामोशी में मिलता है सुकून,\n"
                    "काश ये हसीन रात कभी ख़त्म न हो।"
                )
        
        # 2. Meter Agent Check
        elif "rhythm/meter mismatch" in full_text.lower() or "matra count" in full_text.lower():
            response_json = {
                "reason": "The word 'मुस्कुराहट' in line 3 creates a rhythm mismatch, pushing the count to 26 Matras instead of the target 24.",
                "suggestions": [
                    {
                        "replace": "मुस्कुराहट",
                        "with": "हँसी",
                        "reason": "Replacing 'मुस्कुराहट' with 'हँसी' reduces the count to 24 Matras, balancing the meter."
                    }
                ]
            }
            response_text = json.dumps(response_json, indent=2)

        # 3. Audience Romantic Lover Check
        elif "romantic poetry lover" in full_text.lower():
            response_json = {
                "rating": 9,
                "strengths": ["Deep emotional resonance", "Vulnerable tone that speaks to the heart", "Timeless romantic imagery"],
                "weaknesses": ["The third stanza feels slightly distant compared to the rest"],
                "favorite_line": "Teri khamoshi mein milta hai sukoon",
                "confusing_line": None,
                "suggestion": "Emphasize the silence between the lovers more in the middle section to build anticipation.",
                "final_emotion": "Nostalgic yearning (Ishq)"
            }
            response_text = json.dumps(response_json, indent=2)

        # 4. Audience Critic Check
        elif "literary critic" in full_text.lower():
            response_json = {
                "rating": 8,
                "strengths": ["Strong classical structure", "Avoidance of simple cliches in the opening couplet", "Phonetic harmony"],
                "weaknesses": ["Rhyme scheme in the third line is a bit forced", "The metaphor of the breeze is slightly conventional"],
                "favorite_line": "Pedon ke beech chupaye koi raaz",
                "confusing_line": "Kaash ye haseen raat kabhi khatam na ho",
                "suggestion": "Replace the conventional breeze metaphor with something more unique to this specific setting.",
                "final_emotion": "Contemplative and analytical appreciation"
            }
            response_text = json.dumps(response_json, indent=2)

        # 5. Audience Instagrammer Check
        elif "instagram reader" in full_text.lower():
            response_json = {
                "rating": 9,
                "strengths": ["Extremely quoteable couplets", "Relatable themes of love and quiet moments", "Perfect length for a single-image slide"],
                "weaknesses": ["Could use a stronger, more dramatic opening hook"],
                "favorite_line": "Kaash ye haseen raat kabhi khatam na ho",
                "confusing_line": None,
                "suggestion": "Start with the most emotional line to grab attention within the first 2 seconds of scrolling.",
                "final_emotion": "Aesthetic romance and cozy vibes"
            }
            response_text = json.dumps(response_json, indent=2)

        # 6. Improvement Editor Check
        elif "supportive literary editor" in full_text.lower():
            response_json = {
                "suggestions": [
                    {
                        "original_line": "मुस्कुराहट तेरी सब कुछ बदल देती है",
                        "suggested_line": "हँसी तेरी सब कुछ बदल देती है",
                        "change_summary": "Replaced 'मुस्कुराहट' with 'हँसी'",
                        "reason": "Fits the classical meter count of 24 matras and sounds more active",
                        "emotional_impact": "Creates a swifter, more direct poetic strike"
                    }
                ]
            }
            response_text = json.dumps(response_json, indent=2)

        # Default fallback
        else:
            response_text = "Poetry Studio AI Agent Output text."

        message = AIMessage(content=response_text)
        generation = ChatGeneration(message=message)
        return ChatResult(generations=[generation])

    @property
    def _llm_type(self) -> str:
        return "mock-chat-model"

def get_llm_model(provider_model: str = "gemini/gemini-1.5-flash") -> BaseChatModel:
    """
    Returns a unified LangChain chat model.
    Routes to LiteLLM if USE_MOCK_LLM is false/unset and API keys exist.
    Falls back to MockChatModel for zero-config operation.
    """
    use_mock = os.getenv("USE_MOCK_LLM", "true").lower() == "true"
    
    # Check keys
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")

    if not use_mock and HAS_LITELLM and (gemini_key or openai_key or groq_key):
        try:
            return ChatLiteLLM(model=provider_model, temperature=0.7)
        except Exception:
            return MockChatModel(model_name="fallback-mock")
    else:
        return MockChatModel(model_name=provider_model)
