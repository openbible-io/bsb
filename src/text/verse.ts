import { type Bcv, book as rBook } from "@nerd-bible/ref";
import type { Lang, Tag } from "./html.ts";
import { wordsAndTags } from "./html.ts";
import { type Builder } from "@nerd-bible/schema";
import { Leaf } from "wordgard/doc";
import {
	book as schemaBook,
	note as schemaNote,
} from "@nerd-bible/schema";

export type SourceRow = {
	text: string;
	lang: Lang;
	parsing: string;
	strongs: string;
};
export type TranslationRow = {
	html: string;
	footnotesHtml: string;
};
export type Row = { order: number } & (
	| { source: SourceRow; translation: undefined }
	| { source: undefined; translation: TranslationRow }
	| { source: SourceRow; translation: TranslationRow }
);

let translationContainer = "";

export function pushVerse(
	bcv: Bcv,
	rows: Row[],
	builder: Builder,
) {
	const sourceIndices = Array.from(rows.keys()).sort(
		(a, b) => rows[a].order - rows[b].order,
	);
	// Source
	{
		const source = builder.xrefs["source"];
		const bhsBlockSigils = /([\p{P}\p{Z}])([פס])/gu;
		const na28Sigils = /[¦‿]/g;
		const startWord = source.words.length;
		let sourceText = "";
		for (const i of sourceIndices) {
			sourceText += sourceText.endsWith("־") ? "" : " ";
			const withoutSigils = rows[i].source?.text
				.replace(/־׃/g, "׃") // 2 sam 8:3 https://tanach.us/Notes/Samuel_2/Samuel_2.8.3.13-q.html
				.replace(bhsBlockSigils, "$1")
				.replace(na28Sigils, "")
				.trim();
			sourceText += withoutSigils;
		}

		source.push(
			schemaBook.VerseNum.create([Leaf.text(bcv.verse)]),
			Leaf.Text(sourceText),
		);

		const expected = sourceIndices.length;
		const actual = source.words.length - startWord;
		if (expected === actual) {
			for (let i = 0; i < sourceIndices.length; i++) {
				const row = rows[sourceIndices[i]];
				if (!row.source) continue;

				const id = startWord + i;
				const match = row.source.text.match(bhsBlockSigils);
				if (match) {
					source.blocks.push({
						doc: source.document.id,
						word: id,
						depth: 1,
						tag: "p",
						attrs: { class: match[2] },
					});
				}
				source.grammars.push({
					doc: source.document.id,
					word: id,
					lemma: row.source.strongs,
					xpos: row.source.parsing,
				});
			}
		} else {
			console.warn(
				bcv,
				"won't have grammar nor translation linking",
				"expected",
				expected,
				"words, got",
				actual,
			);
			console.error(
				"are there new sigils?",
				sourceText,
				source.words.slice(startWord).map((w) => w.before + w.text + w.after),
			);
		}
	}
	// Translation
	const doc = translation.document.id;
	for (let ti = 0; ti < rows.length; ti++) {
		const raw = rows[ti];
		if (!raw.translation) continue;

		translationContainer = "";

		// need sigil that isn't punctuation and is not in main text
		const html = raw.translation.html
			.replaceAll(". . .", "nnn")
			.replaceAll("...", "…");
		for (const wordOrTag of wordsAndTags(html)) {
			if ("text" in wordOrTag) {
				const word = wordOrTag;
				switch (word.text) {
					case "{":
						translationContainer = "smoothed"; // explicit smoothing (
						return;
					case "[":
						translationContainer = "added"; // implicit smoothing (coreference resolution)
						return;
					case "}":
					case "]":
						translationContainer = "";
						return;
					case "vvv": // next translated row captures this source word's meaning
						// 	text = "";
						// 	nextSourceIds.push(sourceWordId);
						return;
					case "nnn": // previous translated row captured this source word's meaning
						// 	text = "";
						// 	const prev = translation.words[translation.words.length - 1];
						// 	prev.misc["sourceWordId"] ??= "";
						// 	prev.misc["sourceWordId"] += `,${sourceWordId.toString()}`;
						return;
					case "-": // untranslated source word
						return;
				}

				if (/^\d+$/.test(word.text))
					translation.grammars.push({
						doc,
						word: translation.words.length,
						upos: "NUM",
					});
				translation.words.push({
					doc,
					id: translation.words.length,
					...wordOrTag,
				});
			} else {
				const tag = wordOrTag;
				switch (tag.tag) {
					case "p": {
						translation.endSpan("em");
						if (!tag.attrs) {
							console.warn("ignoring closing p tag", bcv);
							return;
						}

						switch (tag.attrs["class"]) {
							case "acrostic":
							case "indent1stline":
							case "tab1stline":
							case "indent1":
							case "tab1":
								translation.pushBlock("p", 1, { class: "ms-1" });
								break;
							case "red":
							case "indentred1":
							case "tab1stlinered":
							case "indent1stlinered":
								translation.pushBlock("p", 1, { class: "ms-1" });
								translation.startSpan({ tag: "q", cite: "jesus" });
								break;
							case "indent2":
							case "tab2":
								translation.pushBlock("p", 1, { class: "ms-2" });
								break;
							case "selah":
							case "inscrip": // SOMETHING IN CAPS
								return;
							case "suphdg": // psalm "BOOK I"
							case "pshdg": // for the choirmaster
							case "hdg":
								translation.pushBlock("h3", 1);
								break;
							case "ihdg":
								translation.pushBlock("h3", 1);
								translation.startSpan({ tag: "em" });
								break;
							case "subhdg":
								translation.pushBlock("h4", 1);
								break;
							case "list1stline":
							case "list1":
							case "list2":
								// const lastName = translation.lastChild?.type.name;
								// if (lastName === "ol" || lastName === "ul")
								// 	return nodes.li.create();
								//
								// return nodes.ol.create(null, nodes.li.create());
							case "reg":
								translation.pushBlock("p", 1);
								break;
							default:
								console.warn(
									"unknown paragraph type",
									bcv,
									tag.attrs.class,
								);
								return;
						}
					}
					case "i":
						// Some footnotes use this for emphasis.
						if (tag.attrs) translation.startSpan({ tag: "em" })
						else translation.endSpan("em");
						return;
					case "span":
						if (tag.attrs) translation.startSpan({ tag: "q", cite: "jesus" })
						else translation.endSpan("q");
						return;
					default:
						console.warn("unknown tag", bcv, tag.tag);
						return;
				}
			}
		}

		// const footnotes = wordsAndTags(raw.translation.footnotesHtml);
		// activeMarks = [];
		// if (footnotes.length) {
		// 	const footnote = nodes.footnote.create(null, nodes.p.create());
		// 	for (const wordOrTag of footnotes) {
		// 		const node = translationNode(bcv, translation, wordOrTag);
		// 		if (node) {
		// 			if (node.isInline) appendInline(footnote, node);
		// 			else appendBlock(footnote, node);
		// 		}
		// 	}
		//
		// 	appendInline(translation, footnote);
		// 	if (bcv.chapter === 11 && bcv.verse == 13)
		// 		console.log(footnote.toString());
		// }
	}
}
