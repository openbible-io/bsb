import type { ComponentChildren } from "preact";
import pub from "../bsb/index.ts";

export default function Page(
	props: { title: string; children: ComponentChildren },
) {
	return (
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>BSB - {props.title}</title>
				<link rel="icon" href="/favicon.png" />
				<link rel="stylesheet" href="/index.css" />
			</head>
			<body>
				<nav>
					<ul>
						<li>
							<a href="/">Preface</a>
						</li>
						{Object.entries(pub.toc).map(([id, { name }]) => (
							<li>
								<a href={`/${id}`}>{name}</a>
							</li>
						))}
					</ul>
				</nav>
				{props.children}
			</body>
		</html>
	);
}
