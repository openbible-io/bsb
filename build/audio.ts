import type { books } from '@openbible/core';
import { copy, readerFromStreamReader } from '@std/io';
import { dirname } from 'node:path';
import pub, { audio } from '../bsb/index.ts';
import { parseArgs } from "jsr:@std/cli/parse-args";

type Version = keyof typeof audio;
const outdir = 'dist';
const dateRe = /\d{4}-\d{2}-\d{2}/g;

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
	'https://openbible.com': (v: Version, book?: books.Book, chapter?: number) => {
		let res = `/audio/${v}`;
		if (!book) return res;

		res += '/BSB_'
		const i = Object.keys(pub.toc).indexOf(book);
		if (book == 'tit') book = 'tts' as 'tit';
		if (!chapter) return res;
		res += `${padStart(i + 1, 2)}_${titleCase(book)}_${padStart(chapter, 3)}`;
		if (v != 'souer') res += `_${v[0].toUpperCase()}`;
		res += '.mp3';
		return res;
	},
	// Reencoded and slightly smaller filesizes.
	// Currently missing `gilbert`
	'https://tim.z73.com': (v: Version, book?: books.Book, chapter?: number) => {
		let res = `/${v}/audio`;
		if (!book) return res;

		res += `/${titleCase(book)}`;
		if (!chapter) return res;
		res += padStart(chapter, book == 'psa' ? 3 : 2);
		res += '.mp3';
		return res;
	},
} as const;

async function download(mirror: keyof typeof mirrors, version: Version, since?: string) {
	// if there's a since new version, will redownload ALL
	if (since) {
		const url = mirror + mirrors[mirror](version);
		const resp = await fetch(url);
		if (!resp.ok) throw Error(`${resp.status} downloading ${url}`);
		const text = await resp.text();
		let lastUpdated = '1990-01-01';
		for (const m of text.matchAll(dateRe)) {
			if (m[0] > lastUpdated) lastUpdated = m[0];
		}
		console.log(url, 'last updated', lastUpdated);
		if (lastUpdated < since) return;
	}
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

const flags = parseArgs(Deno.args, {
	string: ["mirror", "since"],
	default: {
		mirror: 'https://openbible.com',
	},
});

if (flags.since && !flags.since.match(dateRe)) {
	throw Error(`Expected ${flags.since} to match date format ${dateRe}`);
}

const versions = flags._.filter(Boolean);
if (versions.length == 0) versions.push('souer', 'hays', 'gilbert');
console.log('downloading', versions, 'since', flags.since);

for (const version of versions) {
	if (!(version in audio)) {
		throw Error(`Expected "${version ?? ''}" to be in ${Object.keys(audio).join(', ')}`);
	}
	if (!(flags.mirror in mirrors)) {
		throw Error(`Expected "${flags.mirror ?? ''}" to be in ${Object.keys(mirrors).join(', ')}`);
	}

	await download(flags.mirror as keyof typeof mirrors, version as Version, flags.since);
}
console.log('downloaded audio');
