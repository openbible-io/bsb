import type { Audio, Author, Publication, Toc } from '@openbible/core';

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

const toc: Toc = {
	'gen': {
		'name': 'Genesis',
		'nChapters': 50,
	},
	'exo': {
		'name': 'Exodus',
		'nChapters': 40,
	},
	'lev': {
		'name': 'Leviticus',
		'nChapters': 27,
	},
	'num': {
		'name': 'Numbers',
		'nChapters': 36,
	},
	'deu': {
		'name': 'Deuteronomy',
		'nChapters': 34,
	},
	'jos': {
		'name': 'Joshua',
		'nChapters': 24,
	},
	'jdg': {
		'name': 'Judges',
		'nChapters': 21,
	},
	'rut': {
		'name': 'Ruth',
		'nChapters': 4,
	},
	'1sa': {
		'name': '1 Samuel',
		'nChapters': 31,
	},
	'2sa': {
		'name': '2 Samuel',
		'nChapters': 24,
	},
	'1ki': {
		'name': '1 Kings',
		'nChapters': 22,
	},
	'2ki': {
		'name': '2 Kings',
		'nChapters': 25,
	},
	'1ch': {
		'name': '1 Chronicles',
		'nChapters': 29,
	},
	'2ch': {
		'name': '2 Chronicles',
		'nChapters': 36,
	},
	'ezr': {
		'name': 'Ezra',
		'nChapters': 10,
	},
	'neh': {
		'name': 'Nehemiah',
		'nChapters': 13,
	},
	'est': {
		'name': 'Esther',
		'nChapters': 10,
	},
	'job': {
		'name': 'Job',
		'nChapters': 42,
	},
	'psa': {
		'name': 'Psalm',
		'nChapters': 150,
	},
	'pro': {
		'name': 'Proverbs',
		'nChapters': 31,
	},
	'ecc': {
		'name': 'Ecclesiastes',
		'nChapters': 12,
	},
	'sng': {
		'name': 'Song',
		'nChapters': 8,
	},
	'isa': {
		'name': 'Isaiah',
		'nChapters': 66,
	},
	'jer': {
		'name': 'Jeremiah',
		'nChapters': 52,
	},
	'lam': {
		'name': 'Lamentations',
		'nChapters': 5,
	},
	'ezk': {
		'name': 'Ezekiel',
		'nChapters': 48,
	},
	'dan': {
		'name': 'Daniel',
		'nChapters': 12,
	},
	'hos': {
		'name': 'Hosea',
		'nChapters': 14,
	},
	'jol': {
		'name': 'Joel',
		'nChapters': 3,
	},
	'amo': {
		'name': 'Amos',
		'nChapters': 9,
	},
	'oba': {
		'name': 'Obadiah',
		'nChapters': 1,
	},
	'jon': {
		'name': 'Jonah',
		'nChapters': 4,
	},
	'mic': {
		'name': 'Micah',
		'nChapters': 7,
	},
	'nam': {
		'name': 'Nahum',
		'nChapters': 3,
	},
	'hab': {
		'name': 'Habakkuk',
		'nChapters': 3,
	},
	'zep': {
		'name': 'Zephaniah',
		'nChapters': 3,
	},
	'hag': {
		'name': 'Haggai',
		'nChapters': 2,
	},
	'zec': {
		'name': 'Zechariah',
		'nChapters': 14,
	},
	'mal': {
		'name': 'Malachi',
		'nChapters': 4,
	},
	'mat': {
		'name': 'Matthew',
		'nChapters': 28,
	},
	'mrk': {
		'name': 'Mark',
		'nChapters': 16,
	},
	'luk': {
		'name': 'Luke',
		'nChapters': 24,
	},
	'jhn': {
		'name': 'John',
		'nChapters': 21,
	},
	'act': {
		'name': 'Acts',
		'nChapters': 28,
	},
	'rom': {
		'name': 'Romans',
		'nChapters': 16,
	},
	'1co': {
		'name': '1 Corinthians',
		'nChapters': 16,
	},
	'2co': {
		'name': '2 Corinthians',
		'nChapters': 13,
	},
	'gal': {
		'name': 'Galatians',
		'nChapters': 6,
	},
	'eph': {
		'name': 'Ephesians',
		'nChapters': 6,
	},
	'php': {
		'name': 'Philippians',
		'nChapters': 4,
	},
	'col': {
		'name': 'Colossians',
		'nChapters': 4,
	},
	'1th': {
		'name': '1 Thessalonians',
		'nChapters': 5,
	},
	'2th': {
		'name': '2 Thessalonians',
		'nChapters': 3,
	},
	'1ti': {
		'name': '1 Timothy',
		'nChapters': 6,
	},
	'2ti': {
		'name': '2 Timothy',
		'nChapters': 4,
	},
	'tit': {
		'name': 'Titus',
		'nChapters': 3,
	},
	'phm': {
		'name': 'Philemon',
		'nChapters': 1,
	},
	'heb': {
		'name': 'Hebrews',
		'nChapters': 13,
	},
	'jas': {
		'name': 'James',
		'nChapters': 5,
	},
	'1pe': {
		'name': '1 Peter',
		'nChapters': 5,
	},
	'2pe': {
		'name': '2 Peter',
		'nChapters': 3,
	},
	'1jn': {
		'name': '1 John',
		'nChapters': 5,
	},
	'2jn': {
		'name': '2 John',
		'nChapters': 1,
	},
	'3jn': {
		'name': '3 John',
		'nChapters': 1,
	},
	'jud': {
		'name': 'Jude',
		'nChapters': 1,
	},
	'rev': {
		'name': 'Revelation',
		'nChapters': 22,
	},
};

