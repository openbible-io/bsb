import {
	type Ast,
	canonicalize,
	renderers,
	type TextNode,
	usfm,
} from "@openbible/bconv";
import * as path from "@std/path";
import { walk } from "@std/fs/walk";
import { render as preactRender } from "preact-render-to-string";
import Page from "./Page.tsx";
import Publication from "./Publication.tsx";
import publication from "../bsb/index.ts";

for await (const dirEntry of walk("public")) {
	const newPath = dirEntry.path.replace("public", "dist");
	if (dirEntry.isDirectory) Deno.mkdirSync(newPath, { recursive: true });
	else Deno.copyFileSync(dirEntry.path, newPath);
}

function writePage(fname: string, title: string, html: string) {
	const page = "<!doctype html>" + preactRender(
		<Page title={title}>
			<main dangerouslySetInnerHTML={{ __html: html }} />
		</Page>,
	);
	Deno.writeTextFileSync(fname, page, { create: true });
}

function writeAst(
	book: string,
	chapter: string,
	ast: Ast,
): string {
	let html = "";
	const renderer = new renderers.Html((s) =>
		html += s.replace(
			"</h2>",
			`</h2>${
				Object.keys(publication.audio ?? [])
					.map((v) => `/${v}/${book.toLowerCase()}/${chapter}.webm`)
					.map((href) => `<audio controls src="${href}"></audio>`)
					.join("")
			}`,
		)
	);
	renderer.render(ast);

	return html;
}

const all: Ast = [];
const usfmDir = "bsb/bsb_usfm";
// Order has to be fixed to render `all.html`.
const files = [...Deno.readDirSync(usfmDir)]
.filter(f => f.name.includes("GEN"))
.sort((f, f2) => f.name.localeCompare(f2.name));

for (const f of files) {
	if (f.isDirectory) continue;

	const text = Deno.readTextFileSync(path.join(usfmDir, f.name));
	const ast = canonicalize(usfm.parseAndPrintErrors(text));
	all.push(...ast);

	const title = ast.find((n) => "tag" in n && n.tag == "h1") as TextNode;
	const id = ast.find((n) => "book" in n);
	if (!id) throw Error("USFM file missing id: " + f.name);
	if (!title) throw Error("USFM file missing title: " + f.name);

	const dir = path.join("dist", id.book.toLowerCase());
	Deno.mkdirSync(dir, { recursive: true });

	let bookHtml = "";
	let chapter: Ast = [];
	let maxChapter = 1;

	for (let i = 0; i < ast.length; i++) {
		const n = ast[i];
		const isNextChapter  = "chapter" in n && n.chapter > 1;

		if (!isNextChapter) chapter.push(n);

		if (i == ast.length - 1 || isNextChapter) {
			console.log(i, chapter);
			const chapterN = chapter.find(n => 'chapter' in n)!.chapter;
			if (chapterN > maxChapter) maxChapter = chapterN;

			const chapFmt = chapterN.toString().padStart(3, "0");
			const fname = path.join(dir, `${chapFmt}.html`);
			let chapterHtml = writeAst(id.book, chapFmt, chapter);
			bookHtml += chapterHtml;

			chapterHtml += `<div class="lrNav">
<div>
${
				chapterN > 1
					? `<a href="${
						(chapterN - 1).toString().padStart(3, "0")
					}.html">←</a>`
					: ""
			}
</div>
<div>
${
				chapterN < publication.toc[id.book.toLowerCase()].nChapters
					? `<a href="${
						(chapterN + 1).toString().padStart(3, "0")
					}.html">→</a>`
					: ""
			}
</div>
</div>`;

			writePage(fname, `${title.text} ${chapterN}`, chapterHtml);
			chapter = [n];
		}
	}

	writePage(path.join(dir, "all.html"), title.text, bookHtml);

	const bookPage = preactRender(
		<Page title={title.text}>
			<nav>
				<h1>{title.text}</h1>
				<h2>Chapters</h2>
				<ul>
					<li>
						<a href="all.html">All</a>
					</li>
					{[...Array(maxChapter).keys()].map((i) => i + 1).map((c) => (
						<li>
							<a href={`${c.toString().padStart(3, "0")}.html`}>{c}</a>
						</li>
					))}
				</ul>
			</nav>
		</Page>,
	);
	Deno.writeTextFileSync(path.join(dir, "index.html"), bookPage, {
		create: true,
	});
}

{
	let html = '<html><head><meta charset="utf-8"/></head><body>';
	const renderer = new renderers.Html((s) => html += s);
	renderer.render(all);
	html += "</body></html>";
	Deno.writeTextFileSync(path.join("dist", "all.html"), html, { create: true });
	publication.size = new TextEncoder().encode(html).length;
}

const indexPage = preactRender(
	<Page title="Preface">
		<Publication />
	</Page>,
);
Deno.writeTextFileSync(path.join("dist", "index.html"), indexPage, {
	create: true,
});
Deno.writeTextFileSync(
	path.join("dist", "index.json"),
	JSON.stringify(publication),
	{ create: true },
);
Deno.writeTextFileSync(
	path.join("dist", "index.ts"),
	`import type { Publication } from "@openbible/core";

/** Publication metadata. */
export default ${JSON.stringify(publication, null, 2)} as Publication;
`,
	{ create: true },
);

const notFoundPage = preactRender(<Page title="Not found">404</Page>);
Deno.writeTextFileSync(path.join("dist", "404.html"), notFoundPage, {
	create: true,
});
console.log("generated html, css, json, and ts");
