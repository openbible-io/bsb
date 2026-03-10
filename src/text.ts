import { join } from "node:path";
import { open } from "node:fs/promises";
import { downloadDir, fname } from "./download.ts";
import { parseBcvStrict, type Bcv } from "@nerd-bible/ref";
import { document, sentence, word } from "@nerd-bible/schema";
import type * as v from "@nerd-bible/valio";
import { writeFileSync } from "node:fs";

const tsvPath = join(downloadDir, fname);
const file = await open(tsvPath);

type Word = v.Output<typeof word>;
type Document = {
	doc: v.Output<typeof document>;
	sentences: v.Output<typeof sentence>[];
	words: Word[];
};

const pubId = "bsb";
const source: Document = {
	doc: {
		id: pubId,
		name: "Berean Standard Bible: Source",
		published: new Date(2024, 11, 17),
		publishedErrorRangeDays: 0,
	},
	sentences: [],
	words: [],
};
const translation: Document = {
	doc: {
		id: pubId,
		name: "Berean Standard Bible",
		published: new Date(2024, 11, 17),
		publishedErrorRangeDays: 0,
	},
	sentences: [],
	words: [],
};

// necessary because inline HTML is included in `text` field :(
// pretty tied to BSB...
// would LOVE to use a real parser, but we need streaming line-by-line support
type Tag = { open: string; attrs: Record<string, string> } | { close: string };
function wordsAndTags(
	str: string,
	lang: "en" | "he" | "gr" = "en",
): ({ text: string; isWordLike: boolean } | Tag)[] {
	let res: ReturnType<typeof wordsAndTags> = [];
	const segmenter = new Intl.Segmenter(lang, { granularity: "word" });

	const startTag = /<\s*([^/>][^>\s]*)\s*([^>]*)\s*>/;
	const endTag = /<\s*\/([^>]*)\s*>/;
	const attr = /\s*(\w+)=\|([^|]*)\|/g;
	const tag = new RegExp(`(?:${startTag.source})|(?:${endTag.source})`, "g");

	let index = 0;
	const pushWords = (end?: number) => {
		for (const w of segmenter.segment(str.substring(index, end))) {
			res.push({ text: w.segment, isWordLike: w.isWordLike ?? true });
		}
	};

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
			res.push({ open: match[1], attrs });
		}
		if (match[3]) res.push({ close: match[3] });
	}
	pushWords();

	return res;
}

let bcv: Bcv | undefined;
let rowI = 0;
let sourceWordI = 0;
let translationWordI = 0;
let speaker = "";
let nextParaFmt = "";
let nextBefore = "";
let nextSourceIds: number[] = [];
let sourceSource = "";
let newpar: string | undefined;

