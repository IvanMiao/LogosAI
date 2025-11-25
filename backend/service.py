import os

from workflow.agent import TextAnalysisLangchain


class AnalysisService:
    def __init__(self):
        self.settings = {
            "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
            "model": "gemini-2.5-flash",
        }
        self.agent = None
        self._init_agent()

    def _init_agent(self):
        if self.settings["gemini_api_key"]:
            self.agent = TextAnalysisLangchain(
                gemini_key=self.settings["gemini_api_key"], model=self.settings["model"]
            )
        else:
            self.agent = None

    def get_agent(self):
        return self.agent

    def update_settings(self, new_key: str | None, new_model: str):
        if new_key and new_key.strip():
            self.settings["gemini_api_key"] = new_key
        if new_model:
            self.settings["model"] = new_model
        self._init_agent()
        return self.settings


_analysis_service_instance = AnalysisService()


def get_analysis_service():
    return _analysis_service_instance
