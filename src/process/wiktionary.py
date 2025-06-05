import wikipedia

def	get_wiktionary_def(word: str, lang='en'):
	wikipedia.set_lang(lang)
	page = wikipedia.page(f"Wiktionary:{word}", auto_suggest=False)
	return f"[Definition of {word}]:\n{page.summary}"

# test
res = get_wiktionary_def("bus")
print(res)