for await (const line of file.readLines()) {
	if (rowI++ === 0) continue;

	let [
		hebSort,
		greekSort,
		_bsbSort,
		_verse,
		lang,
		_source,
		sourceText,
		_translit,
		parsing,
		_parsing2,
		strongHeb,
		strongGrk,
		verseRef,
		heading,
		_xref,
		paraFmt,
		_space,
		before,
		text,
		after,
		after2,
		footnotes,
		after3,
	] = line.split("\t");

	paraFmt ??= nextParaFmt;
	nextParaFmt = "";
	before = nextBefore + before;
	nextBefore = "";

	if (verseRef) bcv = parseBcvStrict(verseRef);
	if (!bcv) {
		console.warn("skipping until have verse", rowI);
		break;
	}
	const sourcePos = parseFloat(hebSort) + parseFloat(greekSort);
	if (!Number.isFinite(sourcePos)) {
		console.warn("unsortable", hebSort, greekSort);
		continue;
	}

	const langCode = lang === "Greek" ? "gr" : "he";
	const sourceDocId = [bcv.book, langCode, pubId].join("/");
	const translatedDocId = [bcv.book, "en", pubId].join("/");

	// verses are sentences in source text
	if (verseRef) {
		translation.sentences.push({
			doc: translatedDocId,
			id: (translation.sentences.length + 1) * 256,
			position: translation.sentences.length + 1,
			misc: {},
		});
		source.sentences.push({
			doc: sourceDocId,
			id: (source.sentences.length + 1) * 256,
			position: source.sentences.length + 1,
			misc: {},
		});
		sourceWordI = 0;
		translationWordI = 0;
	}
	sourceWordI++;
	const sourceWordId = sourceWordI * 256;

	if (sourceText) {
		for (const wOrT of wordsAndTags(sourceText, langCode)) {
			if (!("text" in wOrT)) {
				console.warn("unknown tag in source text", wOrT);
				continue;
			}
			if (!wOrT.isWordLike) {
				// Nestle Base {TR} ⧼RP⧽ (WH) 〈NE〉 [NA] ‹SBL› [[ECM]]
				switch (wOrT.text) {
					case "{":
						sourceSource = "tr";
						continue;
					case "⧼":
						sourceSource = "rp";
						continue;
					case "(":
						sourceSource = "wh";
						continue;
					case "〈":
						sourceSource = "ne";
						continue;
					case "[":
						if (sourceSource === "na") sourceSource = "ecm";
						else sourceSource = "na";
						continue;
					case "‹":
						sourceSource = "sbl";
						continue;
					case "}":
					case "⧽":
					case ")":
					case "〉":
					case "]":
					case "›":
					case "]]":
						sourceSource = "";
						continue;
				}
			}
			let upos: string | undefined;
			if (wOrT.isWordLike && /^\d+$/.test(wOrT.text)) upos = "NUM";
			if (!wOrT.isWordLike) upos = "PUNCT";

			source.words.push({
				doc: sourceDocId,
				sent: (source.sentences.length + 1) * 256,
				id: sourceWordId,
				position: sourcePos,

				chapter: bcv.chapter,
				verse: bcv.verse,
				type: undefined,

				form: wOrT.text,
				lemma: undefined,
				upos,
				xpos: wOrT.isWordLike ? parsing.replace(/\s+/g, "") : undefined,
				feats: {},
				head: undefined,
				deprel: undefined,
				deps: {},
				misc: wOrT.isWordLike
					? {
							strongs: strongHeb.trim() || strongGrk.trim(),
						}
					: {},
			});
		}
	}

	// if (headingFmt) {
	// 	//<p class=|hdg|>The Creation
	// 	//<p class=|subhdg|>The First Day
	// 	let match;
	// 	const s = headingFmt.toString();
	// 	while ((match = re.exec(s)) != null) {
	// 		//if (match[2]) console.log(match[1]);
	// 		//3016 hdg
	// 		//  37 ihdg - italic heading (speakers in song of solomon)
	// 		//  42 subhdg - subheading
	// 		//  22 acrostic
	// 		//   5 suphdg - psalm book number
	// 		//   5 pshdg - psalm heading (i.e. Psalm 1-31)
	// 		if (match[1] == "hdg" || match[1] == "ihdg") {
	// 			headings.push({
	// 				text: match[2],
	// 				level: 2,
	// 			});
	// 		} else if (match[1] == "subhdg") {
	// 			headings.push({
	// 				text: match[2],
	// 				level: 3,
	// 			});
	// 		}
	// 	}
	// }

	text = text.trim();
	if (text == "-") {
		// untranslated source word
		text = "";
	} else if (text == ". . .") {
		// previous translated word captured this source word's meaning
		text = "";
		if (paraFmt) nextParaFmt = paraFmt;
		const prev = translation.words[translation.words.length - 1];
		prev.misc["sourceWordId"] ??= "";
		prev.misc["sourceWordId"] += `,${sourceWordId.toString()}`;
	} else if (text == "vvv") {
		// next translated word captures this source word's meaning
		text = "";
		nextSourceIds.push(sourceWordId);
	}
	// Genesis 35:18 has an error we'll tolerate.
	if (text.startsWith("vvv")) text = text.replace("vvv", "").trim();
	// Numbers has some weird ". . . 40,500"
	if (text.startsWith(". . .")) text = text.replace(". . .", "").trim();
	// The before/after columns were forgotten a few places...
	let match: RegExpMatchArray | null;
	if ((match = text.match(/^(\p{P})?\s*(:?. . .|vvv)\s*(\p{P})?$/u))) {
		text = "";
		nextBefore = match[1] ?? "";
		if (match[2]) {
			translation.words[translation.words.length - 1].form += match[2];
		}
	}

	if (text.includes("vvv") || text.includes(". . .")) {
		console.warn("unparsed sigil", bcv, text);
	}

	const joined = (before + text + after + after2 + after3).trim();
	if (joined) {
		for (const wOrt of wordsAndTags(paraFmt.trim())) {
			if ("text" in wOrt) console.log("HUH", bcv, wOrt, paraFmt);
			// if (match[1] === "p") {
			// 	if (match[2].includes("red")) {
			// 		match[2] = match[2].replace("red", "");
			// 		speaker = "jesus";
			// 	} else {
			// 		speaker = "";
			// 	}
			// 	switch (match[2]) {
			// 		case "indent1stline":
			// 		case "tab1stline":
			// 			newpar = "tab";
			// 			break;
			// 		case "indent1":
			// 		case "tab1":
			// 			newpar = "ml-1";
			// 			break;
			// 		case "indent2":
			// 		case "tab2":
			// 			newpar = "ml-2";
			// 			break;
			// 		case "selah":
			// 		case "subhdg":
			// 		case "inscrip":
			// 			break;
			// 		case "pshdg":
			// 			newpar = "pshdg";
			// 			break;
			// 		case "list1":
			// 		case "list2":
			// 		case "list1stline":
			// 			newpar = "list";
			// 			break;
			// 		case "reg":
			// 		case "":
			// 			newpar = "";
			// 			break;
			// 		default:
			// 			console.warn("unknown paragraph type", bcv, match[2]);
			// 			break;
			// 	}
			// } else if (match[1] == "span") {
			// 	if (match[2] === "red") {
			// 		speaker = "jesus";
			// 	} else {
			// 		console.warn("Uncaptured span format", match[2]);
			// 	}
			// }
		}

		const textMisc: Record<string, string> = {};
		if (sourceText) {
			nextSourceIds.push(sourceWordId);
			textMisc["sourceWordId"] = nextSourceIds.join(",");
			nextSourceIds = [];
		} else {
			console.warn("missing source", bcv, `"${joined}"`);
		}
		if (speaker) textMisc["speaker"] = speaker;

		let container: "smoothed" | "added" | "" = "";

		const wordsOrTags = wordsAndTags(joined);
		for (let j = 0; j < wordsOrTags.length; j++) {
			const w = wordsOrTags[j];

			if (!("text" in w)) {
				// console.log("parseIt", joined);
				continue;
			}

			const misc = { ...textMisc };
			switch (w.text) {
				case "{":
					container = "added";
					continue;
				case "[":
					container = "smoothed";
					continue;
				case "}":
				case "]":
					container = "";
					continue;
			}
			if (w.text.match(/^\s+$/)) continue;

			if (container) misc[container] = "Yes";
			if (j === 0 && newpar) misc["newpar"] = newpar;
			const last = j === wordsOrTags.length - 1;
			if (last && footnotes) textMisc.footnotes = footnotes;

			translation.words.push({
				doc: translatedDocId,
				sent: sentId,
				id: ++translationWordI * 256,
				position: translation.words.length + 1,

				chapter: bcv.chapter,
				verse: bcv.verse,
				type: undefined,

				form: w.text,
				lemma: undefined,
				upos: w.isWordLike ? undefined : "PUNCT",
				xpos: undefined,
				feats: {},
				head: undefined,
				deprel: undefined,
				deps: {},
				misc,
			});
			if (!w.isWordLike) {
				translation.words[translation.words.length - 1].misc["SpaceAfter"] =
					"No";
			}

			j++;
		}
	}
}

// Remap
source.words = source.words.sort((a, b) => a.position - b.position);
let wordId = 1;
for (let i = 0; i < source.words.length; i++) {
	if (i > 1 && source.words[i - 1].sent !== source.words[i].sent) wordId = 1;
	source.words[i].position = wordId++ * 256;
}

function toTsv(doc: Document) {
	const keys = Object.keys(doc.words[0]);
	let res = keys.join("\t");
	res += "\n";
	for (const w of doc.words) {
		res += keys
			.map((k) => {
				const val = w[k as keyof Word];
				if (typeof val === "object")
					return Object.entries(val)
						.map(([k, v]) => `${k}=${v}`)
						.join("|");
				return val ?? "";
			})
			.join("\t");
		res += "\n";
	}
	return res;
}

writeFileSync("source.tsv", toTsv(source));
writeFileSync("translation.tsv", toTsv(translation));
