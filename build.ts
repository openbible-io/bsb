/** @module
 * Builds `dist` folder.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { type Ast, canonicalize, usfm } from '@openbible/bconv';
import type { Author, Publication, Writing } from '@openbible/core';

function parseBook(fname: string): Ast {
	const text = Deno.readTextFileSync(fname);
	return canonicalize(usfm.parseAndPrintErrors(text));
}

const writing: Writing = {
	type: 'bible',
	preface: Deno.readTextFileSync('./preface.html'),
	books: {
		gen: parseBook('./bsb_usfm/01GENBSB.usfm'),
		exo: parseBook('./bsb_usfm/02EXOBSB.usfm'),
		lev: parseBook('./bsb_usfm/03LEVBSB.usfm'),
		num: parseBook('./bsb_usfm/04NUMBSB.usfm'),
		deu: parseBook('./bsb_usfm/05DEUBSB.usfm'),
		jos: parseBook('./bsb_usfm/06JOSBSB.usfm'),
		jdg: parseBook('./bsb_usfm/07JDGBSB.usfm'),
		rut: parseBook('./bsb_usfm/08RUTBSB.usfm'),
		'1sa': parseBook('./bsb_usfm/091SABSB.usfm'),
		'2sa': parseBook('./bsb_usfm/102SABSB.usfm'),
		'1ki': parseBook('./bsb_usfm/111KIBSB.usfm'),
		'2ki': parseBook('./bsb_usfm/122KIBSB.usfm'),
		'1ch': parseBook('./bsb_usfm/131CHBSB.usfm'),
		'2ch': parseBook('./bsb_usfm/142CHBSB.usfm'),
		ezr: parseBook('./bsb_usfm/15EZRBSB.usfm'),
		neh: parseBook('./bsb_usfm/16NEHBSB.usfm'),
		est: parseBook('./bsb_usfm/17ESTBSB.usfm'),
		job: parseBook('./bsb_usfm/18JOBBSB.usfm'),
		psa: parseBook('./bsb_usfm/19PSABSB.usfm'),
		pro: parseBook('./bsb_usfm/20PROBSB.usfm'),
		ecc: parseBook('./bsb_usfm/21ECCBSB.usfm'),
		sng: parseBook('./bsb_usfm/22SNGBSB.usfm'),
		isa: parseBook('./bsb_usfm/23ISABSB.usfm'),
		jer: parseBook('./bsb_usfm/24JERBSB.usfm'),
		lam: parseBook('./bsb_usfm/25LAMBSB.usfm'),
		ezk: parseBook('./bsb_usfm/26EZKBSB.usfm'),
		dan: parseBook('./bsb_usfm/27DANBSB.usfm'),
		hos: parseBook('./bsb_usfm/28HOSBSB.usfm'),
		jol: parseBook('./bsb_usfm/29JOLBSB.usfm'),
		amo: parseBook('./bsb_usfm/30AMOBSB.usfm'),
		oba: parseBook('./bsb_usfm/31OBABSB.usfm'),
		jon: parseBook('./bsb_usfm/32JONBSB.usfm'),
		mic: parseBook('./bsb_usfm/33MICBSB.usfm'),
		nam: parseBook('./bsb_usfm/34NAMBSB.usfm'),
		hab: parseBook('./bsb_usfm/35HABBSB.usfm'),
		zep: parseBook('./bsb_usfm/36ZEPBSB.usfm'),
		hag: parseBook('./bsb_usfm/37HAGBSB.usfm'),
		zec: parseBook('./bsb_usfm/38ZECBSB.usfm'),
		mal: parseBook('./bsb_usfm/39MALBSB.usfm'),
		mat: parseBook('./bsb_usfm/41MATBSB.usfm'),
		mrk: parseBook('./bsb_usfm/42MRKBSB.usfm'),
		luk: parseBook('./bsb_usfm/43LUKBSB.usfm'),
		jhn: parseBook('./bsb_usfm/44JHNBSB.usfm'),
		act: parseBook('./bsb_usfm/45ACTBSB.usfm'),
		rom: parseBook('./bsb_usfm/46ROMBSB.usfm'),
		'1co': parseBook('./bsb_usfm/471COBSB.usfm'),
		'2co': parseBook('./bsb_usfm/482COBSB.usfm'),
		gal: parseBook('./bsb_usfm/49GALBSB.usfm'),
		eph: parseBook('./bsb_usfm/50EPHBSB.usfm'),
		php: parseBook('./bsb_usfm/51PHPBSB.usfm'),
		col: parseBook('./bsb_usfm/52COLBSB.usfm'),
		'1th': parseBook('./bsb_usfm/531THBSB.usfm'),
		'2th': parseBook('./bsb_usfm/542THBSB.usfm'),
		'1ti': parseBook('./bsb_usfm/551TIBSB.usfm'),
		'2ti': parseBook('./bsb_usfm/562TIBSB.usfm'),
		tit: parseBook('./bsb_usfm/57TITBSB.usfm'),
		phm: parseBook('./bsb_usfm/58PHMBSB.usfm'),
		heb: parseBook('./bsb_usfm/59HEBBSB.usfm'),
		jas: parseBook('./bsb_usfm/60JASBSB.usfm'),
		'1pe': parseBook('./bsb_usfm/611PEBSB.usfm'),
		'2pe': parseBook('./bsb_usfm/622PEBSB.usfm'),
		'1jn': parseBook('./bsb_usfm/631JNBSB.usfm'),
		'2jn': parseBook('./bsb_usfm/642JNBSB.usfm'),
		'3jn': parseBook('./bsb_usfm/653JNBSB.usfm'),
		jud: parseBook('./bsb_usfm/66JUDBSB.usfm'),
		rev: parseBook('./bsb_usfm/67REVBSB.usfm'),
	},
};

const authors: Author[] = [
	{
		name: 'Gary Hill',
		url:
			'https://go.discoverybible.com/wp-content/uploads/2021/11/20181104_Bible-Discovery-HELPS-Faculty.pdf',
		qualifications: ['PhD from Trinity Evangelical Divinity School'],
		contributions: ['Advisor'],
	},
	{
		name: 'Grant R. Osborne',
		url: 'https://en.wikipedia.org/wiki/Grant_R._Osborne',
		qualifications: [
			'PhD from Aberdeen University',
			'Professor of New Testament at Trinity Evangelical Divinity School',
		],
		contributions: ['Advisor'],
	},
	{
		name: 'Eugene H. Merrill',
		url: 'https://en.wikipedia.org/wiki/Eugene_H._Merrill_(academic)',
		qualifications: [
			'PhD from Bob Jones University',
			'PhD from Columbia University',
		],
		contributions: ['Advisor'],
	},
	{
		name: 'Maury Robertson',
		url: 'http://gsapps.org/faculty/bio.aspx?p=MauryRobertson',
		qualifications: [
			'PhD from Golden Gate Baptist Theological Seminary',
			'M.Div. from Golden Gate Baptist Theological Seminary',
		],
		contributions: ['Advisor'],
	},
	{
		name: 'Ulrik Sandborg-Petersen',
		url: 'https://github.com/emg',
		contributions: ['Advisor'],
	},
	{
		name: 'Baruch Korman',
		url: 'https://loveisrael.org/about/',
		qualifications: [
			'PhD',
			'Senior lecturer at the Zera Abraham Institute',
		],
		contributions: ['Advisor'],
	},
	{
		name: 'Gleason Archer',
		url: 'https://en.wikipedia.org/wiki/Gleason_Archer_Jr.',
		qualifications: [
			'Professor at Trinity Evangelical Divinity School',
		],
		contributions: ['Extended translation notes'],
	},
];

const publication: Publication = {
	title: 'Berean Standard Bible',
	lang: 'eng',
	downloadUrl: 'https://berean.bible/downloads.htm',
	publisher: 'BSB Publishing',
	publisherUrl: 'https://berean.bible',
	publishDate: '2022',
	isbn: 9781944757045,
	license: 'CC-PDDC',
	licenseUrl: 'https://berean.bible/licensing.htm',
	authors,
	writings: [writing],
};

mkdirSync('dist', { recursive: true });
writeFileSync(
	'dist/index.ts',
	`import type { Publication } from '@openbible/core';
/** Berean Standard Bible */
export default ${JSON.stringify(publication, null, 2)} as Publication;
`,
);
