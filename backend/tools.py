import os
from dotenv import load_dotenv

from langchain.chat_models import init_chat_model
from langchain_tavily import TavilySearch

from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

import json
from langchain_core.messages import ToolMessage

load_dotenv()
tavily_key = os.environ["TAVILY_API_KEY"]
gemini_key = os.environ["GEMINI_API_KEY"]


tool = TavilySearch(max_results=2)
tools = [tool]
# result = tool.invoke("")
# print(result)


llm = init_chat_model("google_genai:gemini-2.5-flash")


class State(TypedDict):
	messages: Annotated[list, add_messages]

graph_builder = StateGraph(State)

llm_with_tools = llm.bind_tools(tools)

def chatbot(state: State):
	return {"messages": [llm_with_tools.invoke(state["messages"])]}