import { GardState, GardSelection } from "wordgard/state";
import { types } from "@nerd-bible/schema";
import { KeyBinding, Tooltip, Wordgard } from "wordgard/editor";
import { Leaf } from "wordgard/doc";
import { Command, undo, redo } from "wordgard/command";

type NoteNode = Leaf<types.note.Note>;

function getNote(state: GardState): NoteNode | undefined {
	if (
		state.selection instanceof GardSelection.Node &&
		state.selection.node.type == types.book.NoteAtom
	)
		return state.selection.node as NoteNode;
}

const tooltip = Tooltip.show.derive((state) => {
	const note = getNote(state);
	console.log(note);
	return note
		? {
				pos: state.selection.from,
				create: NoteTooltip.create,
				above: false,
			}
		: null;
});

function enterNote(wg: Wordgard) {
	if (!getNote(wg.state)) return false;
	let tooltip = Tooltip.get(wg, NoteTooltip.create);
	if (!tooltip) return false;
	wg.dispatch({ selection: { anchor: wg.state.selection.from } });
	tooltip.inner.focus();
	return true;
}

function exitNote(wg: Wordgard) {
	const note = getNote(wg.state);
	if (!note) return false;
	let selection = GardSelection.node(wg.state.selection.from, note);
	if (!wg.state.selection.eq(selection)) wg.dispatch({ selection });
	wg.focus();
	return true;
}

class NoteTooltip implements Tooltip.View {
	dom: HTMLElement;
	inner: Wordgard;

	constructor(wg: Wordgard, note: NoteNode) {
		this.dom = document.createElement("wg-note-tooltip");
		this.inner = this.initEditor(wg, note);
	}

	initEditor(wg: Wordgard, note: NoteNode) {
		let config = GardState.Configuration.create([
			GardState.prec.high([
				KeyBinding.of({ key: "Escape", run: () => exitNote(wg) }),
				KeyBinding.of({ key: "Enter", run: () => exitNote(wg) }),
			]),
			Command.handler(undo, () => Command.dispatch(wg, undo)),
			Command.handler(redo, () => Command.dispatch(wg, redo)),
		]);
		console.log("huh", note.param.note);

		return Wordgard.create({
			doc: types.noteSchema.docFromJSON(note.param.note),
			config,
			parent: this.dom,
		});
	}

	static create(wg: Wordgard) {
		return new NoteTooltip(wg, getNote(wg.state)!);
	}

	update(update: Wordgard.Update) {
		const newFootnote = getNote(update.state)!;
		if (!newFootnote.eq(this.inner.state.doc)) {
			this.inner.dom.remove();
			this.inner = this.initEditor(update.editor, newFootnote);
		}
	}
}
export function note() {
	return [
		Wordgard.styles({
			".note-atom": {
				border: "1px solid #0ae",
				borderRadius: "4px",
				"&::before": {
					content: "'n'",
				},
			},
		}),
		tooltip,
		GardState.prec.high(KeyBinding.of({ key: "Enter", run: enterNote })),
	];
}
