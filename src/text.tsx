import {
	type Ast,
	canonicalize,
	render,
	type TextNode,
	usfm,
} from '@openbible/bconv';
import * as path from '@std/path';
import { walk } from '@std/fs/walk';
import { render as preactRender } from 'preact-render-to-string';
import Page from './Page.tsx';
import Publication from './Publication.tsx';
import publication from './publication.ts';

for await (const dirEntry of walk('public')) {
	const newPath = dirEntry.path.replace('public', 'dist');
	if (dirEntry.isDirectory) Deno.mkdirSync(newPath, { recursive: true });
	else Deno.copyFileSync(dirEntry.path, newPath);
}

function writeHtml(fname: string, title: string, html: string) {
	const page = '<!DOCTYPE html>' + preactRender(
		<Page title={title}>
			<div dangerouslySetInnerHTML={{ __html: html }} />
		</Page>,
	);
	Deno.writeTextFileSync(fname, page, { create: true });
}

function writeAst(
	fname: string,
	title: string,
	ast: Ast,
	replaceFn = (s: string) => s,
) {
	let html = '';
	render.html(ast, (s: string) => html += replaceFn(s));
	writeHtml(fname, title, html);
}

for (const f of Deno.readDirSync('bsb_usfm')) {
	if (f.isDirectory) continue;

	const text = Deno.readTextFileSync(path.join('bsb_usfm', f.name));
	const ast = canonicalize(usfm.parseAndPrintErrors(text));

	const title = ast.find((n) => 'tag' in n && n.tag == 'h1') as TextNode;
	const id = ast.find((n) => 'book' in n);
	if (!id) throw Error('USFM file missing id: ' + f.name);
	if (!title) throw Error('USFM file missing title: ' + f.name);

	const dir = path.join('dist', id.book.toLowerCase());
	Deno.mkdirSync(dir, { recursive: true });

	let chapter: Ast = [];
	let chapterN: number | undefined;
	for (let i = 0; i < ast.length; i++) {
		const n = ast[i];
		const flushChapter = (i == ast.length - 1 || 'chapter' in n) && chapterN;
		if ('chapter' in n) chapterN = n.chapter;
		if (!chapterN) continue;

		if (i == ast.length - 1) chapter.push(n);

		if (flushChapter) {
			const chapFmt = flushChapter.toString().padStart(3, '0');
			const fname = path.join(dir, `${chapFmt}.html`);
			writeAst(
				fname,
				`${title.text} ${flushChapter}`,
				chapter,
				(s) =>
					s.replace(
						'</h2>',
						`<audio controls src="${chapFmt}_souer.mp3"></h2>`,
					),
			);
			chapter = [title];
		}

		chapter.push(n);
	}

	writeAst(path.join(dir, 'all.html'), title.text, ast);

	const bookPage = preactRender(
		<Page title={title.text}>
			<nav>
				<h1>{title.text}</h1>
				<h2>Chapters</h2>
				<ul>
					{[...Array(chapterN).keys()].map((i) => i + 1).map((c) => (
						<li>
							<a href={`${c.toString().padStart(3, '0')}.html`}>{c}</a>
						</li>
					))}
					<li>
						<a href='all.html'>All</a>
					</li>
				</ul>
			</nav>
		</Page>,
	);
	Deno.writeTextFileSync(path.join(dir, 'index.html'), bookPage, {
		create: true,
	});
}

const indexPage = preactRender(
	<Page>
		<Publication />
	</Page>,
);
Deno.writeTextFileSync(path.join('dist', 'index.html'), indexPage, {
	create: true,
});
Deno.writeTextFileSync(
	path.join('dist', 'index.json'),
	JSON.stringify(publication),
	{ create: true },
);
