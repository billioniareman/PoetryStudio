from langgraph.graph import StateGraph, END
from .state import PoetryStudioState
from .nodes import (
    fetch_node,
    translation_node,
    meter_node,
    audience_romantic_node,
    audience_critic_node,
    audience_instagrammer_node,
    aggregator_node,
    design_node,
    publish_node
)

def create_poetry_workflow():
    # 1. Initialize StateGraph
    workflow = StateGraph(PoetryStudioState)

    # 2. Add Nodes
    workflow.add_node("fetch", fetch_node)
    workflow.add_node("translation", translation_node)
    workflow.add_node("meter", meter_node)
    workflow.add_node("audience_romantic", audience_romantic_node)
    workflow.add_node("audience_critic", audience_critic_node)
    workflow.add_node("audience_instagrammer", audience_instagrammer_node)
    workflow.add_node("aggregator", aggregator_node)
    workflow.add_node("design", design_node)
    workflow.add_node("publish", publish_node)

    # 3. Define Flow / Edges
    workflow.set_entry_point("fetch")
    
    workflow.add_edge("fetch", "translation")
    workflow.add_edge("translation", "meter")
    
    # Run audience reviews sequentially for session safety
    workflow.add_edge("meter", "audience_romantic")
    workflow.add_edge("audience_romantic", "audience_critic")
    workflow.add_edge("audience_critic", "audience_instagrammer")
    workflow.add_edge("audience_instagrammer", "aggregator")
    
    # Sequential finish
    workflow.add_edge("aggregator", "design")
    workflow.add_edge("design", "publish")
    workflow.add_edge("publish", END)

    # 4. Compile Graph
    return workflow.compile()

# Singleton compiled app
poetry_app = create_poetry_workflow()
