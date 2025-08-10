import gradio as gr
from gradio import File, themes
from process.ocr import extract_text_from_file, correct_text_with_ai
from process.interpretation import get_interpretation
from process.translation import get_translation
from process.agent import TextAnalysisAgent
import os

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def update_api_keys(mistral_key, gemini_key):
    """
    Updates the global MISTRAL_API_KEY and GEMINI_API_KEY variables.

    Args:
            mistral_key: The Mistral API key.
            gemini_key: The Gemini API key.

    Returns:
            A string confirming that the API keys have been saved.
    """
    global MISTRAL_API_KEY, GEMINI_API_KEY

    MISTRAL_API_KEY = mistral_key
    GEMINI_API_KEY = gemini_key

    return "API keys saved"


def ocr_workflow_wrapper(file: File, mistral_key: str):
    """
    Manages the OCR workflow, processing an uploaded file to extract text.

    Args:
            file: The file object to process (image, PDF, or text).
            mistral_key: The Mistral API key for OCR processing.

    Yields:
            Status messages and the extracted text or error messages.
    """
    if not mistral_key:
        error_msg = "Error: Mistral API Key not set."
        yield error_msg, error_msg
        return
    if not file:
        error_msg = "Error: File/Text not found."
        yield error_msg, error_msg
        return

    try:
        result = extract_text_from_file(file, mistral_key)
        yield result, f"\n{result}\n"
    except Exception as e:
        error_msg = f"An error occurred during processing: {str(e)}"
        yield error_msg, error_msg


def ai_correct(current_text: str, mistral_key: str):
    """
    Corrects the provided text using an AI model.

    Args:
            current_text: The text to be corrected.
            mistral_key: The Mistral API key for AI correction.

    Yields:
            Status messages and the corrected text or error messages.
    """
    if not mistral_key:
        error_msg = "Error: Mistral API Key not set."
        yield error_msg, error_msg
        return
    if not current_text or current_text.strip() == "":
        error_msg = "*No text to correct. Upload a file, or paste text into 'Raw Text' box first*"
        yield error_msg, error_msg
        return

    try:
        result = correct_text_with_ai(current_text, mistral_key)
        yield result, result
    except Exception as e:
        error_msg = f"Error : {e}"
        yield error_msg, error_msg


def interpretation_workflow(
    text: str, genre: str, learn_language: str, target_language: str, gemini_key: str
):
    """
    Generates an interpretation of the text based on genre and language settings.

    Args:
            text: The text to interpret.
            genre: The genre of the text (e.g., "general", "news").
            learn_language: The language being learned.
            target_language: The language for the interpretation output.
            gemini_key: The Gemini API key for interpretation.

    Yields:
            Status messages and the generated interpretation or error messages.
    """
    if not gemini_key:
        yield "Error: Gemini api key not found."
        return
    if not text or text.strip() == "":
        yield "Error: Text is empty"
        return
    if not learn_language or not target_language:
        yield "Error: Language not selected"
        return

    if genre.lower() in ["general", "news", "philosophy"]:
        result = get_interpretation(
            genre.lower(), gemini_key, text, learn_language, target_language
        )
        yield result
    else:
        yield "not implemented yet"


def translation_workflow(text: str, target_language: str, gemini_key):
    """
    Translates the provided text to the target language.

    Args:
        text: The text to translate.
        target_language: The language to translate the text into.
        gemini_key: The Gemini API key for translation.

    Yields:
        Status messages and the translated text or error messages.
    """
    if not gemini_key:
        yield "Error: Gemini api key not found."
        return
    if not text or text.strip() == "":
        yield "Error: Text is empty"
        return
    if not target_language:
        yield "Error: Language not selected"

    existin_languages = [
        "العربية",
        "Deutsch",
        "Español",
        "English",
        "Français",
        "Italiano",
        "日本語",
        "Русский язык",
        "中文",
    ]
    if target_language in existin_languages:
        result = get_translation(text, gemini_key, target_language)
        yield result
    else:
        yield "not implemented yet"


def agent_workflow(text: str, user_language: str, mistral_key: str, gemini_key: str):
    if not mistral_key or not gemini_key:
        return "Error: Both Mistral and Gemini API keys are required."
    if not text or not text.strip():
        return "Error: Input text is empty."

    try:
        agent = TextAnalysisAgent(mistral_key=mistral_key, gemini_key=gemini_key)
        result = agent.run_analysis(text, user_language=user_language)
        return result
    except Exception as e:
        return f"An error occurred in the agent workflow: {e}"


