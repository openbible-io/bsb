import { join } from "node:path";
import { open } from "node:fs/promises";
import { downloadDir, fname } from "../download.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { books, shortcode } from "./book.ts";
import canonicalize from "canonicalize";
import type { Doc, meta, SourceMap } from "@nerd-bible/schema";

const tsvPath = join(downloadDir, fname);
const file = await open(tsvPath);

for await (const b of books(file)) {
	writeFs(b.finish());
}

function getDocName(meta: meta.Meta) {
	switch (meta.type) {
		case "book":
			return meta.book + ".nb";
		case "note":
			return meta.title + ".nb";
	}
}

function writeFs(docs: (Doc | SourceMap)[]) {
	const dir = "dist";
	mkdirSync(dir, { recursive: true });

	for (const d of docs) {
		let fname;
		switch (d.type) {
			case "doc":
				fname = getDocName(d.meta);
				break;
			case "sourcemap":
				const target = docs.find(
					(d2) => d2.type == "doc" && d2.meta.id == d.target,
				) as Doc | undefined;
				if (!target) {
					console.error("sourcemap has invalid target", d.target);
					continue;
				}
				fname = getDocName(target.meta);
				break;
		}

		writeFileSync(join(dir, fname), canonicalize(d) as string);
	}
}
