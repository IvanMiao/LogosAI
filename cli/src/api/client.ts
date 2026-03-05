import type { Lang, AnalyzeRequest, AnalyzeResponse } from "../types/api.js"

const baseUrl: string = "http://localhost:8000"

function buildUrl(path: string): string
{
	return `${baseUrl}${path}`
}

async function analyze(payload: AnalyzeRequest): Promise<AnalyzeResponse>
{
	const res = await fetch(buildUrl("/analyze"), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}`)
	}

	const data = (await res.json()) as AnalyzeResponse;
	return data;
}

export { analyze };
