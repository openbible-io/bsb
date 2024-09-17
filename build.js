import Exceljs from 'exceljs';
import csv from 'fast-csv';
import { readFileSync, createWriteStream, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { toJSON } from 'usfm-js';

const xlsx_tmp = 'bsb_tables.xlsx';
const outdir = 'dist';
const books = {
	'Genesis': 'gen',
	'Exodus': 'exo',
	'Leviticus': 'lev',
	'Numbers': 'num',
	'Deuteronomy': 'deu',
	'Joshua': 'jos',
	'Judges': 'jdg',
	'Ruth': 'rut',
	'1 Samuel': '1sa',
	'2 Samuel': '2sa',
	'1 Kings': '1ki',
	'2 Kings': '2ki',
	'1 Chronicles': '1ch',
	'2 Chronicles': '2ch',
	'Ezra': 'ezr',
	'Nehemiah': 'neh',
	'Esther': 'est',
	'Job': 'job',
	'Psalm': 'psa',
	'Proverbs': 'pro',
	'Ecclesiastes': 'ecc',
	'Song of Solomon': 'sng',
	'Isaiah': 'isa',
	'Jeremiah': 'jer',
	'Lamentations': 'lam',
	'Ezekiel': 'ezk',
	'Daniel': 'dan',
	'Hosea': 'hos',
	'Joel': 'jol',
	'Amos': 'amo',
	'Obadiah': 'oba',
	'Jonah': 'jon',
	'Micah': 'mic',
	'Nahum': 'nam',
	'Habakkuk': 'hab',
	'Zephaniah': 'zep',
	'Haggai': 'hag',
	'Zechariah': 'zec',
	'Malachi': 'mal',
	'Matthew': 'mat',
	'Mark': 'mrk',
	'Luke': 'luk',
	'John': 'jhn',
	'Acts': 'act',
	'Romans': 'rom',
	'1 Corinthians': '1co',
	'2 Corinthians': '2co',
	'Galatians': 'gal',
	'Ephesians': 'eph',
	'Philippians': 'php',
	'Colossians': 'col',
	'1 Thessalonians': '1th',
	'2 Thessalonians': '2th',
	'1 Timothy': '1ti',
	'2 Timothy': '2ti',
	'Titus': 'tit',
	'Philemon': 'phm',
	'Hebrews': 'heb',
	'James': 'jas',
	'1 Peter': '1pe',
	'2 Peter': '2pe',
	'1 John': '1jn',
	'2 John': '2jn',
	'3 John': '3jn',
	'Jude': 'jud',
	'Revelation': 'rev',
};

/**
 * Flatten verses so we can look if previous verse object is a paragraph without
 * having to maybe traverse back a verse.
 */
function parseUsfm(path) {
	console.warn('parsing', path);
	const usfm = readFileSync(path, 'utf8');
	const chapters = toJSON(usfm).chapters;
	Object.keys(chapters).forEach(cnum => {
		chapters[cnum]['-1'] = chapters[cnum].front;
		delete chapters[cnum].front;
		chapters[cnum] = Object.keys(chapters[cnum])
			.sort((k1, k2) => k1 - k2)
			.map(k => chapters[cnum][k].verseObjects)
			.flat(1)
			.filter(vo => vo.tag != 'b');
	});
	return chapters;
}

function parseLang(lang) {
	switch (lang) {
		case 'Greek': return 'grc';
		case 'Hebrew': return 'heb';
		case 'Aramaic': return 'arc';
		default: throw Error(`unknown language ${lang}`);
	}
}

async function parse() {
	console.warn('parsing', xlsx_tmp);
	const workbook = new Exceljs.Workbook();
	await workbook.xlsx.readFile(xlsx_tmp);
	const worksheet = workbook.getWorksheet('biblosinterlinear96');

	const out = csv.format({ headers: true, delimiter: '|' });
	const outpath = join(outdir, 'bibles', 'en_bsb.txt');
	mkdirSync(dirname(outpath), { recursive: true });
	const outStream = createWriteStream(outpath);
	out.pipe(outStream);

	let bcv = {};
	let chapters;
	worksheet.eachRow((r, i) => {
		if (r.values.length != 18 || i < 3) return;
		let [
			_,
			sort_heb,
			sort_grk,
			sort_bsb,
			og_lang,
			verse_n,
			og_word,
			__,
			og_transliteration,
			og_parsing,
			___,
			strong,
			verse,
			heading,
			xrefs,
			text,
			footnote,
			og_lex
		] = r.values;
		if (verse) {
			const match = verse.match(/^(.*) (\d+):(\d+)$/);
			if (!match) {
				console.error('invalid verse', verse);
				return;
			}
			const nextBcv = {
				book: books[match[1]],
				chapter: parseInt(match[2]),
				verse: parseInt(match[3]),
			};
			if (nextBcv.book != bcv.book) {
				let index = Object.values(books).indexOf(nextBcv.book);
				if (index >= Object.values(books).indexOf('mat')) index += 1;
				const path = `bsb_usfm/${(index + 1).toString().padStart(2, '0')}${nextBcv.book.toLocaleUpperCase()}BSB.usfm`;
				chapters = parseUsfm(path);
			}
			bcv = nextBcv;
		}
		if (!bcv) return;

		text = text
			.toString() // numbers should be strings.
			.replace(/^ *(-|vvv|(\. *){3})/m, '') // empty translation
			.replace(/\[|\]/g, '') // ???
			.replace(/\{|\}/g, '') // inserted words
			.replace(/(^[\p{P} ]+)/um, (_, b) => b.replaceAll(' ', '')) // start punctuation has added spaces
			.replace(/([\p{P} ]+)$/um, (_, b) => b.replaceAll(' ', '')) // end punctuation has added spaces
			.trim(); // rows implicitly have added whitespace.

		const verses = chapters[bcv.chapter.toString()];
		const textI = text && verses.findIndex(v => v.type == 'text' && v.text.trim().startsWith(text.trim()));
		const prevObj = verses[textI - 1];

		let before = '';
		if (
			prevObj?.type == 'paragraph' ||
			prevObj?.tag?.startsWith('l') ||
			prevObj?.tag?.startsWith('q')
		) before = prevObj.tag;

		out.write({
			book: bcv.book,
			chapter: bcv.chapter,
			verse: bcv.verse,
			og_lang: parseLang(og_lang),
		 	og_word,
		 	og_order: og_lang == 'Greek' ? sort_grk : sort_heb,
		 	og_parsing,
			og_transliteration,
		 	before,
		 	text,
		 	strong,
		 	heading,
		 	footnote,
		});
	});

	out.end();
}

await parse();
