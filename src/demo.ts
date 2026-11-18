import { Wordgard } from "wordgard/editor";
import { history } from "wordgard/history";
import { type richText, types } from "@nerd-bible/schema";
import { GardState } from "wordgard/state";
import idk from "../dist/gen/eng.nb?raw";
import { ChangeSet } from "wordgard/doc";
import { note } from "./note.ts";

const doc: richText.RichText = JSON.parse(idk);
const parent = document.getElementById("editor")!;

if (doc.type != "richText") throw Error("expected richText");

const ltr = doc.meta.lang != "hbo";
if (!ltr) parent.dir = "rtl";

const docBase = types.bookSchema.docFromJSON(doc.content as richText.WgNode);

const activeLayers = new Set();
for (const l in doc.layers) {
	const label = document.createElement("label");
	const control = label.appendChild(document.createElement("input"));
	label.append(l);
	control.type = "checkbox";
	control.addEventListener("change", (ev) => {
		if ((ev.currentTarget as HTMLInputElement).checked) activeLayers.add(l);
		else activeLayers.delete(l);

		const csAll = buildCsAll();
		const newDoc = csAll.apply(docBase);
		const tr = wg.state.update({
			changes: [{ from: 0, to: wg.state.doc.length, insert: newDoc.content }],
		});
		wg.dispatch(tr);
	});
	document.body.append(label);
}

function buildCsAll() {
	let csAll = ChangeSet.empty(docBase.length);
	for (const l in doc.layers) {
		if (!activeLayers.has(l)) continue;
		const cs = ChangeSet.fromJSON(
			docBase.schema,
			doc.layers[l] as richText.WgChangeSet,
		);
		const transformed = cs.transform(docBase, csAll ,true);
		csAll = csAll.compose(transformed);
	}
	return csAll;
}

const wg = Wordgard.create({
	parent: document.body.appendChild(document.createElement("div")),
	doc: docBase,
	// doc: wgDocLayered,
	config: [
		history(),
		GardState.textLTR.of(ltr),
		Wordgard.styles({
			"span.whitespace.ס": {
				"&::before": { content: "'        '" },
			},
		}),
		note(),
	],
});
