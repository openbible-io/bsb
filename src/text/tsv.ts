type Serializable = string | number | object;
const rowSep = "\n";
const colSep = "\t";
export function value(v: Serializable): string {
	if (v == null) return "";
	switch (typeof v) {
		case "number":
			return v.toString();
		case "string":
			return v.includes(colSep) ? "'" + v.replace(/'/g, "\\'") + "'" : v;
		case "object":
			return value(JSON.stringify(v));
		default:
			throw new Error("cannot serialize" + v);
	}
}
export const row = (row: Serializable[]) => row.map(value).join(colSep);
export const rows = (props: string[], rows: Record<string, Serializable>[]) =>
	rows.map((w) => row(props.map((p) => w[p]))).join(rowSep);
