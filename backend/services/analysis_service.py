from fastapi import HTTPException
from sqlalchemy.orm import Session
from workflow.agent import TextAnalysisLangchain, MultiAgentState
from schema.analyze_schema import AnalysisRequest
from database import History
import os

class AnalysisService:
    def __init__(self):
        self.settings = {
            "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
            "model": "gemini-2.5-flash"
        }
        self.agent = self._init_agent()

    def _init_agent(self):
        if self.settings["gemini_api_key"]:
            return TextAnalysisLangchain(
                gemini_key=self.settings["gemini_api_key"],
                model=self.settings["model"]
            )
        return None

    def analyze_text(self, db: Session, request: AnalysisRequest):
        if not self.agent:
            raise HTTPException(status_code=400, detail="Please configure Gemini API key in settings")

        initial_state: MultiAgentState = {
            "messages": [],
            "text": request.text,
            "text_language": "",
            "genre": "",
            "needs_correction": False,
            "corrected_text": None,
            "interpretation": None,
            "user_language": request.user_language.upper()
        }

        final_state = self.agent.graph.invoke(initial_state)
        interpretation = final_state.get("interpretation")
        if not interpretation:
            raise HTTPException(status_code=500, detail="Analysis failed - no interpretation generated")

        # Save structured data to the database
        history = History(
            prompt=request.text,
            result=interpretation.summary,  # The main text result is the summary
            key_vocabulary=[v for v in interpretation.key_vocabulary],
            grammar_points=[g for g in interpretation.grammar_points],
            identified_errors=[e for e in interpretation.identified_errors]
        )
        db.add(history)
        db.commit()

        return interpretation.summary

    def get_history(self, db: Session):
        rows = db.query(History).order_by(History.timestamp.desc()).all()
        return [row.to_dict() for row in rows]

    def delete_history(self, db: Session, history_id: int):
        history = db.query(History).filter(History.id == history_id).first()
        if not history:
            raise HTTPException(status_code=404, detail="History item not found")
        db.delete(history)
        db.commit()

    def get_settings(self):
        has_key = bool(self.settings["gemini_api_key"])
        return {
            "gemini_api_key": self.settings["gemini_api_key"][:8] + "..." if has_key else "",
            "model": self.settings["model"],
            "has_api_key": has_key
        }

    def update_settings(self, new_settings):
        if new_settings.gemini_api_key:
            self.settings["gemini_api_key"] = new_settings.gemini_api_key

        self.settings["model"] = new_settings.model
        self.agent = self._init_agent()

        return self.get_settings()

# Create a single instance of the service
analysis_service = AnalysisService()
