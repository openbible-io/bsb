import type { Bcv } from "@nerd-bible/ref";
import type { Lang } from "./html.ts";
import { tokenize } from "./html.ts";
import { Builder } from "@nerd-bible/schema";
import { types } from "@nerd-bible/schema";
import { Plot } from "wordgard/doc";
import type { MultiBuilder } from "./multi-builder.ts";
import { GardState } from "wordgard/state";

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
// masoretic convention for sectioning
// פ =   open section = major section = usually a newline
// ס = closed section = minor section = usually a few whitespace
// sections never start in the middle of verses, so ׃ is helpful
const bhsBlockSigils = /(\p{P})([פס])$/u;
// TODO: figure out what these are
const na28Sigils = /[¦‿]/g;
const wordSigils = /[{}\[\]]|vvv|\. \. \.|\B-\B/g;

// Things that stretch between verses. We assume `pushVerse` is called in flow.
let smoothingLevel = 0;
let paraClass = "פ";
let prevWasWordJoiner = false;

const noteConfig = Object.values(types.note).map((s) =>
	GardState.schemaElement.of(s),
);

function insertSourceToken(
	mb: MultiBuilder,
	text: string,
): { pos: number; length: number } {
	text = text.trim().replace(na28Sigils, "");
	if (!prevWasWordJoiner) mb.source.push(" ");

	let whitespaceSigil;
	text = text.replace(bhsBlockSigils, (_, m1, m2) => {
		whitespaceSigil = m2;
		return m1;
	});

	const pos = mb.source.cursor;
	mb.source.push(text);
	prevWasWordJoiner = text.endsWith("־");

	if (whitespaceSigil == "פ") paraClass = whitespaceSigil;
	else if (whitespaceSigil == "ס") mb.pushBreak(whitespaceSigil);

	return { pos, length: text.length };
}

function tokenizeWord(w: string): string[] {
	let res: string[] = [];
	let index = 0;
	const push = (end?: number) => {
		const tok = w.substring(index, end).trim();
		if (tok && tok != "-") res.push(tok);
	};

	for (
		let match;
		(match = wordSigils.exec(w));
		index = match.index + match[0].length
	) {
		if (match.index != 0) push(match.index);
		if (match[0] != "-") res.push(match[0]);
	}
	push();
	return res;
}

export function pushVerse(bcv: Bcv, rows: Row[], mb: MultiBuilder) {
	mb.pushVerse(bcv.verse.toString());
	// Source
	const sourceMap: ReturnType<typeof insertSourceToken>[] = [];
	{
		const sourceIndices = Array.from(rows.keys()).sort(
			(a, b) => rows[a].order - rows[b].order,
		);

		if (paraClass) {
			mb.pushPara(paraClass);
			paraClass = "";
		} else if (bcv.verse == 1) {
			mb.pushPara("", true, true);
		}

		for (let i = 0; i < sourceIndices.length; i++) {
			const sourceIndex = sourceIndices[i];
			const row = rows[sourceIndex];
			const text = row.source?.text;
			if (!text) {
				console.warn(rows[i].order, "missing source", bcv);
				continue;
			}

			sourceMap[sourceIndex] = insertSourceToken(mb, text);
		}
	}

	// Translation
	for (let i = 0; i < rows.length; i++) {
		const raw = rows[i];
		if (!raw.translation) continue;

		// rich text
		for (const token of tokenize(raw.translation.html)) {
			if (typeof token == "string") {
				for (const t of tokenizeWord(token)) {
					switch (t) {
						case "{":
							smoothingLevel = 2; // explicit smoothing
							break;
						case "[":
							smoothingLevel = 1; // implicit smoothing (coreference resolution)
							break;
						case "}":
						case "]":
							smoothingLevel = 0;
							break;
						case "vvv": // next translated row captures this source word's meaning
							// 	nextSourceIds.push(sourceWordId);
							break;
						case ". . .": // previous translated row captured this source word's meaning
							// 	const prev = translation.words[translation.words.length - 1];
							// 	prev.misc["sourceWordId"] ??= "";
							// 	prev.misc["sourceWordId"] += `,${sourceWordId.toString()}`;
							break;
						default:
							const marks = smoothingLevel
								? [types.book.Smooth.of(smoothingLevel)]
								: [];
							mb.pushText(t, bcv.verse.toString(), marks, sourceMap[i]);
							break;
					}
				}
			} else {
				switch (token.tag) {
					case "p": {
						if (!token.attrs) {
							console.warn("ignoring closing p tag", bcv);
							return;
						}
						switch (token.attrs["class"]) {
							case "acrostic":
							case "indent1stline":
							case "tab1stline":
							case "indent1":
							case "tab1":
							case "indentred1":
							case "tab1stlinered":
							case "indent1stlinered":
								mb.pushPara("poetry");
								break;
							case "indent2":
							case "indentred2":
							case "tab2":
								mb.pushLineBreak();
								break;
							case "selah":
							case "inscrip": // SOMETHING IN CAPS
								break;
							case "suphdg": // psalm "BOOK I"
							case "hdg":
								mb.pushHeading(3);
								break;
							case "ihdg":
								mb.pushHeading(3, "", [types.book.Emphasis]);
								break;
							case "subhdg":
								mb.pushHeading(4);
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
							case "pshdg": // for the choirmaster
							case "red": // words of Jesus
								mb.pushPara("");
								break;
							default:
								console.warn("unknown paragraph type", bcv, token.attrs.class);
								break;
						}
					}
				}
			}
		}

		// notes
		const tokens = tokenize(raw.translation.footnotesHtml);
		if (tokens.length) {
			// TODO: xref
			if (tokens.some(t => typeof t == "string" && /cited in/i.test(t))) continue;

			const doc = new Builder(noteConfig, mb.book.meta);
			doc.push(Plot.End, types.note.Paragraph.of("").create());
			for (const wordOrTag of tokens) {
				if (typeof wordOrTag == "string") doc.push(wordOrTag);
				else {
					switch (wordOrTag.tag) {
						case "i":
							if (wordOrTag.attrs) doc.activate(types.note.Emphasis);
							else doc.deactivate(types.note.Emphasis);
							break;
						case "span":
							break;
						default:
							console.warn("unknown footnote tag", bcv, wordOrTag.tag);
							break;
					}
				}
			}

			mb.pushNoteAtom(doc);
		}
	}
}
