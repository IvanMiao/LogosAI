import gradio as gr

with gr.Blocks() as demo:
	gr.Markdown("# Language Professor Agent")

	with gr.Row():
		with gr.Column():
			file_input = gr.File(label="Upload Image/PDF/text",file_types=["image", ".pdf", ".txt"])
			process_button = gr.Button("File Process")
		with gr.Column():
			text_display = gr.Textbox(label="Prettier Text (with Mistral)", interactive=False, lines = 15)
	
	gr.Markdown("---")
	gr.Markdown("## Interpretation")

	with gr.Row():
		with gr.Column():
			language_seletor = gr.Radio(["EN", "ZH", "FR"], label="Select the prof's language")
			style_seletor = gr.Radio(["News", "Narrative", "Poem", "Philosophy"], label="Select text's genre")
		with gr.Column():
			interpretation_output = gr.Textbox(label="Result (with Gemini)", interactive=False, lines=10)

if __name__ == "__main__":
	demo.launch(share=True)

