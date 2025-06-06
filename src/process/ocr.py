from mistralai import Mistral
import os

API_KEY = os.environ["MISTRAL_API_KEY"]
OCR_MODEL = "mistral-ocr-latest"

client = Mistral(api_key=API_KEY)

def	ocr_from_image(image_path):

	uploaded_image = client.files.upload(
    	file={
        	"file_name": image_path,
        	"content": open(image_path, "rb"),
    	},
    	purpose="ocr"
	)

	signed_url = client.files.get_signed_url(file_id=uploaded_image.id)

	ocr_response = client.ocr.process(
		model=OCR_MODEL,
		document={
			"type": "image_url",
			"image_url": signed_url.url,
		},
		include_image_base64=True
	)

	return ocr_response


def ocr_from_pdf(pdf_path):
	pass

def	correct_text_with_ai(text: str):
	pass

res = ocr_from_image("./test.png")
print(res.pages) # This returns a OCRPageObject
