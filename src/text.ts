import { join } from "node:path";
import { open } from "node:fs/promises";
import { downloadDir, fname } from "./download.ts";
import { parseBcvStrict, type Bcv } from "@nerd-bible/ref";
import { document, sentence, word } from "@nerd-bible/schema";
import type * as v from "@nerd-bible/valio";

const tsvPath = join(downloadDir, fname);
const file = await open(tsvPath);

type Document = {
	doc: v.Output<typeof document>;
	sentences: v.Output<typeof sentence>[];
	words: v.Output<typeof word>[];
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
let bcv: Bcv | undefined;

let rowI = 0;
let sourceWordI = 0;
let translationWordI = 0;
let speaker = "";
let nextParaFmt = "";
let nextBefore = "";
let nextSourceIds: number[] = [];

for await (const line of file.readLines()) {
	if (rowI++ === 0) continue;

	let [
		hebSort,
		greekSort,
		_bsbSort,
		_verse,
		lang,
		_source,
		sourceText, // WLC / Nestle Base {TR} ⧼RP⧽ (WH) 〈NE〉 [NA] ‹SBL› [[ECM]]
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
	// WLC / Nestle Base {TR} ⧼RP⧽ (WH) 〈NE〉 [NA] ‹SBL› [[ECM]]

	const sourceDocId = `${bcv.book}/${lang === "Hebrew" ? "he" : "gr"}/${pubId}`;
	const translatedDocId = `${bcv.book}/en/${pubId}`;
	const sentId = (translation.sentences.length + 1) * 256;
	if (verseRef) {
		translation.sentences.push({
			doc: translatedDocId,
			id: sentId,
			position: translation.sentences.length + 1,
			misc: {},
		});
		source.sentences.push({
			doc: sourceDocId,
			id: sentId,
			position: source.sentences.length + 1,
			misc: {},
		});
		sourceWordI = 0;
		translationWordI = 0;
	}
	sourceWordI++;
	const sourceWordId = sourceWordI * 256;

	if (sourceText) {
		source.words.push({
			doc: sourceDocId,
			sent: sentId,
			id: sourceWordId,
			position: sourcePos,
			type: undefined,
			form: sourceText,
			lemma: undefined,
			upos: undefined,
			xpos: parsing.replace(/\s+/g, ""),
			feats: {},
			head: undefined,
			deprel: undefined,
			deps: {},
			misc: {
				strongs: strongHeb ?? strongGrk,
			},
		});
	}

	// if (headingFmt) {
	// 	//<p class=|hdg|>The Creation
	// 	//<p class=|subhdg|>The First Day
	// 	const re = /<p class=\|([^\|]+)\|>([^<]*)/g;
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

	if (text) {
		const re = /<([^\s+]+)\s+class=\|([^\|]+)\|>/g;

		let newpar: string | undefined;
		let match: RegExpExecArray | null;
		while ((match = re.exec(paraFmt))) {
			if (match[1] === "p") {
				if (match[2].includes("red")) {
					match[2] = match[2].replace("red", "");
					speaker = "jesus";
				} else {
					speaker = "";
				}
				switch (match[2]) {
					case "indent1stline":
					case "tab1stline":
						newpar = "tab";
						break;
					case "indent1":
					case "tab1":
						newpar = "ml-1";
						break;
					case "indent2":
					case "tab2":
						newpar = "ml-2";
						break;
					case "selah":
					case "subhdg":
					case "inscrip":
						break;
					case "pshdg":
						newpar = "pshdg";
						break;
					case "list1":
					case "list2":
					case "list1stline":
						newpar = "list";
						break;
					case "reg":
					case "":
						newpar = "";
						break
					default:
						console.warn("unknown paragraph type", bcv, match[2]);
						break;
				}
			} else if (match[1] == "span") {
				if (match[2] === "red") {
					speaker = "jesus";
				} else {
					console.warn("Uncaptured span format", match[2]);
				}
			}
		}

		const textMisc: Record<string, string> = {
			chapter: bcv.chapter.toString(),
			verse: bcv.verse.toString(),
		};
		if (sourceText) {
			textMisc["sourceDoc"] = translatedDocId;
			nextSourceIds.push(sourceWordId);
			textMisc["sourceWordId"] = nextSourceIds.join(",");
			nextSourceIds = [];
		} else {
			console.warn("missing source", bcv, text);
		}
		if (speaker) textMisc["speaker"] = speaker;

		// No need for Intl.Segmenter thanks to before/after columns
		const translationWords = text.split(" ");

		for (let j = 0; j < translationWords.length; j++) {
			let form = "";
			const misc = { ...textMisc };

			if (j === 0) {
				if (nextBefore) {
					form += nextBefore;
					nextBefore = "";
				}
				form += before;
				if (newpar) misc["newpar"] = newpar;
			}
			form += translationWords[j];
			if (j === translationWords.length - 1)
				form +=
					after +
					after2 +
					after3.replace(/<\/span>/g, () => {
						speaker = "";
						return "";
					});

			if (j === translationWords.length - 1 && footnotes)
				textMisc.footnotes = footnotes;

			translation.words.push({
				doc: translatedDocId,
				sent: sentId,
				id: ++translationWordI * 256,
				position: sourceWordI,
				type: undefined,
				form,
				lemma: undefined,
				upos: undefined,
				xpos: undefined,
				feats: {},
				head: undefined,
				deprel: undefined,
				deps: {},
				misc,
			});
		}
	}
	//
	// if (rowI === 10) break;
}

// Remap
source.words = source.words.sort((a, b) => a.position - b.position);
let wordId = 1;
for (let i = 0; i < source.words.length; i++) {
	if (i > 1 && source.words[i - 1].sent !== source.words[i].sent) wordId = 1;
	source.words[i].position = wordId++ * 256;
}

// Temp inspection
// console.dir(source, { depth: null });
// console.dir(translation, { depth: null });
