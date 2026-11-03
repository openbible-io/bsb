import type { FileHandle } from "node:fs/promises";
import { parseLang } from "./html.ts";
import { parseBcvStrict, type Bcv, book as rBook } from "@nerd-bible/ref";
import {
	Builder,
	book as schemaBook,
	note as schemaNote,
} from "@nerd-bible/schema";
import type { Row, SourceRow, TranslationRow } from "./verse.ts";
import { pushVerse } from "./verse.ts";
import { GardState } from "wordgard/state";
import { Leaf, Plot } from "wordgard/doc";

export const shortcode = "bsb";
const published = new Date(2024, 11, 17);

const newId = () => crypto.randomUUID();

function pushHeading(b: Builder, level: number, text: string) {
	// console.log("pushHeading", level, text);
	const heading = schemaBook.Heading.of(level).create([Leaf.text(text)]);
	b.insert(Plot.End, heading);
}

function startChapter(b: Builder, vnum: Plot) {
	// remove empty paragraph but carry its styles to next chapter
	let claz = "";
	const chapterNum = b.state.sel.replacementRange.from;
	const para = chapterNum.parent.previousSibling;
	if (para?.type.name == schemaBook.Paragraph.name && para.length == 2) {
		claz = para.tag.param as string;
		const from = chapterNum.parent.start - 3;
		const to = from + 2;
		b.state = b.state.update({ changes: { from, to } }).state;
	}
	const ele = schemaBook.Paragraph.of(claz).create([vnum]);
	b.insert(Plot.End, ele);
}

const createDoc = (
	book: string,
	lang: string,
	title: string,
	sourceLang: string,
) => {
	const res = new Builder(
		schemaBook.schema.map((s) => GardState.schemaElement.of(s)),
		{
			type: "book",
			id: newId(),
			lang,
			published,
			book,
		},
	);
	res.xrefs["source"] = new Builder(
		schemaBook.schema.map((s) => GardState.schemaElement.of(s)),
		{
			type: "book",
			id: newId(),
			lang: sourceLang,
			published,
			book,
		},
	);
	res.xrefs["note"] = new Builder(
		schemaNote.schema.map((s) => GardState.schemaElement.of(s)),
		{
			type: "note",
			id: newId(),
			title: "Translator's Notes",
			lang,
			published,
		},
	);
	if (title) {
		pushHeading(res, 1, title);
		pushHeading(res.xrefs["source"], 1, title);
	}
	return res;
};

export async function* books(file: FileHandle): AsyncGenerator<Builder> {
	let rowI = 0;
	let prevBcv: Bcv | undefined;
	let builder = createDoc("", "", "", "");

	let verseRows: Row[] = [];
	function flushVerse(bcv: Bcv, diffChapter: boolean) {
		// console.log("flushVerse", bcv, diffChapter);
		const vnum = schemaBook.VerseNum.create([
			Leaf.text(" " + bcv.verse.toString() + " "),
		]);
		if (diffChapter) {
			startChapter(builder, vnum);
			startChapter(builder.xrefs["source"], vnum);
		} else {
			builder.insert(vnum);
			builder.xrefs["source"].insert(vnum);
		}
		pushVerse(bcv, verseRows, builder);
		verseRows = [];
	}

	for await (const line of file.readLines()) {
		if (rowI++ === 0) continue; // header

		let [
			hebSort,
			greekSort,
			_bsbSort,
			_verse,
			langName,
			sourceText,
			_source,
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

		const sourcePos = parseFloat(hebSort) + parseFloat(greekSort);
		if (!Number.isFinite(sourcePos)) {
			console.warn("unsortable", hebSort, greekSort);
			continue;
		}
		if (verseRef) {
			let newBcv;
			try {
				newBcv = parseBcvStrict(verseRef);
			} catch (e) {
				console.error(e);
				continue;
			}

			const diffBook = newBcv.book !== prevBcv?.book;
			const diffChapter = newBcv.chapter !== prevBcv?.chapter;
			const diffVerse = newBcv.verse !== prevBcv?.verse;

			if (prevBcv && (diffBook || diffChapter || diffVerse))
				flushVerse(prevBcv, prevBcv.verse == 1);

			if (diffBook) {
				if (!builder.isEmpty()) yield builder;

				const title = verseRef.replace(/\s*\d+:\d+/, "");
				builder = createDoc(
					newBcv.book,
					"eng",
					title,
					rBook.isNewTestament(newBcv.book) ? "grc" : "hbo",
				);
			}
			if (diffChapter) {
				const text = newBcv.chapter.toString();
				pushHeading(builder, 2, text);
				pushHeading(builder.xrefs["source"], 2, text);
			}

			prevBcv = newBcv;
		}
		if (!prevBcv) {
			console.warn("skipping row", rowI + 1, "until have verse");
			break;
		}

		let sourceRow: SourceRow | undefined;
		let translationRow: TranslationRow | undefined;

		if (sourceText) {
			let lang;
			try {
				lang = parseLang(langName);
			} catch (err) {
				console.error(rowI, prevBcv);
				throw err;
			}
			sourceRow = {
				text: sourceText,
				lang,
				parsing: parsing.replace(/\s+/g, ""),
				strongs: strongHeb.trim() || strongGrk.trim(),
			};
		}
		const joined =
			before.trim() +
			text.trim() +
			after.trim() +
			after2.trim() +
			after3.trim();
		if (joined) {
			translationRow = {
				html: heading.trim() + paraFmt.trim() + joined,
				footnotesHtml: footnotes,
			};
		}

		if (!sourceRow && !translationRow) continue; // gaps between verses
		verseRows.push({
			order: sourcePos,
			source: sourceRow as SourceRow,
			translation: translationRow as TranslationRow,
		});
	}

	if (prevBcv) {
		flushVerse(prevBcv, false);
		if (!builder.isEmpty()) yield builder;
	}
}
