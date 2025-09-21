from pydantic import BaseModel

class AnalysisRequest(BaseModel):
    text: str
    user_language: str = "EN"


class AnalysisResponse(BaseModel):
    result: str
    success: bool
    error: str | None = None


from fastapi import FastAPI, HTTPException
from workflow.agent import TextAnalysisAgent
import os
from dotenv import load_dotenv

load_dotenv()

agent = TextAnalysisAgent(gemini_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

@app.post("/analyze", response_model=AnalysisResponse)
async def get_analyse_info(request: AnalysisRequest):
    try:
        result =  agent.run_analysis(request.text, request.user_language)
        if result is None:
            raise HTTPException(status_code=500, detail="Analysis failed")
        return AnalysisResponse(result=result, success=True)
    except Exception as e:
        return AnalysisResponse(result="", success=False, error=str(e))
