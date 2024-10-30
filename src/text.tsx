import {
	type Ast,
	canonicalize,
	render,
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

function writeHtml(fname: string, title: string, html: string) {
	const page = "<!DOCTYPE html>" + preactRender(
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
	let html = "";
	render.html(ast, (s: string) => html += replaceFn(s));
	writeHtml(fname, title, html);
}

const all: Ast = [];
const usfmDir = "bsb/bsb_usfm";
// Order has to be fixed to render `all.html`.
const files = [...Deno.readDirSync(usfmDir)].sort((f, f2) =>
	f.name.localeCompare(f2.name)
);

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

	let chapter: Ast = [];
	let chapterN: number | undefined;
	for (let i = 0; i < ast.length; i++) {
		const n = ast[i];
		const flushChapter = (i == ast.length - 1 || "chapter" in n) && chapterN;
		if ("chapter" in n) chapterN = n.chapter;
		if (!chapterN) continue;

		if (i == ast.length - 1) chapter.push(n);

		if (flushChapter) {
			const chapFmt = flushChapter.toString().padStart(3, "0");
			const fname = path.join(dir, `${chapFmt}.html`);
			const replacer = (s: string) =>
				s.replace(
					"</h2>",
					`</h2>${
						Object.keys(publication.audio ?? [])
							.map((v) => `/${v}/${id.book.toLowerCase()}/${chapFmt}.webm`)
							.map((href) => `<audio controls src="${href}"></audio>`)
							.join("")
					}`,
				);
			writeAst(fname, `${title.text} ${flushChapter}`, chapter, replacer);
			chapter = [title];
		}

		chapter.push(n);
	}

	writeAst(path.join(dir, "all.html"), title.text, ast);

	const bookPage = preactRender(
		<Page title={title.text}>
			<nav>
				<h1>{title.text}</h1>
				<h2>Chapters</h2>
				<ul>
					<li>
						<a href="all">All</a>
					</li>
					{[...Array(chapterN).keys()].map((i) => i + 1).map((c) => (
						<li>
							<a href={c.toString().padStart(3, "0")}>{c}</a>
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
	render.html(all, (s: string) => html += s);
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
