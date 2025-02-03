// Downloads text to `bsb.csv` and audio to `dist/audio`.
import { downloadFile } from "@openbible/core";
import { Command, Option } from "commander";
//import { mirrors } from "./audio.ts";
import { join } from "node:path";
import { parseSpreadsheet } from "../src/parseSpreadsheet.ts";

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
		const books = await parseSpreadsheet(path);

		await Deno.mkdir(genDir, { recursive: true });
		Object.entries(books).forEach(([id, { data }]) => {
			const path = join(genDir, id + ".ts");
			Deno.writeTextFileSync(
				path,
				`export default ${JSON.stringify(data, null, 2)};`,
			);
		});

		const indexPath = join(genDir, "index.ts");
		Deno.writeTextFileSync(
			indexPath,
			Object.keys(books).map((id, i) => `import imp${i} from "./${id}.ts";`).join(
				"\n",
			),
		);
		Deno.writeTextFileSync(
			indexPath,
			`\nexport default {\n${
				Object.keys(books).map((b, i) => `"${b}": imp${i}`).join(",\n")
			}\n};`,
			{ append: true },
		);
	});

//program.command("audio")
//	.description("download and re-encode latest audio")
//	.option("-s, --since <date>", "download if changed after this date")
//	.addOption(
//		new Option("-m, --mirror <string>", "apache server mirror").choices(
//			Object.keys(mirrors),
//		).default(Object.keys(mirrors)[0]),
//	)
//	.action((str, opts) => {
//		console.log(str, opts);
//	});
//
program.parse();
