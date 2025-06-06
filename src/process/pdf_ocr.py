from mistralai import Mistral
from mistralai import DocumentURLChunk, ImageURLChunk, TextChunk
from mistralai.models import OCRResponse
from IPython.display import Markdown, display
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter
import json
import argparse
import os
import argparse


def replace_images_in_md(md_str: str, images_dict: dict) -> str:
	for img_name, base64_str in images_dict.items():
		md_str = md_str.replace(f"![{img_name}]({img_name})", f"![{img_name}]({base64_str})")
	return md_str


def get_combined_markdown(ocr_response: OCRResponse) -> str:
	markdowns: list[str] = []
	for page in ocr_response.pages:
		# image_data = {}
		# for img in page.images:
		# 	image_data[img.id] = img.image_base64
		# markdowns.append(replace_images_in_md(page.markdown, image_data))
		markdowns.append(page.markdown)
	return "\n\n".join(markdowns)


def extract_pages(pdf_path: Path, n=10):
	""" Exact first n pages of a PDF file, save it to a new file """
	reader = PdfReader(pdf_path, strict=False)
	total_page = len(reader.pages)
	pdf_name = pdf_path.name

	chunk_count = (total_page + n - 1) // n
	for chunk in range(chunk_count):
		writer = PdfWriter()
		start = chunk * n
		end = min(start + n, total_page)
		for i in range(start, end):
			writer.add_page(reader.pages[i])
	
		output_path = f"data/chunk_{chunk + 1}_{pdf_name}"
		with open(output_path, "wb") as f:
			writer.write(f)
		print(f"已保存 {output_path} (页 {start+1}-{end})")

	print(f"成功将PDF分割为 {chunk_count} 个文件")
	return


def main():
	
	api_key = os.environ["MISTRAL_API"]
	client = Mistral(api_key=api_key)

	pdf_dir = input("give me a dir path: ")
	file_name = input("file name? ")
	pdf_files = Path(pdf_dir).glob('**/*.pdf') if file_name == "" else ("./" + pdf_dir + "/" + file_name)
	if (type(pdf_files) == str):
		pdf_files = [pdf_files]
	
	for file_path in pdf_files:
		print(f"Dealing with: {file_path}")
		pdf_file = Path(file_path)

	# data_dir = pdf_file.parent / "data"
	# data_dir.mkdir(parents=True, exist_ok=True)
	# extract_pages(pdf_file)

		uploaded_file = client.files.upload(
			file={
				"file_name": pdf_file.stem,
				"content": pdf_file.read_bytes(),
			},
			purpose="ocr",
		)

		signed_url = client.files.get_signed_url(file_id=uploaded_file.id, expiry=1)
		pdf_response = client.ocr.process(
			document=DocumentURLChunk(document_url=signed_url.url),
			model="mistral-ocr-latest",
			#include_image_base64=True
		)

		print(signed_url.url)
		md_content = get_combined_markdown(pdf_response)
		display(Markdown(md_content))

		output_path = pdf_file.with_suffix('.md')
		with open(output_path, 'w', encoding='utf-8') as f:
			f.write(md_content)
		print(f"Markdown content saved to {output_path}")



if __name__ == "__main__":
	main()
