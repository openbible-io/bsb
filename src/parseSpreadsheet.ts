import ExcelJS, { type CellValue, type Worksheet } from "exceljs";
import { type Book, bookFromEnglish, type BookId } from "@openbible/core";
import type { Ast } from "jsr:@openbible/bconv";

type Books = { [book in BookId]?: Book };

function parseRomanNumeral(s: string) {
	const lower = s.toLowerCase().trimEnd();
	if (lower.endsWith("i")) return 1;
	if (lower.endsWith("ii")) return 2;
	if (lower.endsWith("iii")) return 3;
	if (lower.endsWith("vi")) return 4;
	if (lower.endsWith("v")) return 5;
	throw Error("could not parse roman numeral " + s);
}

function parseRow(row: ExcelJS.Row) {
	const [
		_,
		hebSort,
		greekSort,
		_bsbSort,
		_verse,
		lang,
		_source1,
		source2, // WLC / Nestle Base {TR} ⧼RP⧽ (WH) 〈NE〉 [NA] ‹SBL› [[ECM]]
		_translit,
		_parsing1,
		_parsing2,
		_strongHeb,
		_strongGrk,
		verseRef,
		headingFmt,
		_xref,
		paraFmt,
		__,
		before,
		text,
		after,
		after2,
		_footnotes,
		after3,
	] = row.values as CellValue[];

	if (!source2) return;

	let verse;
	if (verseRef) {
		const match = verseRef.toString().match(/^(.*) (\d+):(\d+)$/);
		if (!match) {
			console.error("invalid verse", verseRef, "at row", row.number);
			return;
		}
		const book = bookFromEnglish(match[1]);
		verse = {
			bookRaw: match[1],
			book,
			chapter: parseInt(match[2]),
			verse: parseInt(match[3]),
		};
	}

	const headings: Ast = [];
	if (headingFmt) {
		//<p class=|hdg|>The Creation
		//<p class=|subhdg|>The First Day
		const re = /<p class=\|([^\|]+)\|>([^<]*)/g;
		let match;
		const s = headingFmt.toString();
		while ((match = re.exec(s)) != null) {
			//if (match[2]) console.log(match[1]);
			//3016 hdg
			//  37 ihdg - italic heading (speakers in song of solomon)
			//  42 subhdg - subheading
			//  22 acrostic
			//   5 suphdg - psalm book number
			//   5 pshdg - psalm heading (i.e. Psalm 1-31)
			if (match[1] == "hdg" || match[1] == "ihdg") {
				headings.push({
					text: match[2],
					level: 2,
				});
			} else if (match[1] == "subhdg") {
				headings.push({
					text: match[2],
					level: 3,
				});
			} else if (match[1] == "suphdg") {
				headings.push({ book: parseRomanNumeral(match[2]).toString() });
			}
		}
	}
	const paragraphs: Ast = [];
	if (paraFmt) {
		const re = /<p class=\|([^\|]+)\|>/g;
		let match;
		const s = paraFmt.toString();
		while ((match = re.exec(s)) != null) {
			// console.log(match[1]);
			//  22 acrostic
			//3016 hdg
			//  37 ihdg
			//8269 indent1
			//3286 indent1stline
			//  31 indent1stlinered
			//12476 indent2
			//  40 indentred1
			//  70 indentred2
			//   4 inscrip
			// 972 list1
			// 371 list1stline
			//  29 list2
			// 122 pshdg
			// 459 red
			//11822 reg
			// 223 selah
			//  43 subhdg
			//   5 suphdg
			//  12 tab1
			// 188 tab1stline
			//  32 tab1stlinered
			if (
				[
					"tab1stline",
					"tab1stlinered",
					"indent1stline",
					"indent1stlinered",
					"indent1",
					"list1",
					"list1stline",
					"tab1",
				].includes(match[1])
			) {
				paragraphs.push({ paragraph: "", class: "tab1" });
			} else if (["indent2", "indentred2", "list2"].includes(match[1])) {
				paragraphs.push({ paragraph: "", class: "tab2" });
			} else {
				paragraphs.push({ paragraph: "" });
			}
		}
	}
	if (typeof greekSort != "number" || typeof hebSort != "number") {
		console.error("invalid sort values", greekSort, hebSort);
		return;
	}
	if (typeof source2 != "string") {
		console.error("invalid source value", source2);
		return;
	}

	return {
		lang,
		sourceOrder: greekSort + hebSort, // (ab)use fact greekSort == 0 in OT and hebSort is 999999 for greek
		source: source2,
		verse,
		headings,
		paragraphs,
		text: (text ?? "").toString().trim(),
		joined: [before, (text ?? "").toString().trim(), after, after2, after3]
			.filter((t) => typeof t == "string")
			.join("") + " ",
	};
}

async function parseWorksheet(
	ws: ExcelJS.stream.xlsx.WorksheetReader,
): Promise<Books> {
	const res: Books = {};

	let verse: { book: BookId; chapter: number; verse: number } | undefined;
	for await (const row of ws) {
		const parsed = parseRow(row);
		if (!parsed) continue;
		// new book, chapter, or verse
		if (parsed.verse) {
			if (parsed.verse.book != verse?.book) {
				res[parsed.verse.book] = {
					name: parsed.verse.bookRaw,
					data: {
						ast: [
							{ book: parsed.verse.bookRaw },
						],
						source: [
							{ book: parsed.verse.bookRaw },
						],
					},
				};
				verse = {
					book: parsed.verse.book,
					chapter: -1,
					verse: -1,
				};
			}
		}
		if (!verse) continue;

		const data = res[verse.book]!.data!;

		if (parsed.verse) {
			if (parsed.verse.chapter != verse?.chapter) {
				const node = { chapter: parsed.verse.chapter };
				data.ast.push(node);
				data.source!.push(node);
			}
		}
		data.ast.push(...parsed.headings);
		data.ast.push(...parsed.paragraphs);
		if (parsed.verse) {
			if (parsed.verse.verse != verse?.verse) {
				const node = { verse: parsed.verse.verse };
				data.ast.push(node);
				data.source!.push(node);
			}
			verse = parsed.verse;
		}

		if (parsed.text == "-") {
			// untranslated
			data.source![parsed.sourceOrder] = parsed.source;
		} else if (parsed.text == ". . .") {
			// previous translated word captured this word's meaning
			data.source![parsed.sourceOrder] = {
				text: parsed.source,
				attributes: { index: data.ast.length },
			};
		} else if (parsed.text == "vvv") {
			// next translated word captures this word's meaning
			data.source![parsed.sourceOrder] = {
				text: parsed.source,
				attributes: { index: data.ast.length },
			};
		} else {
			if (parsed.joined) data.ast.push(parsed.joined);
			data.source![parsed.sourceOrder] = {
				text: parsed.source,
				attributes: { index: data.ast.length - 1 },
			};
		}
	}

	Object.values(res).forEach(({ data }) => {
		data!.source = data!.source!.filter(Boolean);
	});

	return res;
}

async function mainWorksheet(fname: string) {
	for await (
		const worksheet of new ExcelJS.stream.xlsx.WorkbookReader(fname, {})
	) {
		const w = worksheet as unknown as Worksheet;
		if (w.name == "biblosinterlinear96") return worksheet;
	}
	throw Error("could not find main worksheet");
}

export async function parseSpreadsheet(fname: string) {
	const interlinear = await mainWorksheet(fname);
	return await parseWorksheet(interlinear);
}
