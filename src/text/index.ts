import { dirname, join } from "node:path";
import { open } from "node:fs/promises";
import { downloadDir, fname } from "../download.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { books } from "./book.ts";
import type { Doc, richText } from "@nerd-bible/schema";

const tsvPath = join(downloadDir, fname);
const file = await open(tsvPath);

for await (const mb of books(file)) {
	writeFs(mb.book.meta.book as string, mb.finish());
}

function getDocName(meta: richText.Meta) {
	return meta.lang;
}

function writeFs(book: string, docs: Doc[]) {
	const dir = join("dist", book);

	for (const d of docs) {
		let fname;
		switch (d.type) {
			case "richText":
				fname = getDocName(d.meta) + ".nb";
				break;
			case "sourceMap":
				const target = docs.find(
					(d2) => d2.type == "richText" && d2.meta.id == d.toId,
				) as richText.RichText;
				if (!target) {
					console.error("sourcemap has invalid target", d.toId);
					continue;
				}
				fname = getDocName(target.meta) + ".nb.map";
				break;
		}

		const path = join(dir, fname);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, JSON.stringify(d));
		// console.log(path);
	}
}
