import gradio as gr
from process.ocr import ocr_workflow
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
		result = ocr_workflow(file, MISTRAL_API_KEY)
		yield result, f"\n{result}\n"
	except Exception as e:
		error_msg = f"An error occurred during processing: {str(e)}"
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
				process_button = gr.Button("File Process", variant="primary")
			with gr.Column(scale=2):
				gr.Markdown("### Processed result")
				with gr.Tabs():
					with gr.Tab("Formatted View"):
						text_markdown = gr.Markdown(
							value="*Processed text will appear here...*\n\n",
						)
					with gr.Tab("Raw Text"):
						text_display = gr.Textbox(
							label="Raw Output",
							lines=15,
							max_lines=20,
							show_copy_button=True,
							value="*Raw output will appear here...*"
						)

	# Hook the button click event
	process_button.click(
		fn=ocr_workflow_wrapper,
		inputs=file_input,
		outputs=[text_display, text_markdown]
	)

	# --- Text Interpertation ---
	with gr.Tab("🎓 Text Interpretation"):
		gr.Markdown("### Configure Interpretation Settings")

		with gr.Row():
			with gr.Column(scale=1):
				language_seletor = gr.Radio(["EN", "ZH", "FR"], label="Prof's Language")
				style_seletor = gr.Radio(["News", "Narrative", "Poem", "Philosophy"], label="Genre")
				interpret_button = gr.Button("Generate Interpretation", variant="primary")

			with gr.Column(scale=2):
				gr.Markdown("### COURSE")
				interpretation_output = gr.Markdown(
					value="*Interpretation will appear here after processing...*\n\n",
					)

	# Hook the button(intrepretation TODO)

if __name__ == "__main__":
	demo.launch(share=True)

