# Prof-Agent/LogosAI 🚀

[Try this demo app in HuggingFace Space!](https://huggingface.co/spaces/IvanMiao/LogosAI)

An intelligent system that reads, reasons about and transforms language.

**Deeply read any text in any language — OCR, correct, interpret & translate in one interactive demo!**


## Why LogosAI?

• **All-in-one pipeline**: Upload images/PDFs/plain text → OCR → AI-powered proofreading → genre-aware interpretation → translation.  
• **Novel hackathon demo**: Leverages Mistral for OCR & correction, Gemini for interpretation/translation, served live as an MCP server.  
• **Genre intelligence**: Tailored system prompts for news, narratives, poetry, philosophy and general texts.  


## ⚙️ Features

1. **OCR & Correction**  
   – Extract text from images/PDFs/text files  
   – Proofread markdown output with AI for typos & formatting  
2. **Interpretation**  
   – Deep analysis of syntax, rhetoric & cultural context  
   – Supports “General” & “News” modes (more coming soon!)  
3. **Translation**  
   – Faithful transforms into Deutsch, English, Français, Русский or 中文  
4. **Live Gradio + MCP**  
   – runs with `mcp_server=True`  


## 🚀 Quick Start (Local)

1. Clone this repo  
2. `pip install -r requirements.txt` (with `python 3.13`!)
3. Set your keys:  
```bash
   export MISTRAL_API_KEY="…"
   export GEMINI_API_KEY="…"
```
4. Launch the app:
```bash
   python app.py
```
5. Open the Gradio link and start uploading, interpreting, translating!
