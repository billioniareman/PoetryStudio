import os
import json
import logging
from ..core.llm import get_llm_model

logger = logging.getLogger("poetrystudio.improvement_agent")

PROMPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../prompts"))

def run_improvement_agent(original_text: str) -> dict:
    """
    Runs the LLM with the editor improvement prompt.
    Returns a dict with suggestions for line replacements.
    """
    llm = get_llm_model()
    candidate_dirs = [
        PROMPTS_DIR,
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../prompts")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../prompts")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../prompts")),
        "/prompts",
        "/app/prompts",
    ]
    prompt_template = ""
    for d in candidate_dirs:
        path = os.path.join(d, "improvement.txt")
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    prompt_template = f.read()
                    break
            except Exception:
                pass
                
    if not prompt_template:
        logger.warning("improvement.txt not found in candidates. Using JSON-enforcing fallback.")
        prompt_template = (
            "You are a supportive literary editor. Your goal is to improve the provided poem while preserving the author's voice.\n"
            "Do not rewrite the entire poem. Only suggest targeted edits.\n\n"
            "Original Poem:\n{original_text}\n\n"
            "Output a structured JSON object with this key:\n"
            "{{\n"
            '  "suggestions": [\n'
            "    {{\n"
            '      "original_line": "exact line from original poem",\n'
            '      "suggested_line": "modified suggested line",\n'
            '      "change_summary": "short summary of edit",\n'
            '      "reason": "why this edit improves it",\n'
            '      "emotional_impact": "impact on reader"\n'
            "    }}\n"
            "  ]\n"
            "}}\n"
            "Only output the raw JSON object. Do not wrap in markdown or add conversational preamble."
        )

    prompt = prompt_template.format(original_text=original_text)
    
    try:
        response = llm.invoke(prompt)
        suggestions = json.loads(response.content.strip())
        return suggestions
    except Exception as e:
        logger.error(f"Error in ImprovementAgent: {e}")
        return {"suggestions": []}
