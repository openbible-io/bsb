import type { Bcv } from "@nerd-bible/ref";
import type { Lang } from "./html.ts";
import { tokenize } from "./html.ts";
import type { Builder } from "@nerd-bible/schema";
import { Leaf, Plot } from "wordgard/doc";
import { book as schemaBook, note as schemaNote } from "@nerd-bible/schema";

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

export function pushHeading(b: Builder, level: number, text: string) {
	// console.log("pushHeading", level, text);
	const heading = schemaBook.Heading.of(level).create([Leaf.text(text)]);
	b.insert(Plot.End, heading);
}

function insertSourceToken(
	b: Builder,
	text: string,
): { pos: number; length: number } {
	text = text.trim().replace(na28Sigils, "");
	if (!prevWasWordJoiner) b.insert(" ");

	let whitespaceSigil;
	text = text.replace(bhsBlockSigils, (_, m1, m2) => {
		whitespaceSigil = m2;
		return m1;
	});

	const pos = b.cursor;
	b.insert(text);
	prevWasWordJoiner = text.endsWith("־");

	if (whitespaceSigil == "פ") paraClass = whitespaceSigil;
	else if (whitespaceSigil == "ס")
		b.insert(schemaBook.Whitespace.of(whitespaceSigil));

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

export function pushVerse(bcv: Bcv, rows: Row[], builder: Builder) {
	const vnum = schemaBook.VerseNum.create([Leaf.text(bcv.verse.toString())]);
	// Source
	const sourceMap: ReturnType<typeof insertSourceToken>[] = [];
	{
		const source = builder.xrefs["source"];
		const sourceIndices = Array.from(rows.keys()).sort(
			(a, b) => rows[a].order - rows[b].order,
		);

		if (paraClass || bcv.verse == 1) {
			source.insert(Plot.End, schemaBook.Paragraph.of(paraClass).create());
			paraClass = "";
		}
		source.insert(vnum, Plot.End);

		for (let i = 0; i < sourceIndices.length; i++) {
			const sourceIndex = sourceIndices[i];
			const row = rows[sourceIndex];
			const text = row.source?.text;
			if (!text) {
				console.warn(rows[i].order, "missing source", bcv);
				continue;
			}

			sourceMap[sourceIndex] = insertSourceToken(source, text);
		}
	}

	// Translation, notes, and source map
	let insertedVnum = false;
	for (let i = 0; i < rows.length; i++) {
		const raw = rows[i];
		if (!raw.translation) continue;

		// translation
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
								? [schemaBook.Smoothed.of(smoothingLevel)]
								: [];
							const prevCanSpace =
								builder.lastInsert.isText &&
								!/[\p{Pc}|\p{Pd}|\p{Ps}|\p{Pi}]$/u.test(
									builder.lastInsert.param as string,
								);
							const curCanSpace = !/^[\p{Pc}\p{Po}.]/u.test(t);
							if (prevCanSpace && curCanSpace) builder.insert(" ");

							if (!insertedVnum && builder.isInsertValid(vnum)) {
								builder.insert(vnum, Plot.End);
								insertedVnum = true;
							}

							const map = builder.xrefsMap["source"];
							if (sourceMap[i]) {
								map.fromPos.push(sourceMap[i].pos);
								map.fromLen.push(sourceMap[i].length);
								map.toLen.push(t.length);
								map.toPos.push(builder.doc.length);
								map.toLen.push(t.length);
							}

							builder.insert(Leaf.text(t, marks));
							break;
					}
				}
			} else {
				const insertP = (claz: string) =>
					builder.insert(Plot.End, schemaBook.Paragraph.of(claz).create());
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
								insertP("poetry");
								break;
							case "indent2":
							case "indentred2":
							case "tab2":
								builder.insert(schemaBook.LineBreak);
								break;
							case "selah":
							case "inscrip": // SOMETHING IN CAPS
								break;
							case "suphdg": // psalm "BOOK I"
							case "hdg":
								builder.insert(Plot.End, schemaBook.Heading.of(3).create());
								break;
							case "ihdg":
								builder.insert(
									Plot.End,
									schemaBook.Heading.of(3).create([
										Leaf.text("", [schemaBook.Emphasis]),
									]),
								);
								break;
							case "subhdg":
								builder.insert(Plot.End, schemaBook.Heading.of(4).create());
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
								insertP("");
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
		const note = builder.xrefs["note"];
		const tokens = tokenize(raw.translation.footnotesHtml);
		if (tokens.length)
			note.insert(Plot.End, schemaNote.Paragraph.of("").create());
		for (const wordOrTag of tokens) {
			if (typeof wordOrTag == "string") note.insert(wordOrTag);
			else {
				switch (wordOrTag.tag) {
					case "i":
						if (wordOrTag.attrs) note.activate(schemaNote.Emphasis);
						else note.deactivate(schemaNote.Emphasis);
						break;
					case "span":
						break;
					default:
						console.warn("unknown footnote tag", bcv, wordOrTag.tag);
						break;
				}
			}
		}
	}
}
