// necessary because inline HTML is included in `text` field :(
// pretty tied to BSB...
// would LOVE to use a real parser, but we need streaming line-by-line support
export type Lang = "eng" | "hbo" | "arc" | "grc";
export function parseLang(lang: string): Lang {
	if (lang === "Hebrew") return "hbo";
	if (lang === "Aramaic") return "arc";
	if (lang === "Greek") return "grc";

	throw new Error(`unknown language ${lang}`);
}

export type Tag = { tag: string; attrs?: Record<string, string> };
export function wordsAndTags(str: string): (string | Tag)[] {
	let res: ReturnType<typeof wordsAndTags> = [];
	const startTag = /<\s*([^/>][^>\s]*)\s*([^>]*)\s*>/;
	const endTag = /<\s*\/([^>]*)\s*>/;
	const attr = /\s*(\w+)=\|([^|]*)\|/g;
	const tag = new RegExp(`(?:${startTag.source})|(?:${endTag.source})`, "g");

	let index = 0;
	const pushWords = (end?: number) => res.push(str.substring(index, end));

	for (
		let match;
		(match = tag.exec(str));
		index = match.index + match[0].length
	) {
		pushWords(match.index);
		if (match[1]) {
			const attrs: Record<string, string> = {};
			let match2;
			while ((match2 = attr.exec(match[2]))) attrs[match2[1]] = match2[2];
			res.push({ tag: match[1], attrs });
		}
		if (match[3]) res.push({ tag: match[3] });
	}
	pushWords();

	return res;
}
