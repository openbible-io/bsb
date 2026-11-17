import type { FileHandle } from "node:fs/promises";
import { parseLang } from "./html.ts";
import { parseBcvStrict, type Bcv, book as rBook } from "@nerd-bible/ref";
import type { Row, SourceRow, TranslationRow } from "./verse.ts";
import { pushVerse } from "./verse.ts";
import { MultiBuilder } from "./multi-builder.ts";

export const shortcode = "bsb";
const published = new Date(2024, 11, 17);

export async function* books(file: FileHandle): AsyncGenerator<MultiBuilder> {
	let rowI = 0;
	let prevBcv: Bcv | undefined;
	let builder = new MultiBuilder("", "", published, "");

	let verseRows: Row[] = [];
	function flushVerse(bcv: Bcv) {
		// console.log("flushVerse", bcv, diffChapter);
		try {
			pushVerse(bcv, verseRows, builder);
		} catch (err) {
			console.error(bcv, verseRows);
			throw err;
		}
		verseRows = [];
	}

	for await (const line of file.readLines()) {
		if (rowI++ === 0) continue; // header
		if (prevBcv?.verse! > 1) continue;

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
		] = line.split("\t").map((s) => s.trim());

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
				flushVerse(prevBcv);

			if (diffBook) {
				if (!builder.isEmpty()) yield builder;

				const title = verseRef.replace(/\s*\d+:\d+/, "");
				builder = new MultiBuilder(
					newBcv.book,
					"eng",
					published,
					rBook.isNewTestament(newBcv.book) ? "grc" : "hbo",
					{ title },
				);
			}
			if (diffChapter) {
				builder.pushChapter(newBcv.chapter.toString());
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
				strongs: strongHeb || strongGrk,
			};
		}
		const joined = before + text + after + after2 + after3;
		if (heading || paraFmt || joined) {
			translationRow = {
				html: heading + paraFmt + joined,
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
		flushVerse(prevBcv);
		if (!builder.isEmpty()) yield builder;
	}
}
