import pub from "../bsb/index.ts";

export default function Publication() {
	return (
		<>
			<header>
				Note: For an interactive study experience that uses this data, please
				visit <a href="https://openbible.io">https://openbible.io</a>
			</header>
			<h1>{pub.title}</h1>
			<table>
				<tr>
					<td>Download</td>
					<td>
						<a href={pub.downloadUrl}>{pub.downloadUrl}</a>
					</td>
				</tr>
				<tr>
					<td>Publisher</td>
					<td>
						<a href={pub.publisherUrl}>{pub.publisher}</a>
					</td>
				</tr>
				<tr>
					<td>Publish date</td>
					<td>{pub.publishDate}</td>
				</tr>
				<tr>
					<td>ISBN</td>
					<td>
						<a href={`https://isbnsearch.org/isbn/${pub.isbn}`}>
							{pub.isbn}
						</a>
					</td>
				</tr>
				<tr>
					<td>License</td>
					<td>
						<a href={pub.licenseUrl}>{pub.license}</a>
					</td>
				</tr>
			</table>
			<h2>Authors</h2>
			<ul>
				{(pub.authors ?? []).map((a) => (
					<li>
						<a href={a.url}>{a.name}</a> {a.qualifications?.join(", ")}
						<div>
							{a.contributions?.join(", ")}
						</div>
					</li>
				))}
			</ul>
			{pub.preface && (
				<>
					<h2>Preface</h2>
					<div dangerouslySetInnerHTML={{ __html: pub.preface }} />
				</>
			)}
		</>
	);
}
