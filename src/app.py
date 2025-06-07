import gradio as gr
from process.ocr import perform_raw_ocr, correct_text_with_ai
from process.gradio_css import CUSTOM_CSS


MISTRAL_API_KEY = ""
GEMINI_API_KEY = ""


def update_api_keys(mistral_key, gemini_key):
	global MISTRAL_API_KEY, GEMINI_API_KEY

	MISTRAL_API_KEY = mistral_key
	GEMINI_API_KEY = gemini_key

	return "API keys saved"


def ocr_workflow_wrapper(file):
	if not MISTRAL_API_KEY:
		error_msg = "Error: Mistral API Key not set."
		yield error_msg, error_msg + "\n\n\n"
		return

	yield "Processing...", "⏳ Processing, please wait...\n\n\n"

	try:
		result = perform_raw_ocr(file, MISTRAL_API_KEY)
		yield result, f"\n{result}\n"
	except Exception as e:
		error_msg = f"An error occurred during processing: {str(e)}"
		yield error_msg, error_msg + "\n\n\n"


def ai_correct(current_text: str):
	if not MISTRAL_API_KEY:
		error_msg = "Error: Mistral API Key not set."
		yield error_msg, error_msg + "\n\n\n"
		return
	if not current_text or current_text.strip() == "*Raw output will appear here...*":
		error_msg = "*No text to correct. Upload a file, or paste text into 'Raw Text' box first*"
		yield error_msg, error_msg
		return

	yield "⏳ AI Correcting text...", "⏳ AI Correcting text...\n\n*Please wait...*"
	try:
		result = correct_text_with_ai(current_text, MISTRAL_API_KEY)
		yield result, result
	except Exception as e:
		error_msg = f"Error : {e}"
		yield error_msg, error_msg + "\n\n\n"



with gr.Blocks(theme=gr.themes.Soft(), css=CUSTOM_CSS) as demo:
	gr.Markdown("# 📚 Language Professor Agent", elem_classes=["section-header"])

	# --- API Key ---
	with gr.Accordion("API Configuration", open=False):
		with gr.Row():
			with gr.Column(scale=2):
				mistral_api = gr.Textbox(
					label="Mistral API Key", 
					type="password", 
					placeholder="Enter your key",
					info="OCR recognition & text processing"
				)
			with gr.Column(scale=2):
				gemini_api = gr.Textbox(
					label="Gemini API Key", 
					type="password", 
					placeholder="Enter your key",
					info="text interpretation"
				)
			with gr.Column(scale=1):
				update_keys_button = gr.Button("Save keys")

	api_key_status_output = gr.Textbox(label="Status", interactive=False, show_label=False)

	update_keys_button.click(
		fn=update_api_keys,
		inputs=[mistral_api, gemini_api],
		outputs=api_key_status_output
	)

	# --- Text Processing ---
	gr.Markdown("---")
	with gr.Tab("Text Processing"):

		with gr.Row():
			with gr.Column(scale=1):
				gr.Markdown("### Upload documents")
				file_input = gr.File(
					label="Upload Image/PDF/text",
					file_types=["image", ".pdf", ".txt"]
					)
				process_button = gr.Button("1. File Process (OCR)", variant="primary")
				ai_correct_button = gr.Button("2. AI Correct", variant="primary")
			with gr.Column(scale=2):
				gr.Markdown("### Processed result")
				with gr.Tabs():
					with gr.Tab("Formatted View"):
						text_markdown = gr.Markdown(
							value="*Processed text will appear here...*\n\n",
						)
					with gr.Tab("Raw Text"):
						text_display = gr.Textbox(
							label="Raw Output / Editable Text",
							lines=15,
							max_lines=20,
							show_copy_button=True,
							value="*Raw output will appear here...*",
							interactive=True
						)

	# Hook the ocr button to click event
	process_button.click(
		fn=ocr_workflow_wrapper,
		inputs=file_input,
		outputs=[text_display, text_markdown]
	)

	# AI correction button to click event
	ai_correct_button.click(
		fn=ai_correct,
		inputs=text_display,
		outputs=[text_display, text_markdown]
	)

	# --- Text Interpertation ---
	with gr.Tab("🎓 Text Interpretation"):
		gr.Markdown("### Configure Interpretation Settings")

		with gr.Row():
			with gr.Column(scale=1):
				language_seletor = gr.Radio(["EN", "ZH", "FR"], label="Prof's Language")
				style_seletor = gr.Radio(["News", "Narrative", "Poem", "Philosophy", "Paper"], label="Genre")
				interpret_button = gr.Button("Generate Interpretation", variant="primary")

			with gr.Column(scale=2):
				gr.Markdown("### COURSE")
				interpretation_output = gr.Markdown(
					value="*Interpretation will appear here after processing...*\n\n",
					)

	# Hook the button(intrepretation TODO)

if __name__ == "__main__":
	demo.launch(share=True)

