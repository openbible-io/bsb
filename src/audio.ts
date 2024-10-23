import type { books } from '@openbible/core';
import { copy, readerFromStreamReader } from '@std/io';
import { dirname } from 'node:path';
import pub, { audio } from '../bsb/index.ts';

type Version = keyof typeof audio;
const outdir = 'dist';

function padStart(n: number, width: number) {
	return n.toString().padStart(width, '0');
}

function titleCase(s: string) {
	if (s[0] >= '0' && s[0] <= '9') {
		return s[0] + s[1].toUpperCase() + s.substring(2);
	}
	return s[0].toUpperCase() + s.substring(1);
}

const mirrors = {
	'https://openbible.com': (v: Version, book: books.Book, chapter: number) => {
		let res = `/audio/${v}/BSB_`;
		const i = Object.keys(pub.toc).indexOf(book);
		if (book == 'tit') book = 'tts' as 'tit';
		res += `${padStart(i + 1, 2)}_${titleCase(book)}_${padStart(chapter, 3)}`;
		if (v != 'souer') res += `_${v[0].toUpperCase()}`;
		res += '.mp3';
		return res;
	},
	// Reencoded and slightly smaller filesizes.
	// Currently missing `gilbert`
	'https://tim.z73.com': (v: Version, book: books.Book, chapter: number) => {
		let res = `/${v}/audio/${titleCase(book)}`;
		res += padStart(chapter, book == 'psa' ? 3 : 2);
		res += '.mp3';
		return res;
	},
} as const;

async function download(mirror: keyof typeof mirrors, version: Version) {
	for (const e of Object.entries(pub.toc)) {
		const [book, { nChapters }] = e;
		for (let i = 0; i < nChapters; i++) {
			const chapter = i + 1;
			const url = mirror +
				mirrors[mirror](version as 'souer', book as books.Book, chapter);
			const fname = `${outdir}/${book}/${padStart(chapter, 3)}_${version}.mp3`;
			console.log(url, '->', fname);

			const resp = await fetch(url);
			if (!resp.ok) throw Error(`${resp.status} downloading ${url}`);
			const rdr = resp.body?.getReader();
			if (!rdr) throw Error('no response body ' + url);
			const r = readerFromStreamReader(rdr);

			await Deno.mkdir(dirname(fname), { recursive: true });
			const f = await Deno.open(fname, { create: true, write: true });
			await copy(r, f);
			f.close();
		}
	}
}

const version = Deno.args[0];
if (!(version in audio)) throw Error(`Expected "${version ?? ''}" to be in ${Object.keys(audio).join(', ')}`);

await download('https://openbible.com', version as Version);
console.log('downloaded audio');
