import { Builder, type SourceMap, types } from "@nerd-bible/schema";
import { Leaf, Mark, Plot } from "wordgard/doc";
import { GardState } from "wordgard/state";
import type { Doc } from "@nerd-bible/schema";

const bookConfig = Object.values(types.book).map((s) =>
	GardState.schemaElement.of(s),
);
const noteConfig = Object.values(types.note).map((s) =>
	GardState.schemaElement.of(s),
);

const newId = () => crypto.randomUUID();

type AnnotationBuilder = {
	pos: number;
	length: number;
	builder: Builder;
};

/// handles building multiple structures per-Bible book
export class MultiBuilder {
	book: Builder;
	source: Builder;
	sourceMap: SourceMap;
	annotations: AnnotationBuilder[] = [];

	constructor(
		book: string,
		lang: string,
		published: Date,
		sourceLang: string,
		opts?: { title?: string; sourceTitle?: string },
	) {
		this.book = new Builder(bookConfig, {
			id: newId(),
			title: opts?.title,
			lang,
			published,
			book,
		});
		this.source = new Builder(bookConfig, {
			id: newId(),
			title: opts?.sourceTitle,
			lang: sourceLang,
			published,
			book,
		});
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

	pushVerse(num: string) {
		const vnum = types.book.VerseNum.create([Leaf.text(num)]);
		this.book.pushLayer("Verses", vnum);
		this.source.pushLayer("Verses", vnum);
	}

	pushChapter(num: string) {
		const cnum = types.book.Heading.of(2).create([Leaf.text(num)]);
		this.book.pushLayer("Chapters", cnum);
		this.source.pushLayer("Chapters", cnum);
		this.insertedVerses = new Set();
	}

	pushPara(class_: string, source: boolean = false, layer = true) {
		this.book.pushLayer(
			"Paragraphs",
			Plot.End,
			types.book.Paragraph.of(class_),
		);
		if (source) {
			if (layer)
				this.source.pushLayer(
					"Paragraphs",
					Plot.End,
					types.book.Paragraph.of(class_),
				);
			else this.source.push(Plot.End, types.book.Paragraph.of(class_));
		}
	}

	pushLineBreak() {
		this.book.pushLayer("Paragraphs", types.book.LineBreak);
	}

	pushHeading(level: number, text?: string, marks?: Mark.Set) {
		const heading = types.book.Heading.of(level).create(
			text ? [Leaf.text(text, marks)] : [],
		);
		this.book.pushLayer("Headings", Plot.End, heading);
	}

	pushBreak(class_: string = "") {
		this.source.push(types.book.Break.of(class_));
	}

	createAnnotation(): Builder {
		const builder = new Builder(noteConfig, {
			id: newId(),
			lang: this.book.meta.lang,
			published: this.book.meta.published,
			authors: this.book.meta.authors,
		});
		this.annotations.push({
			pos: this.book.cursor,
			length: 0,
			builder,
		});
		return builder;
	}

	insertedVerses = new Set<string>();

	pushText(
		text: string,
		vnum: string,
		marks: Mark.Set,
		source?: { pos: number; length: number },
	) {
		const prevCanSpace =
			this.book.lastInsert.isText &&
			!/[\p{Pc}|\p{Pd}|\p{Ps}|\p{Pi}]$/u.test(
				this.book.lastInsert.param as string,
			);
		const curCanSpace = !/^[\p{Pc}\p{Po}.]/u.test(text);
		if (prevCanSpace && curCanSpace) this.book.push(" ");

		if (
			!this.insertedVerses.has(vnum) &&
			this.book.isInsertValid(types.book.VerseNum.type)
		) {
			this.pushVerse(vnum);
			this.insertedVerses.add(vnum);
		}

		const pos = this.book.cursor;
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
		const res: Doc[] = [
			this.book.finish(),
			this.source.finish(),
			this.sourceMap,
		];

		if (this.annotations.length) {
			const { meta } = this.book;
			res.push({
				type: "annotation",
				schema: 1,
				meta: {
					id: newId(),
					title: meta.title + " Notes",
					authors: meta.authors,
					published: meta.published,
					lang: meta.lang,
				},
				on: meta.id,
				annotations: this.annotations.map((a) => ({
					pos: a.pos,
					length: a.length,
					content: a.builder.finish().content,
				})),
			});
		}
		return res;
	}
}
