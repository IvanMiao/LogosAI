import gradio as gr
from process.ocr import ocr_workflow
from process.gradio_css import CUSTOM_CSS
import os


MISTRAL_API_KEY = ""
GEMINI_API_KEY = ""


def update_api_keys(mistral_key, gemini_key):
	global MISTRAL_API_KEY, GEMINI_API_KEY

	MISTRAL_API_KEY = mistral_key
	GEMINI_API_KEY = gemini_key
	os.environ["MISTRAL_API_KEY"] = mistral_key
	os.environ["GEMINI_API_KEY"] = gemini_key

	return "API key saved"


with gr.Blocks(theme=gr.themes.Soft()) as demo:
	gr.Markdown("# 📚 Language Professor Agent")

	# --- API Key ---
	with gr.Row():
		with gr.Column(scale=1):
			mistral_api = gr.Textbox(
				label="Mistral API Key", 
				type="password", 
				placeholder="Enter your key",
				info="OCR recognition & text processing"
			)
		with gr.Column(scale=1):
			gemini_api = gr.Textbox(
				label="Gemini API Key", 
				type="password", 
				placeholder="Enter your key",
				info="text interpretation"
			)
		with gr.Column(scale=1):
			update_keys_button = gr.Button("Save keys")

	api_key_status_output = gr.Textbox(label="Status", interactive=False)

	update_keys_button.click(
		fn=update_api_keys,
		inputs=[mistral_api, gemini_api],
		outputs=api_key_status_output
	)

	# --- text processing ---
	gr.Markdown("---")
	gr.Markdown("## Text")

	with gr.Row():
		file_input = gr.File(label="Upload Image/PDF/text",file_types=["image", ".pdf", ".txt"])
		process_button = gr.Button("File Process")
	
	gr.Markdown("## Processed result")
	text_display = gr.Textbox(label="Prettier Text (with Mistral)",lines=20)

	# Hook the button click event
	process_button.click(
		fn=ocr_workflow,
		inputs=file_input,
		outputs=text_display
	)

	# --- text interpertation ---
	gr.Markdown("---")
	gr.Markdown("## Interpretation")

	with gr.Row():
		language_seletor = gr.Radio(["EN", "ZH", "FR"], label="prof's language")
		style_seletor = gr.Radio(["News", "Narrative", "Poem", "Philosophy"], label="genre")

	interpretation_output = gr.Textbox(
		label="Result (with Gemini)",
		lines=20,
		)


if __name__ == "__main__":
	demo.launch(share=True)

