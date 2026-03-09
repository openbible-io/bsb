import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const url = new URL("https://bereanbible.com/bsb_tables.tsv");
export const fname = url.pathname.split("/").pop()!;
export const downloadDir = "downloads";

if (import.meta.main) {
	const resp = await fetch(url);
	const body = await resp.bytes();
	await mkdir(downloadDir, { recursive: true });
	await writeFile(join(downloadDir, fname), body);
}
