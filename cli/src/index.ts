#!/usr/bin/env tsx

import type { Lang } from "./types/api.js";
import { analyze } from "./api/client.js"
import { Command } from "commander";
import { readFile } from "node:fs/promises";

const program = new Command()

program
	.command("analyze")
	.option("--text <text>", "Text to analyze")
	.option("--file <path>", "Read text from file")
	.option("--lang <language>", "user language: en, fr, zh")
	.option("--json", "Output as JSON")
	.action((options) => {
		// print them
		// console.log(`text: ${options.text}`);
		// console.log(`file: ${options.file}`);
		// end log
		const lang = parseLang(options.lang);

		if (options.text && options.file) {
			console.error("text OR file");
			process.exit(1);
		}
		if (!options.text && !options.file) {
			console.error("MUST have a option");
			process.exit(1);
		}
		if (options.text) {
			analyzeText(options.text, lang);
		} else if (options.file) {
			analyzeFile(options.file, lang);
		}
	})

program
	.name("logosai")
	.description("Analyse depth text")
	.parseAsync()


function parseLang(value: string | undefined): Lang {
	if (value === "en" || value === "fr" || value === "zh") {
		return value;
	} else if (value === undefined) {
		return "zh";
	} else {
		console.error("language not supported!")
		process.exit(1);
	}
}

async function analyzeText(text: string, lang: Lang="zh")
{
	try {
		const res = await analyze({
			text: text,
			// text: "Comment l’exégèse et la spéculation erronée sont-elles parvenues à embrouiller l’idée chrétienne ? La réponse catégorique est celle-ci : » Elles ont tout simplement fait reculer le paradoxe de la foi chrétienne dans la catégorie de l’esthétique, de sorte que tout terme chrétien qui, en restant dans sa sphère est essentiellement catégorique, en est à présent réduit à servir d’armes au bel esprit.",
			user_language: lang,
		}); 

		if (res.success) {
			console.log(res.result);
		} else {
			console.error(`API return error: ${res.error}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("error recv")
		if (error instanceof Error) {
			console.error(error.message);
		}
		console.error(error);
	}
}


async function analyzeFile(filepath: string, lang: Lang="zh")
{
	try {
		const text = await readFile(filepath, "utf-8");
		await analyzeText(text, lang);
	} catch (error) {
		console.error("error recv")
		if (error instanceof Error) {
			console.error(error.message);
		}
		console.error(error);
	}
}
