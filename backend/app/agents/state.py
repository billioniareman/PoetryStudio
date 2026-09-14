from typing import TypedDict, List, Dict, Any, Optional, Annotated
import operator

class PoetryStudioState(TypedDict):
    poem_id: Optional[int]
    title: Optional[str]
    original_text: str
    language: Optional[str]
    source: Optional[str]
    google_keep_id: Optional[str]
    translations: Dict[str, str]
    meter_analysis: Dict[str, Any]
    reviews: Annotated[List[Dict[str, Any]], operator.add]
    aggregate_review: Dict[str, Any]
    image_paths: Annotated[List[str], operator.add]
    publish_status: Dict[str, Any]
    logs: Annotated[List[str], operator.add]