with gr.Blocks(theme=themes.Monochrome()) as demo:
    gr.Markdown(
        "# 📚 LogosAI - Intensive Reading in Any Language",
        elem_classes=["section-header"],
    )

    # --- API Key ---
    with gr.Accordion("API Configuration", open=True):
        with gr.Row():
            with gr.Column(scale=2):
                mistral_api = gr.Textbox(
                    label="Mistral API Key",
                    type="password",
                    placeholder="Enter your key",
                    info="OCR recognition & text processing",
                )
            with gr.Column(scale=2):
                gemini_api = gr.Textbox(
                    label="Gemini API Key",
                    type="password",
                    placeholder="Enter your key",
                    info="text interpretation",
                )
            with gr.Column(scale=1):
                update_keys_button = gr.Button("Save keys")

    api_key_status_output = gr.Markdown()

    update_keys_button.click(
        fn=update_api_keys,
        inputs=[mistral_api, gemini_api],
        outputs=api_key_status_output,
    )

    # --- Text Processing ---
    gr.Markdown("---")
    with gr.Tab("Text"):
        with gr.Row():
            with gr.Column(scale=1):
                gr.Markdown("### Upload documents")
                file_input = gr.File(
                    label="Upload Image/PDF/text", file_types=["image", ".pdf", ".txt"]
                )
                process_button = gr.Button(
                    "1. File Process (OCR/Read)", variant="primary"
                )
                ai_correct_button = gr.Button("2. AI Correct", variant="primary")
            with gr.Column(scale=2):
                gr.Markdown("### Processed result")
                with gr.Tabs():
                    with gr.Tab("Raw Text"):
                        text_display = gr.Textbox(
                            label="Raw Text(editable)",
                            lines=15,
                            max_lines=20,
                            show_copy_button=True,
                            value="",
                            interactive=True,
                        )
                    with gr.Tab("Formatted Text"):
                        text_markdown = gr.Markdown(
                            value="*Processed text will appear here...*\n\n",
                            label="Formatted Text",
                        )

    # Hook the ocr button to click event
    process_button.click(
        fn=ocr_workflow_wrapper,
        inputs=[file_input, mistral_api],
        outputs=[text_display, text_markdown],
    )

    # AI correction button to click event
    ai_correct_button.click(
        fn=ai_correct,
        inputs=[text_display, mistral_api],
        outputs=[text_display, text_markdown],
    )

    # --- Agent ---
    with gr.Tab("Agent"):
        gr.Markdown("### Automated Analysis")
        with gr.Row():
            with gr.Column(scale=1):
                agent_prof_language_selector = gr.Dropdown(
                    ["AR", "DE", "ES", "EN", "FR", "IT", "JA", "RU", "ZH"],
                    label="Prof's Language",
                    value="EN",
                )
                agent_run_button = gr.Button(
                    "Run Automated Analysis", variant="primary"
                )
            with gr.Column(scale=2):
                gr.Markdown("### Agent Result")
                agent_output = gr.Markdown(
                    value="*Agent analysis will appear here...*\n\n",
                    label="Agent Result",
                )

        agent_run_button.click(
            fn=agent_workflow,
            inputs=[
                text_display,
                agent_prof_language_selector,
                mistral_api,
                gemini_api,
            ],
            outputs=agent_output,
        )

    # --- Text Interpertation ---
    with gr.Tab("🎓 Interpretation"):
        gr.Markdown("### Configure Interpretation Settings")

        with gr.Row():
            with gr.Column(scale=1):
                prof_language_seletor = gr.Dropdown(
                    ["AR", "DE", "ES", "EN", "FR", "IT", "JA", "RU", "ZH"],
                    label="Prof's Language",
                    value="EN",
                )
                learn_language_seletor = gr.Dropdown(
                    ["AR", "DE", "ES", "EN", "FR", "IT", "JA", "RU", "ZH"],
                    label="Language to Learn",
                    value="EN",
                )
                style_seletor = gr.Dropdown(
                    ["General", "News", "Philosophy", "Narrative", "Poem", "Paper"],
                    label="Genre",
                )
                interpret_button = gr.Button(
                    "Generate Interpretation", variant="primary"
                )

            with gr.Column(scale=2):
                gr.Markdown("### COURSE")
                interpretation_output = gr.Markdown(
                    value="*Interpretation will appear here after processing...*\n\n",
                    label="Interpretation Result",
                    show_copy_button=True,
                )

    interpret_button.click(
        fn=interpretation_workflow,
        inputs=[
            text_display,
            style_seletor,
            learn_language_seletor,
            prof_language_seletor,
            gemini_api,
        ],
        outputs=interpretation_output,
    )

    # --- Translation ---
    with gr.Tab("Translation"):
        gr.Markdown("### Configure Translation Settings")
        with gr.Row():
            with gr.Column(scale=1):
                target_language_selector = gr.Dropdown(
                    [
                        "العربية",
                        "Deutsch",
                        "Español",
                        "English",
                        "Français",
                        "Italiano",
                        "日本語",
                        "Русский язык",
                        "中文",
                    ],
                    value="English",
                    label="Target Language",
                    interactive=True,
                )
                translation_button = gr.Button("Translate!", variant="primary")

            with gr.Column(scale=2):
                interpretation_output = gr.Markdown(
                    value="*Translation will appear here ...*\n\n",
                    label="Translation Result",
                    show_copy_button=True,
                )

    translation_button.click(
        fn=translation_workflow,
        inputs=[text_display, target_language_selector, gemini_api],
        outputs=interpretation_output,
    )


if __name__ == "__main__":
    demo.launch(mcp_server=True)
