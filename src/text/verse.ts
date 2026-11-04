import { type Bcv, book as rBook } from "@nerd-bible/ref";
import type { Lang, Tag } from "./html.ts";
import { wordsAndTags } from "./html.ts";
import { type Builder } from "@nerd-bible/schema";
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
const wordTokenizer = /[{}\[\]]|. . .|[\w- ]+/g;

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
): { start: number; length: number } {
	text = text.trim().replace(na28Sigils, "");
	if (!prevWasWordJoiner) b.insert(" ");

	let whitespaceSigil;
	text = text.replace(bhsBlockSigils, (_, m1, m2) => {
		whitespaceSigil = m2;
		return m1;
	});

	const start = b.state.doc.length;
	b.insert(text);
	prevWasWordJoiner = text.endsWith("־");

	if (whitespaceSigil == "פ") paraClass = whitespaceSigil;
	else if (whitespaceSigil == "ס")
		b.insert(schemaBook.Whitespace.of(whitespaceSigil));

	return { start, length: text.length };
}

export function pushVerse(bcv: Bcv, rows: Row[], builder: Builder) {
	const vnum = schemaBook.VerseNum.create([
		Leaf.text(" " + bcv.verse.toString() + " "),
	]);
	// Source
	const sourceMap = [];
	{
		const source = builder.xrefs["source"];
		const sourceIndices = Array.from(rows.keys()).sort(
			(a, b) => rows[a].order - rows[b].order,
		);

		if (paraClass || bcv.verse == 1) {
			source.insert(Plot.End, schemaBook.Paragraph.of(paraClass).create());
			paraClass = "";
		}
		source.insert(vnum);

		for (let i = 0; i < sourceIndices.length; i++) {
			const sourceIndex = sourceIndices[i];
			const row = rows[sourceIndex];
			const text = row.source?.text;
			if (!text) {
				console.warn("missing source", bcv, rows[i].order);
				continue;
			}

			sourceMap[sourceIndex] = insertSourceToken(source, text);
		}
	}
	// Translation and notes
	// for (let ti = 0; ti < rows.length; ti++) {
	// 	const raw = rows[ti];
	// 	if (!raw.translation) continue;
	//
	// 	// need sigil that isn't punctuation and isn't in main text
	// 	for (const wordOrTag of wordsAndTags(raw.translation.html)) {
	// 		if (typeof wordOrTag == "string") {
	// 			let match;
	// 			while ((match = wordTokenizer.exec(wordOrTag))) {
	// 				const token = match[0];
	// 				switch (token) {
	// 					case "{":
	// 						smoothingLevel = 2; // explicit smoothing
	// 						break;
	// 					case "[":
	// 						smoothingLevel = 1; // implicit smoothing (coreference resolution)
	// 						break;
	// 					case "}":
	// 					case "]":
	// 						smoothingLevel = 0;
	// 						break;
	// 					case "vvv": // next translated row captures this source word's meaning
	// 						// 	nextSourceIds.push(sourceWordId);
	// 						break;
	// 					case ". . .": // previous translated row captured this source word's meaning
	// 						// 	const prev = translation.words[translation.words.length - 1];
	// 						// 	prev.misc["sourceWordId"] ??= "";
	// 						// 	prev.misc["sourceWordId"] += `,${sourceWordId.toString()}`;
	// 						break;
	// 					case "-": // untranslated source word
	// 						break;
	// 					default:
	// 						const marks = smoothingLevel
	// 							? [schemaBook.Smoothed.of(smoothingLevel)]
	// 							: [];
	// 						builder.insert(Leaf.text(token, marks));
	// 						break;
	// 				}
	// 			}
	// 		} else {
	// 			const insertP = (claz: string) =>
	// 				builder.insert(Plot.End, schemaBook.Paragraph.of(claz));
	// 			switch (wordOrTag.tag) {
	// 				case "p": {
	// 					if (!wordOrTag.attrs) {
	// 						console.warn("ignoring closing p tag", bcv);
	// 						return;
	// 					}
	// 					switch (wordOrTag.attrs["class"]) {
	// 						case "acrostic":
	// 						case "indent1stline":
	// 						case "tab1stline":
	// 						case "indent1":
	// 						case "tab1":
	// 						case "indentred1":
	// 						case "tab1stlinered":
	// 						case "indent1stlinered":
	// 							insertP("poetry");
	// 							break;
	// 						case "red":
	// 							break;
	// 						case "indent2":
	// 						case "tab2":
	// 							builder.insert(schemaBook.LineBreak);
	// 							break;
	// 						case "selah":
	// 						case "inscrip": // SOMETHING IN CAPS
	// 							break;
	// 						case "suphdg": // psalm "BOOK I"
	// 						case "pshdg": // for the choirmaster
	// 						case "hdg":
	// 							builder.insert(Plot.End, schemaBook.Heading.of(3).create());
	// 							break;
	// 						case "ihdg":
	// 							builder.insert(
	// 								Plot.End,
	// 								schemaBook.Heading.of(3).create([
	// 									Leaf.text("", [schemaBook.Emphasis]),
	// 								]),
	// 							);
	// 							break;
	// 						case "subhdg":
	// 							builder.insert(Plot.End, schemaBook.Heading.of(4).create());
	// 							break;
	// 						case "list1stline":
	// 						case "list1":
	// 						case "list2":
	// 						// const lastName = translation.lastChild?.type.name;
	// 						// if (lastName === "ol" || lastName === "ul")
	// 						// 	return nodes.li.create();
	// 						//
	// 						// return nodes.ol.create(null, nodes.li.create());
	// 						case "reg":
	// 							console.dir(builder.state.toJSON(), { depth: null });
	// 							insertP("");
	// 							break;
	// 						default:
	// 							console.warn(
	// 								"unknown paragraph type",
	// 								bcv,
	// 								wordOrTag.attrs.class,
	// 							);
	// 							break;
	// 					}
	// 				}
	// 				// case "i":
	// 				// 	// Some footnotes use this for emphasis.
	// 				// 	if (tag.attrs) translation.startSpan({ tag: "em" });
	// 				// 	else translation.endSpan("em");
	// 				// 	return;
	// 				// case "span":
	// 				// 	if (tag.attrs) translation.startSpan({ tag: "q", cite: "jesus" });
	// 				// 	else translation.endSpan("q");
	// 				// 	return;
	// 				// default:
	// 				// 	console.warn("unknown tag", bcv, tag.tag);
	// 				// 	return;
	// 			}
	// 		}
	// 	}
	//
	// 	// const footnotes = wordsAndTags(raw.translation.footnotesHtml);
	// 	// activeMarks = [];
	// 	// if (footnotes.length) {
	// 	// 	const footnote = nodes.footnote.create(null, nodes.p.create());
	// 	// 	for (const wordOrTag of footnotes) {
	// 	// 		const node = translationNode(bcv, translation, wordOrTag);
	// 	// 		if (node) {
	// 	// 			if (node.isInline) appendInline(footnote, node);
	// 	// 			else appendBlock(footnote, node);
	// 	// 		}
	// 	// 	}
	// 	//
	// 	// 	appendInline(translation, footnote);
	// 	// 	if (bcv.chapter === 11 && bcv.verse == 13)
	// 	// 		console.log(footnote.toString());
	// 	// }
	// }
}
