import { Builder, type SourceMap, types } from "@nerd-bible/schema";
import { Leaf, Mark, Plot } from "wordgard/doc";
import type { Doc } from "@nerd-bible/schema";

const newId = () => crypto.randomUUID();
const bookLayers = [
	"paragraphs",
	"headings",
	"chapters",
	"title",
	"verses",
	"notes",
] as const;
const sourceLayers = ["verses", "chapters", "paragraphs"] as const;

/// handles building multiple structures per-Bible book
export class MultiBuilder {
	book: Builder<(typeof bookLayers)[number]>;
	bookLayer?: string;
	source: Builder<(typeof sourceLayers)[number]>;
	sourceMap: SourceMap;

	constructor(
		book: string,
		lang: string,
		published: Date,
		sourceLang: string,
		opts?: { title?: string; sourceTitle?: string },
	) {
		this.book = new Builder(
			types.bookSchema,
			{
				id: newId(),
				title: opts?.title,
				lang,
				published,
				book,
			},
			bookLayers,
		);
		this.source = new Builder(
			types.noteSchema,
			{
				id: newId(),
				title: opts?.sourceTitle,
				lang: sourceLang,
				published,
				book,
			},
			sourceLayers,
		);
		this.sourceMap = {
			type: "sourceMap",
			schema: 1,
			fromId: this.source.meta.id,
			fromPos: [],
			fromLen: [],
			toId: this.book.meta.id,
			toPos: [],
			toLen: [],
		};

		if (opts?.title) this.pushHeading(1, opts.title);
		if (opts?.sourceTitle) this.pushHeading(1, opts.sourceTitle);
	}

	pushVerse(vnum: string, source = false) {
		const num = types.book.VerseNum.create([Leaf.text(vnum)]);
		(source ? this.source : this.book).layers.verses.push(num);
	}

	pushChapter(num: string) {
		const cnum = types.book.Heading.of(2).create([Leaf.text(num)]);
		this.book.layers.chapters.push(cnum);
		this.source.layers.chapters.push(cnum);
	}

	pushPara(class_: string, source: boolean = false) {
		const builder = source ? this.source : this.book;
		if (
			builder.lastInsert.type == types.book.Paragraph &&
			builder.lastInsert.length == 2
		) {
			(builder.lastInsert.tag as any).param = class_;
		} else {
			builder.layers.paragraphs.push(Plot.End, types.book.Paragraph.of(class_));
		}
		// assume headings and footnotes don't have paragraphs
		this.bookLayer = undefined;
	}

	pushLineBreak() {
		this.book.layers.paragraphs.push(types.book.LineBreak);
	}

	pushHeading(level: number, text: string, marks?: Mark.Set) {
		const heading = types.book.Heading.of(level).create(
			text ? [Leaf.text(text, marks)] : [],
		);
		if (level == 1) this.book.layers.title.push(Plot.End, heading);
		else this.book.layers.headings.push(Plot.End, heading);
	}

	pushBreak(class_: string = "") {
		this.source.push(types.book.Break.of(class_));
	}

	pushNoteAtom(b: Builder<any>) {
		this.book.layers.notes.push(
			types.book.NoteAtom.of({
				tags: [],
				note: b.finish().content,
			}),
		);
	}

	maybePushSpace(text: string) {
		const prevCanSpace =
			this.book.lastInsert.isText &&
			!/[\p{Pc}|\p{Pd}|\p{Ps}|\p{Pi}]$/u.test(
				this.book.lastInsert.param as string,
			);
		const curCanSpace = !/^[\p{Pc}\p{Po}.]/u.test(text);
		if (prevCanSpace && curCanSpace) {
			// if there was a block insertion here, make it replace this space
			for (const l of bookLayers) {
				const lastChange = this.book.layers[l].changes.at(-1);
				if (lastChange?.insert[0]?.isPlot && lastChange.from == this.book.pos)
					lastChange.to = lastChange.from + 1;
			}
			this.book.push(" ");
		}
	}

	pushText(
		text: string,
		smoothingLevel?: number,
		source?: { pos: number; length: number },
	) {
		const { pos } = this.book;
		const marks = smoothingLevel ? [types.book.Smooth.of(smoothingLevel)] : [];
		const length = this.book.push(Leaf.text(text, marks));

		if (source) {
			this.sourceMap.fromPos.push(source.pos);
			this.sourceMap.fromLen.push(source.length);
			this.sourceMap.toPos.push(pos);
			this.sourceMap.toLen.push(length);
		}
	}

	isEmpty() {
		return this.book.isEmpty();
	}

	finish(): Doc[] {
		return [this.book.finish(), this.source.finish(), this.sourceMap];
	}
}
