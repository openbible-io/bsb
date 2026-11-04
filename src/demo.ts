import { Wordgard } from "wordgard/editor";
import { history } from "wordgard/history";
import {
	book as schemaBook,
	note as schemaNote,
	type Doc,
} from "@nerd-bible/schema";
import { GardState } from "wordgard/state";

import idk from "../dist/gen/hbo.nb?raw";

const doc: Doc = JSON.parse(idk);
const parent = document.getElementById("editor")!;

const ltr = doc.meta.lang != "hbo";
if (!ltr) parent.dir = "rtl";

const wg = Wordgard.create({
	parent,
	doc: doc.doc,
	config: [
		history(),
		...schemaBook.schema.map((s) => GardState.schemaElement.of(s)),
		GardState.textLTR.of(ltr),
		Wordgard.styles({
			"span.whitespace.ס": {
				"&::before": { content: "'        '" },
			},
		}),
	],
});
