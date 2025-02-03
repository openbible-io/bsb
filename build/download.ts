// Downloads text to `bsb.csv` and audio to `dist/audio`.
import { Book, BookId, downloadFile } from "@openbible/core";
import { Command, Option } from "commander";
import { mirrors } from "./audio.ts";
import { join } from "node:path";

const program = new Command();

const fname = "bsb_tables.xlsx";
const downloadDir = "download";
const genDir = "src/generated";

program.command("text")
	.description(`download and parse latest ${fname} to "dist/index.ts"`)
	.action(async () => {
		await Deno.mkdir(downloadDir, { recursive: true });
		const path = join(downloadDir, fname);
		await downloadFile(`https://bereanbible.com/${fname}`, path);
		const books: { [book in BookId]: Book } = await parseSpreadsheet(path);

		Object.entries(books).forEach(([id, { data }]) => {
			const path = join(genDir, id + ".ts");
			Deno.writeTextFileSync(path, `export default ${JSON.stringify(data)};`);
		});

		const indexPath = join(genDir, "index.ts");
		Deno.writeTextFileSync(
			indexPath,
			Object.keys(books).map((id) => `import ${id} from "./${id}.ts";`).join(
				"",
			),
		);
		Deno.writeTextFileSync(
			indexPath,
			`export default { ${Object.keys(books).join(',')} }`,
			{ append: true }
		);
	});

program.command("audio")
	.description("download and re-encode latest audio")
	.option("-s, --since <date>", "download if changed after this date")
	.addOption(
		new Option("-m, --mirror <string>", "apache server mirror").choices(
			Object.keys(mirrors),
		).default(Object.keys(mirrors)[0]),
	)
	.action((str, opts) => {
		console.log(str, opts);
	});

program.parse();
