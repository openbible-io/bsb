import { Wordgard } from "wordgard/editor";
import { history } from "wordgard/history";
import { type Doc, types } from "@nerd-bible/schema";
import { GardState } from "wordgard/state";

import idk from "../dist/gen/eng.nb?raw";
import { ChangeSet } from "wordgard/doc";

const doc: Doc = JSON.parse(idk);
const parent = document.getElementById("editor")!;

if (doc.type != "richText") throw Error("expected richText");

const ltr = doc.meta.lang != "hbo";
if (!ltr) parent.dir = "rtl";

const wgDoc = types.bookSchema.docFromJSON(doc.content as any);

let csAll = ChangeSet.empty(wgDoc.length);
for (const l in doc.layers) {
	console.log(l);
	const cs = ChangeSet.fromJSON(wgDoc.schema, doc.layers[l]);
	csAll = csAll.compose(cs.transform(wgDoc, csAll));
}

console.log(csAll.toJSON());

// let csLayered;
// for (const l of doc.layers) {
// 	const cs = ChangeSet.fromJSON(wgDoc.schema, l.changeset);
// 	console.log(l.name);
// 	csLayered = csLayered ? cs.transform(wgDoc, csLayered, true) : cs;
// }

Wordgard.create({
	parent,
	doc: csAll.apply(wgDoc),
	// doc: wgDocLayered,
	config: [
		history(),
		types.bookSchema.elements.map((e) => GardState.schemaElement.of(e)),
		GardState.textLTR.of(ltr),
		Wordgard.styles({
			"span.whitespace.ס": {
				"&::before": { content: "'        '" },
			},
		}),
	],
});
