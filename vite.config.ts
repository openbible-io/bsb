import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		{
			name: "raw-file-reload",
			configureServer(server) {
				const { ws, watcher } = server;
				watcher.on("change", (file) => {
					if (file.endsWith(".nb")) {
						ws.send({
							type: "full-reload",
						});
					}
				});
			},
		},
	],
});
