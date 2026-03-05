type Lang = "en" | "fr" | "zh";

interface AnalyzeRequest
{
	text: string;
	user_language: Lang;
}

interface AnalyzeResponse
{
	result: string;
	success: boolean;
	error?: string;
}

export type {Lang, AnalyzeRequest, AnalyzeResponse};