/** Export to maintain typeof keys */
export const audio = {
	souer: {
		downloadUrl: 'https://openbible.com/audio/souer/',
		license: 'CC0-1.0',
		licenseUrl:
			'https://openbible.com/audio/souer/BSB_00_License_CC0_Public_Domain.txt',
		authors: [{
			name: 'Bob Souer',
			url: 'https://bobsouer.com/',
		}],
		publisher: 'Bible Hub',
		publisherUrl: 'https://biblehub.com/',
		publishDate: '2023-08-25',
		// find dist/souer -type f -exec \
		//	ffprobe -v error -show_entries format=duration \
		// 	-of default=noprint_wrappers=1:nokey=1 {} \; \
		// 	| awk 'BEGIN { sum=0 } { sum+=$1 } END {print sum }'
		runtime: 249190,
	} as Audio,
	hays: {
		downloadUrl: 'https://openbible.com/audio/hays/',
		license: 'CC0-1.0',
		licenseUrl: 'https://audiobible.org/',
		authors: [{
			name: 'Barry Hays',
			url: 'https://openbible.com/audio/hays/',
		}],
		publisher: 'Bible Hub',
		publisherUrl: 'https://biblehub.com/',
		publishDate: '2022-10-07',
		runtime: 307301,
	} as Audio,
	gilbert: {
		downloadUrl: 'https://openbible.com/audio/gilbert/',
		license: 'CC0-1.0',
		licenseUrl: 'https://audiobible.org/',
		authors: [{
			name: 'Jordan Gilbert',
			url: 'https://jordanscottgilbert.com/',
		}],
		publisher: 'Bible Hub',
		publisherUrl: 'https://biblehub.com/',
		publishDate: '2022-09-24',
		runtime: 258752,
	} as Audio,
};

const preface = `
<ob-q ref="Acts 17:11"></ob-q>

<p>
	The Berean Standard Bible (BSB) is a freely shareable translation of the Holy
	Bible, effective for public reading, study, memorization, and evangelism.
	Based on the best available manuscripts and sources, each word is connected
	back to the Greek or Hebrew text to produce a transparent text that can be
	studied for its root meanings.
</p>

<p>
	The BSB represents a single tier of the Berean Bible. This printing contains
	the full BSB text, footnotes, section headings, and cross references.
	Additional components, including translation tables, lexicons, outlines, and
	summaries, are free online and in a variety of apps and software.
</p>

<p>
	The Berean Bible Translation Committee has employed an open process where
	translation tables are freely available and all comments are welcomed and
	considered. These sources may also be downloaded and shared freely. Please see
	the
	<a
		href="https://bereanbibles.com/about-berean-study-bible/translation-process/"
	>Berean Bible website</a>
	for a full description of the translation committee and process.
</p>

<p>
	We pray that this text will enable readers to connect with God’s Word to study
	it, memorize it, share it, and proclaim it. We are inspired by the model of
	the early Christian church:
</p>

<ob-q ref="Colossians 4:16"></ob-q>

<p>
	The Scriptures belonged to the churches and were meant to be examined, copied,
	and distributed. The committee hopes to follow this example by sharing all the
	resources with which we have been entrusted.
</p>

<p>
	Just as Paul encouraged the churches to pass on his letters, the Berean Bible
	is intended to be offered freely in websites, apps, software, and various text
	and audio formats.
</p>
`;

/** Publication metadata */
export default {
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
	preface,
	toc,
	audio,
} as Publication;
