import { readFileSync, createWriteStream, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { books } from '@openbible/core';
import ExcelJS from 'exceljs';
import fastcsv from 'fast-csv';
import { toJSON } from 'usfm-js';

const outDir = 'dist';

main('bsb_tables.xlsx');

async function main(fname: string) {
	console.log('parsing', fname);

	for await (const worksheet of new ExcelJS.stream.xlsx.WorkbookReader(fname, {})) {
		if ((worksheet as any).name == 'biblosinterlinear96') {
			parseWorkSheet(worksheet);
			break;
		}
	}
}

async function parseWorkSheet(interlinear: ExcelJS.stream.xlsx.WorksheetReader) {
	const outpath = join(outDir, 'en_bsb.csv');
	const out = fastcsv.format({ headers: true });
	mkdirSync(dirname(outpath), { recursive: true });
	const outStream = createWriteStream(outpath);
	out.pipe(outStream);

	for await (const row of interlinear) out.write(parseRow(row));

	out.end();
	console.log('wrote', outpath);
}

let bcv = {
	book: '',
	chapter: 0,
	verse: 0,
	startOrder: 0,
};
let chapters: ReturnType<typeof parseUsfm> = {};

function parseRow(row: ExcelJS.Row) {
	if (row.values.length != 18 || row.number < 3) return;
	let [
		_,
		sort_heb,
		sort_grk,
		_sort_bsb,
		lang,
		_verse_n,
		original,
		__,
		transliteration,
		parsing,
		___,
		strongs,
		verse,
		heading,
		_xrefs,
		translation,
		footnote,
		_lex
	] = row.values as string[];
	const order = (lang == 'Greek' ? sort_grk : sort_heb);

	if (verse) {
		const match = verse.match(/^(.*) (\d+):(\d+)$/);
		if (!match) {
			console.error('invalid verse', verse);
			return;
		}
		const nextBcv = {
			book: books.fromEnglish(match[1]),
			chapter: parseInt(match[2]),
			verse: parseInt(match[3]),
			startOrder: parseInt(order),
		};
		if (nextBcv.book != bcv.book) {
			let index = Object.values(books.protestant as unknown as string[]).indexOf(nextBcv.book);
			if (index >= Object.values(books.protestant).indexOf('mat')) index += 1;
			const path = `bsb_usfm/${(index + 1).toString().padStart(2, '0')}${nextBcv.book.toLocaleUpperCase()}BSB.usfm`;
			chapters = parseUsfm(path);
		}
		bcv = nextBcv;
	}
	if (!bcv) return;

	translation = translation
		.toString() // numbers should be strings.
		.replace(/^ *(-|vvv|(\. *){3})/m, '') // empty translation
		.replace(/(^[\p{P} ]+)/um, (_, b) => b.replaceAll(' ', '')) // start punctuation has added spaces
		.replace(/([\p{P} ]+)$/um, (_, b) => b.replaceAll(' ', '')) // end punctuation has added spaces
		.trim(); // rows implicitly have added whitespace.

	const verses = chapters[bcv.chapter.toString()];
	const textI = translation
		? verses.findIndex(v => v.type == 'text' && v.text?.trim().startsWith(translation.trim()))
		: -1;
	const prevObj = verses[textI - 1];

	let before = '';
	if (
		prevObj?.type == 'paragraph' ||
		prevObj?.tag?.startsWith('l') ||
		prevObj?.tag?.startsWith('q')
	) before = prevObj.tag!;

	return {
		book: bcv.book,
		chapter: bcv.chapter,
		verse: bcv.verse,
		original,
		lang: parseLang(lang),
		strong: `${lang == 'Greek' ? 'G' : 'H'}${strongs.toString().padStart(4, '0')}`,
		order: parseInt(order) - bcv.startOrder + 1,
		parsing,
		transliteration,
		translation,
		before,
		heading,
		footnote,
	};
}

/** Flatten verses so we can lookup previous verse. */
function parseUsfm(path: string) {
	console.log('parsing', path);
	const usfm = readFileSync(path, 'utf8');
	type VerseObject = { type: string, tag?: string, text?: string };
	const chapters = toJSON(usfm).chapters as {
		[c: string]: {
			[v: string] :  {
				verseObjects: VerseObject[],
			}
		}
	};
	// Correct order
	Object.keys(chapters).forEach(cnum => {
		chapters[cnum]['0'] = chapters[cnum].front;
		delete chapters[cnum].front;
	});
	return Object.keys(chapters).reduce((acc, cnum) => {
		acc[cnum] = Object.keys(chapters[cnum])
			.sort((k1, k2) => k1.localeCompare(k2))
			.map(k => chapters[cnum][k].verseObjects)
			.flat(1)
			.filter(vo => vo.tag != 'b');
		return acc;
	}, {} as { [key: string]: VerseObject[] } );
}

/**
 * @param eng english language name
 * @returns ISO 639-2 code
 */
function parseLang(eng: string) {
	switch (eng) {
		case 'Greek': return 'grc';
		case 'Hebrew': return 'heb';
		case 'Aramaic': return 'arc';
		default: throw Error(`unknown language ${eng}`);
	}
}
