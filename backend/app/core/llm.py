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
        # Combine message texts to inspect the prompt content
        full_text = "\n".join([m.content for m in messages])
        
        # 1. Extract poem text from the prompt to make responses dynamic and validated
        poem_lines = []
        for line in full_text.splitlines():
            l_strip = line.strip()
            # Exclude instructions, roles, system prefixes, or templates
            if l_strip and not any(x in l_strip.lower() for x in [
                "translate", "prompt", "role:", "persona:", "system:", "user:", 
                "instructions:", "output json", "original_text", "line_text", "target_matra"
            ]):
                poem_lines.append(l_strip)
                
        # Fallbacks if no poem text is parsed
        if not poem_lines:
            poem_lines = [
                "The silent moon is in the sky",
                "I watch it from my room so high"
            ]

        first_line = poem_lines[0]
        second_line = poem_lines[1] if len(poem_lines) > 1 else first_line

        # Determine the theme of the poem dynamically
        theme = "general"
        all_words = " ".join(poem_lines).lower()
        
        if any(w in all_words for w in ["prem", "pyaar", "pyar", "mohabbat", "ishq", "love", "dil", "humsafar", "romance", "gulaab", "rose", "husn", "kalai", "lagn", "प्यार", "इश्क़", "मोहब्बत", "दिल"]):
            theme = "romantic"
        elif any(w in all_words for w in ["gham", "dard", "ashk", "sad", "pain", "shattered", "broken", "lonely", "loneliness", "tear", "tanha", "ruswai", "judai", "hatas", "हतास", "दर्द", "ग़म", "आँसू"]):
            theme = "sadness"
        elif any(w in all_words for w in ["jeet", "defeat", "haar", "safar", "journey", "hope", "ummid", "ummeed", "win", "safalta", "koshish", "chahega", "जीत", "हार", "सफ़र", "उम्मीद"]):
            theme = "motivation"
        elif any(w in all_words for w in ["yari", "yaari", "dost", "friend", "yaar", "mehfil", "दोस्त", "यार", "महफ़िल"]):
            theme = "friendship"
        elif any(w in all_words for w in ["hawa", "wind", "weather", "mausam", "sea", "ocean", "river", "dariya", "moon", "chaand", "star", "tara", "sky", "falak", "autumn", "rain", "barsat", "हवा", "चाँद", "तारा", "मौसम", "दरिया"]):
            theme = "nature"

        response_text = ""

        # 2. Translation Agent Check
        if "target_language" in full_text or "translate the following poem" in full_text.lower():
            # Hinglish poetic word transliterations
            hinglish_map = {
                "mere": "मेरे",
                "hisse": "हिस्से",
                "me": "में",
                "mein": "में",
                "kuch": "कुछ",
                "cheezein": "चीज़ें",
                "cheez": "चीज़",
                "chiz": "चीज़",
                "chize": "चीज़ें",
                "dheere": "धीरे",
                "chalti": "चलती",
                "shaam": "शाम",
                "hawa": "हवा",
                "pedon": "पेड़ों",
                "beech": "बीच",
                "chupaye": "छुपाए",
                "koi": "कोई",
                "raaz": "राज़",
                "raz": "राज़",
                "khamoshi": "ख़ामोशी",
                "milta": "मिलता",
                "sukoon": "सुकून",
                "kaash": "काश",
                "kash": "काश",
                "haseen": "हसीन",
                "hasin": "हसीन",
                "raat": "रात",
                "rat": "रात",
                "kabhi": "कभी",
                "khatam": "ख़त्म",
                "mujhse": "मुझसे",
                "pehli": "पहली",
                "peheli": "पहली",
                "si": "सी",
                "mohabbat": "मोहब्बत",
                "mehboob": "महबूब",
                "na": "न",
                "maang": "माँग",
                "mang": "माँग",
                "maine": "मैंने",
                "samjha": "समझा",
                "tha": "था",
                "ki": "कि",
                "tu": "तू",
                "hai": "है",
                "to": "तो",
                "darakhshan": "दरख़्शाँ",
                "hayat": "हयात",
                "tera": "तेरा",
                "gham": "ग़म",
                "dahar": "दहर",
                "ka": "का",
                "jhagda": "झगड़ा",
                "kya": "क्या",
                "surat": "सूरत",
                "se": "से",
                "aalam": "आलम",
                "baharon": "बहारों",
                "sabat": "सबात",
                "dil": "दिल",
                "dhadkan": "धड़कन",
                "aankhein": "आँखें",
                "ankhe": "आँखें",
                "khoobsurat": "खूबसूरत",
                "zindagi": "ज़िंदगी",
                "mausam": "मौसम",
                "saath": "साथ",
                "sath": "साथ",
                "hum": "हम",
                "tum": "तुम",
                "jeenko": "जिन्हें",
                "bayaan": "बयान",
                "bayan": "बयान",
                "kru": "करूँ",
                "karu": "करूँ",
                "ese": "ऐसे",
                "ruk": "रुक",
                "jao": "जाओ",
                "ya": "या",
                "kahu": "कहूँ",
                "sun": "सुन",
                "pao": "पाओ"
            }
            
            # Word-by-word mapping to make translation validated for the exact text typed by the user
            word_map = {
                "the": "", "a": "", "an": "", "is": "है", "are": "हैं", "in": "में", "on": "पर",
                "of": "का", "to": "को", "for": "के लिए", "with": "के साथ", "and": "और",
                "i": "मैं", "you": "तुम", "we": "हम", "they": "वे", "he": "वह", "she": "वह", "it": "यह",
                "be": "होना", "have": "पास", "do": "करना", "say": "कहना", "go": "जाना",
                "can": "सकते", "will": "होगा", "would": "होगा", "my": "मेरा", "your": "तुम्हारा",
                "his": "उसका", "her": "उसका", "our": "हमारा", "their": "उनका", "me": "मुझे",
                "us": "हमें", "them": "उन्हें", "him": "उसे", "this": "यह", "that": "वह",
                "these": "ये", "those": "वे",
                "silent": "शांत", "moon": "चाँद", "sky": "आसमान", "watch": "देखता", "from": "से",
                "my": "मेरे", "room": "कमरे", "so": "इतने", "high": "ऊँचे", "leaves": "पत्तियां",
                "fall": "गिरती", "like": "की तरह", "whispered": "फुसफुसाए", "secrets": "राज़",
                "golden": "सुनहरे", "grey": "धूसर", "stone": "पत्थर", "chill": "ठंडी", "wind": "हवा",
                "carries": "ले जाती है", "memories": "यादों", "dark": "अंधेरा", "waters": "लहरें",
                "churning": "मंथन", "beneath": "नीचे", "pale": "पीला", "stars": "तारे",
                "reflected": "प्रतिबिंबित", "violent": "हिंसक", "swell": "उफान", "lonely": "अकेला",
                "lighthouse": "प्रकाशस्तंभ", "cuts": "काटता है", "gloom": "अंधेरे", "first": "पहला",
                "light": "प्रकाश", "breaking": "फूट रहा", "through": "के माध्यम", "pines": "चीड़",
                "birdsong": "पक्षियों का गान", "answers": "उत्तर", "fading": "धुंधली", "night": "रात",
                "new": "नया", "day": "दिन", "written": "लिखा", "lines": "पंक्तियाँ",
                "solitude": "एकांत", "autumn": "पतझड़", "sigh": "आह", "sea": "समुद्र", "dawn": "सवेरा",
                "love": "प्यार", "friend": "दोस्त", "path": "रास्ता", "shattered": "टूटे",
                "pain": "दर्द", "solace": "सुकून", "traveller": "यात्री", "antique": "प्राचीन",
                "land": "भूमि", "stone": "पत्थर", "desert": "रेगिस्तान", "shattered": "टूता",
                "visage": "चेहरा", "lies": "लेटा", "frown": "क्रोध", "wrinkled": "झुर्रीदार",
                "lip": "होंठ", "sneer": "उपहास", "cold": "ठंडा", "command": "आदेश"
            }
            
            try:
                import urllib.request
                import urllib.parse
                from concurrent.futures import ThreadPoolExecutor
                
                def translate_line(line):
                    if not line.strip():
                        return ""
                    if any('\u0900' <= char <= '\u097f' for char in line):
                        return line
                    q_line = urllib.parse.quote(line)
                    url = f"https://inputtools.google.com/request?text={q_line}&itc=hi-t-i0-und&num=1"
                    req = urllib.request.Request(
                        url, 
                        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                    )
                    try:
                        with urllib.request.urlopen(req, timeout=3) as r:
                            res_data = json.loads(r.read().decode('utf-8'))
                            return res_data[1][0][1][0]
                    except Exception:
                        # Fallback for this specific line if request fails
                        words = line.split()
                        trans_words = []
                        for w in words:
                            clean_w = w.lower().strip(".,?!;:\"'()[]")
                            if clean_w == "me" and any(v in line.lower() for v in ["kru", "kahu", "karu", "bayaan", "bayan", "ruk", "jao", "sun", "pao"]):
                                trans_words.append("मैं")
                            elif clean_w in hinglish_map:
                                trans_words.append(hinglish_map[clean_w])
                            elif clean_w in word_map:
                                trans_words.append(word_map[clean_w])
                            else:
                                trans_words.append(clean_w)
                        return " ".join(trans_words)

                with ThreadPoolExecutor(max_workers=15) as executor:
                    translated_lines = list(executor.map(translate_line, poem_lines))
                translated_text = "\n".join(translated_lines)
            except Exception as e:
                # Fallback to local hardcoded dictionary translator if thread pool crashes
                translated_lines = []
                for line in poem_lines:
                    if any('\u0900' <= char <= '\u097f' for char in line):
                        translated_lines.append(line)
                    else:
                        words = line.split()
                        trans_words = []
                        for w in words:
                            clean_w = w.lower().strip(".,?!;:\"'()[]")
                            if clean_w == "me" and any(v in line.lower() for v in ["kru", "kahu", "karu", "bayaan", "bayan", "ruk", "jao", "sun", "pao"]):
                                trans_words.append("मैं")
                            elif clean_w in hinglish_map:
                                trans_words.append(hinglish_map[clean_w])
                            elif clean_w in word_map:
                                trans_words.append(word_map[clean_w])
                            else:
                                trans_words.append(clean_w)
                        translated_lines.append(" ".join(trans_words))
                translated_text = "\n".join(translated_lines)
            
            if "hinglish" in full_text.lower():
                response_text = translated_text
            elif "english" in full_text.lower():
                response_text = "\n".join(poem_lines)
            else:
                response_text = translated_text
        
        # 3. Meter Agent Check
        elif "rhythm/meter mismatch" in full_text.lower() or "matra count" in full_text.lower() or "target_matra" in full_text.lower():
            words = second_line.split()
            last_word = words[-1] if words else "nhi"
            clean_last_word = last_word.lower().strip(".,?!;:\"'()[]")
            is_hindi = any('\u0900' <= char <= '\u097f' for char in clean_last_word)
            
            if theme == "romantic":
                replacement = "इश्क़" if is_hindi else "mohabbat"
                reason = f"Replacing '{last_word}' with '{replacement}' balances the matra count of this romantic verse while keeping the loving tone intact."
            elif theme == "sadness":
                replacement = "ग़म" if is_hindi else "gham"
                reason = f"Replacing '{last_word}' with '{replacement}' matches the required syllable weight and maintains the somber, sorrowful atmosphere."
            elif theme == "motivation":
                replacement = "जीत" if is_hindi else "jeet"
                reason = f"Replacing '{last_word}' with '{replacement}' achieves the desired matra count and strengthens the hopeful message."
            elif theme == "nature":
                replacement = "सबा" if is_hindi else "saba"
                reason = f"Replacing '{last_word}' with '{replacement}' balances the line rhythm and complements the natural imagery."
            elif theme == "friendship":
                replacement = "यार" if is_hindi else "yaar"
                reason = f"Replacing '{last_word}' with '{replacement}' optimizes the syllable flow of this warm companionship verse."
            else:
                replacement = "सदा" if is_hindi else "sada"
                reason = f"Replacing '{last_word}' with '{replacement}' corrects the matra count to balance the line rhythm."

            response_json = {
                "reason": f"The word '{last_word}' at the end of the line deviates from the target meter structure.",
                "suggestions": [
                    {
                        "replace": last_word,
                        "with": replacement,
                        "reason": reason
                    }
                ]
            }
            response_text = json.dumps(response_json, indent=2)

        # 4. Audience Romantic Lover Check
        elif "romantic poetry lover" in full_text.lower():
            if theme == "romantic":
                rating = 9
                strengths = ["Captures the tender nuances of intimacy", "Genuine romantic vulnerability", "Beautiful, classic couplet imagery"]
                weaknesses = ["Could focus even more on the sensory detail of the touch"]
                suggestion = f"Highlight the deep emotional pull of: '{first_line}'"
                final_emotion = "Deep, passionate longing (Ishq-e-Haqiqi)"
            elif theme == "sadness":
                rating = 8
                strengths = ["Conveys profound heartache and separation", "Touches the core of tragic love", "Sincere, raw pain"]
                weaknesses = ["The sadness feels a bit heavy-handed in the second half"]
                suggestion = f"Try balancing the grief in the line '{second_line}' with a memory of love."
                final_emotion = "Tragic melancholy and separation (Dard-e-Hijr)"
            elif theme == "motivation":
                rating = 7
                strengths = ["Energetic rhythmic drive", "Upbeat feeling of victory and self-worth"]
                weaknesses = ["Lacks the traditional romantic subtext standard readers look for"]
                suggestion = f"Inject a subtle romantic metaphor to soften the stance of: '{first_line}'"
                final_emotion = "Optimistic desire and longing"
            elif theme == "friendship":
                rating = 8
                strengths = ["Warm portrayal of companionship", "Relatable nostalgia of old shared moments"]
                weaknesses = ["Vibe is more platonic than romantic"]
                suggestion = f"Focus on the platonic romanticism of old friends in the line: '{second_line}'"
                final_emotion = "Brotherly affection and platonic warmth"
            elif theme == "nature":
                rating = 8
                strengths = ["Lush natural metaphors", "Evocative atmospheric description"]
                weaknesses = ["Metaphors sometimes overshadow the personal connection"]
                suggestion = f"Use the nature motif in '{first_line}' to directly mirror human feelings."
                final_emotion = "Serene, peaceful admiration"
            else:
                rating = 8
                strengths = ["Flowing poetic cadence", "Vulnerable atmosphere"]
                weaknesses = ["The flow is slightly interrupted at the line transition"]
                suggestion = f"Enhance the emotional clarity of the line: '{first_line}'"
                final_emotion = "Contemplative interest"

            response_json = {
                "rating": rating,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "favorite_line": first_line,
                "confusing_line": None,
                "suggestion": suggestion,
                "final_emotion": final_emotion
            }
            response_text = json.dumps(response_json, indent=2)

        # 5. Audience Critic Check
        elif "literary critic" in full_text.lower():
            if theme == "romantic":
                rating = 8
                strengths = ["Delicate ghazal-style lyricism", "Phonetic harmony in rhymes"]
                weaknesses = ["The rhyme scheme is slightly conventional"]
                suggestion = f"Experiment with rare rhymes (Qafia) around '{second_line}' to stand out from classical templates."
                final_emotion = "Aesthetic appreciation"
            elif theme == "sadness":
                rating = 9
                strengths = ["Excellent usage of melancholy as a structural anchor", "Powerful tragic metaphors"]
                weaknesses = ["Line length fluctuates, impacting the classical rhythm slightly"]
                suggestion = f"Tighten the syllable counts in the line '{second_line}' to preserve the slow, solemn pace of the grief."
                final_emotion = "Somber contemplation"
            elif theme == "motivation":
                rating = 8
                strengths = ["Strong assertive tone", "Bold, declarative cadence"]
                weaknesses = ["Uses slightly didactic language rather than imagery"]
                suggestion = f"Use active physical metaphors in '{second_line}' instead of abstract concepts to improve impact."
                final_emotion = "Resolute focus"
            elif theme == "friendship":
                rating = 7
                strengths = ["Colloquial ease and natural storytelling rhythm", "Approachable diction"]
                weaknesses = ["Stops short of complex literary layers"]
                suggestion = f"Consider using elevated word choices for friends and gather places in '{second_line}'."
                final_emotion = "Nostalgic validation"
            elif theme == "nature":
                rating = 9
                strengths = ["Vivid sensory imagery", "Strong environmental setting"]
                weaknesses = ["Lacks a clear philosophical anchor in the second couplet"]
                suggestion = f"Tie the environmental description in '{first_line}' with a deeper human reflection in '{second_line}'."
                final_emotion = "Intellectual curiosity"
            else:
                rating = 8
                strengths = ["Strong structural stability", "Good phonetic cadence"]
                weaknesses = ["Transitions between lines could be smoother"]
                suggestion = f"Adjust the line break structure of '{second_line}' to balance reading pace."
                final_emotion = "Balanced interest"

            response_json = {
                "rating": rating,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "favorite_line": first_line,
                "confusing_line": second_line,
                "suggestion": suggestion,
                "final_emotion": final_emotion
            }
            response_text = json.dumps(response_json, indent=2)

        # 6. Audience Instagrammer Check
        elif "instagram reader" in full_text.lower():
            if theme == "romantic":
                rating = 9
                strengths = ["Highly shareable couplet aesthetic", "Relatable emotional hook"]
                weaknesses = ["The font spacing in the preview will need custom styling for alignment"]
                suggestion = f"This couplet starting with '{first_line}' will go viral if paired with a minimalist dark layout."
                final_emotion = "Aesthetic romance and cozy vibes"
            elif theme == "sadness":
                rating = 9
                strengths = ["Hits right in the feels", "Perfect length for caption quotes"]
                weaknesses = ["Could use a bit more contrast in the imagery"]
                suggestion = f"Line '{first_line}' is a perfect quote block for a rain/night visual theme."
                final_emotion = "Bittersweet longing and heartbreak"
            elif theme == "motivation":
                rating = 9
                strengths = ["Powerful status/caption material", "Extremely motivational tone"]
                weaknesses = ["Slightly long for a single slide preview card"]
                suggestion = f"Highlight '{first_line}' as the bold header and let the rest sit as paragraph text."
                final_emotion = "Empowered and focused vibes"
            elif theme == "friendship":
                rating = 8
                strengths = ["Relatable shared memories", "Perfect to tag best friends under"]
                weaknesses = ["Visual theme needs to be warmer/casual"]
                suggestion = f"Ideal couplet to post as an appreciation story tag."
                final_emotion = "Casual and warm friendly vibes"
            elif theme == "nature":
                rating = 8
                strengths = ["Scenic visual aesthetics", "Perfect for atmospheric background images"]
                weaknesses = ["Text needs to be centered carefully to not overlap the background landscape details"]
                suggestion = f"Overlay the line '{first_line}' over a misty nature shot to maximize aesthetic value."
                final_emotion = "Calm and earthy aesthetics"
            else:
                rating = 8
                strengths = ["Aesthetic couplet pacing", "Quoteable lines"]
                weaknesses = ["Could use a slightly punchier hook line"]
                suggestion = f"Format '{first_line}' in a bold serif typography style."
                final_emotion = "Classic and minimalist aesthetic"

            response_json = {
                "rating": rating,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "favorite_line": first_line,
                "confusing_line": None,
                "suggestion": suggestion,
                "final_emotion": final_emotion
            }
            response_text = json.dumps(response_json, indent=2)

        # 7. Improvement Editor Check
        elif "supportive literary editor" in full_text.lower():
            words = second_line.split()
            last_word = words[-1] if words else "nhi"
            clean_last_word = last_word.lower().strip(".,?!;:\"'()[]")
            is_hindi = any('\u0900' <= char <= '\u097f' for char in clean_last_word)
            
            if theme == "romantic":
                replacement = "इश्क़" if is_hindi else "mohabbat"
                reason = "Fits the classical meter count and enhances the emotional depth"
            elif theme == "sadness":
                replacement = "ग़म" if is_hindi else "gham"
                reason = "Matches the required syllable count and emphasizes the sorrowful pace"
            elif theme == "motivation":
                replacement = "जीत" if is_hindi else "jeet"
                reason = "Aligns with the target meter and reinforces the theme of victory"
            elif theme == "nature":
                replacement = "सबा" if is_hindi else "saba"
                reason = "Restores the phonetic symmetry and fits natural imagery"
            elif theme == "friendship":
                replacement = "यार" if is_hindi else "yaar"
                reason = "Improves the lyrical rhythm of the companionship stanza"
            else:
                replacement = "सदा" if is_hindi else "sada"
                reason = "Fits the target meter count perfectly"

            response_json = {
                "suggestions": [
                    {
                        "original_line": second_line,
                        "suggested_line": second_line.replace(last_word, replacement),
                        "change_summary": f"Replaced '{last_word}' with '{replacement}'",
                        "reason": reason,
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
