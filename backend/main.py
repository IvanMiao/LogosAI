from workflow.agent import TextAnalysisAgent
from dotenv import load_dotenv
import os

load_dotenv()

agent = TextAnalysisAgent(gemini_key=os.getenv("GEMINI_API_KEY"))

with open("test.md", encoding='utf-8') as f:
    text = f.read()

res = agent.run_analysis(text, user_language="ZH")

assert res is not None

with open("res.md", 'w', encoding='utf-8') as f:
    f.write(res)

print(res)
