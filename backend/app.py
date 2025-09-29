from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from workflow.agent import TextAnalysisAgent
from schema.analyze_schema import AnalysisRequest, AnalysisResponse
from dotenv import load_dotenv
import os


load_dotenv()

agent = TextAnalysisAgent(gemini_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# FastAPI Documentation: CORS (Cross-Origin Resource Sharing)
origins = [
    "http://localhost",
    "http://localhost:8080",
    "http://localhost:5173",
    "null"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/analyze", response_model=AnalysisResponse)
async def get_analyse_info(request: AnalysisRequest):
    try:
        result = agent.run_analysis(request.text, request.user_language)
        # print(result)
        if result is None:
            raise HTTPException(status_code=500, detail="Analysis failed")
        return AnalysisResponse(result=result, success=True)
    except Exception as e:
        return AnalysisResponse(result="", success=False, error=str(e))
