import gradio as gr
from ocr import ocr_from_image, correct_text_with_ai

def	process_image(image):
	yield "1/2 - OCR recognizing with Mistral...", None, gr.update(visible=False)
	ocr_text = ocr_from_image(image.name)

	yield "2/2 - Correcting with Mistral...", None, gr.update(visible=False)
	corrected_text = correct_text_with_ai(ocr_text)

	yield "Done!", None, gr.update(visible=False)


def	run_learn_task(text: str, choice: str):
	pass


def	make_interface():
	pass


if __name__ == "__main__":
	make_interface()
