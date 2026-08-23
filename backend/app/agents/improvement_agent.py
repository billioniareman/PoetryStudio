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
    prompt_path = os.path.join(PROMPTS_DIR, "improvement.txt")
    
    prompt_template = ""
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            prompt_template = f.read()
    else:
        prompt_template = "Suggest improvements for this poem, do not rewrite completely:\n{original_text}"

    prompt = prompt_template.format(original_text=original_text)
    
    try:
        response = llm.invoke(prompt)
        suggestions = json.loads(response.content.strip())
        return suggestions
    except Exception as e:
        logger.error(f"Error in ImprovementAgent: {e}")
        return {"suggestions": []}
