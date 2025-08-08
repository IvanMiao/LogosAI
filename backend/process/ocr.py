from mistralai import Mistral
from mistralai.models import OCRResponse
from gradio import File

OCR_MODEL = "mistral-ocr-latest"
CHAT_MODEL = "mistral-large-latest"


def ocr_from_file(file_path, api_key: str, mode="image"):
    if not api_key:
        raise ValueError("Mistral API Key is required.")

    try:
        client = Mistral(api_key=api_key)
    except Exception:
        raise ValueError("API invalid.")

    uploaded_image = client.files.upload(
        file={
            "file_name": file_path,
            "content": open(file_path, "rb"),
        },
        purpose="ocr",
    )
    signed_url = client.files.get_signed_url(file_id=uploaded_image.id)

    if mode == "image":
        ocr_response = client.ocr.process(
            model=OCR_MODEL,
            document={
                "type": "image_url",
                "image_url": signed_url.url,
            },
            include_image_base64=True,
        )
    elif mode == "pdf":
        ocr_response = client.ocr.process(
            model=OCR_MODEL,
            document={
                "type": "document_url",
                "document_url": signed_url.url,
            },
            include_image_base64=True,
        )

    return ocr_response


def get_combined_markdown(ocr_response: OCRResponse) -> str:
    markdowns: list[str] = []
    for page in ocr_response.pages:
        markdowns.append(page.markdown)

    return "\n\n".join(markdowns)


def correct_text_with_ai(text: str, api_key: str) -> str:
    if not api_key:
        raise ValueError("Mistral API Key is required.")

    try:
        client = Mistral(api_key=api_key)
    except Exception as e:
        return f"ERROR: {str(e)}"

    response = client.chat.complete(
        model=CHAT_MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are an expert proofreader specializing in Markdown formatting and OCR error correction. Your task is to meticulously review provided Markdown text that has been generated via OCR.
					Your primary goal is to identify and correct **typographical errors, spelling mistakes, and redundant symbols** that are clearly a result of the OCR process.
					Additionally, you must correct any illogical or jumbled line breaks to ensure proper Markdown paragraph formatting.

					**Crucially, you must NOT alter the original meaning or content of the text.** Your corrections should be limited to:
					* Obvious OCR-induced spelling errors
					* Erroneous or redundant symbols
					* Markdown formatting errors
					* Jumbled or incorrect line breaks for proper paragraphing

					After your thorough review, output the carefully corrected Markdown text. JUST the text.""",
            },
            {"role": "user", "content": text},
        ],
        temperature=0.1,
    )
    return response.choices[0].message.content


def extract_text_from_file(input_file: File, api_key: str):
    if input_file and input_file.name:
        file_ext = input_file.name.split(".")[-1].lower()
    else:
        return "File/Text not found"

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
