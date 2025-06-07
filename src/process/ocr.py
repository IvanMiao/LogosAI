from mistralai import Mistral
from mistralai.models import OCRResponse


OCR_MODEL = "mistral-ocr-latest"
CHAT_MODEL = "mistral-large-latest"


def ocr_from_file(file_path, api_key, mode="image"):

	if not api_key:
		raise ValueError("Mistral API Key is required.")
	client = Mistral(api_key=api_key)
	uploaded_image = client.files.upload(
		file={
			"file_name": file_path,
			"content": open(file_path, "rb"),
		},
		purpose="ocr"
	)
	signed_url = client.files.get_signed_url(file_id=uploaded_image.id)

	if mode == "image":
		ocr_response = client.ocr.process(
			model=OCR_MODEL,
			document={
				"type": "image_url",
				"image_url": signed_url.url,
			},
			include_image_base64=True
		)
	elif mode == "pdf":
		ocr_response = client.ocr.process(
			model=OCR_MODEL,
			document={
				"type": "document_url",
				"document_url": signed_url.url,
			},
			include_image_base64=True
		)

	return ocr_response


def get_combined_markdown(ocr_response: OCRResponse) -> str:

	markdowns: list[str] = []
	for page in ocr_response.pages:
		markdowns.append(page.markdown)

	return "\n\n".join(markdowns)


def correct_text_with_ai(text: str, api_key: str):

	if not api_key:
		raise ValueError("Mistral API Key if required.")
	client = Mistral(api_key=api_key)

	response = client.chat.complete(
		model=CHAT_MODEL,
		messages=[
			{
				"role": "system",
				"content":
					"""You are an expert proofreader specializing in Markdown formatting and OCR error correction. Your task is to meticulously review provided Markdown text that has been generated via OCR.
					Your primary goal is to identify and correct **typographical errors, spelling mistakes, and redundant symbols** that are clearly a result of the OCR process.

					**Crucially, you must NOT alter the original meaning or content of the text.** Your corrections should be limited to:
					* Obvious OCR-induced spelling errors
					* Erroneous or redundant symbols
					* Markdown formatting errors:

					After your thorough review, output the carefully corrected Markdown text. JUST the text."""
				},
			{
				"role": "user",
				"content": text
				},
		],
		temperature=0.1,
	)
	return(response.choices[0].message.content)


def perform_raw_ocr(input_file, api_key):
	file_ext = input_file.name.split('.')[-1].lower()
	
	if file_ext == "txt":
		with open(input_file, "r", encoding="utf-8") as f:
			return f.read()
	elif file_ext == "pdf":
		file_type = "pdf"
	else:
		file_type = "image"
	response = ocr_from_file(input_file, api_key, file_type)
	res_text = get_combined_markdown(response)
	return res_text

"""
def	ocr_workflow(input_file, api_key):
	if input_file.name.split('.')[-1].lower() == "pdf":
		file_type = "pdf"
	else:
		file_type = "image"
	response = ocr_from_file(input_file, api_key, file_type)
	res_text = get_combined_markdown(response)
	corr_text = correct_text_with_ai(res_text, api_key)

	return corr_text
"""
