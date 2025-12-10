import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["main/**/*.ts", "renderer/**/*.ts", "preload/**/*.ts"],
	format: ["esm"],
	target: "esnext",
	dts: true,
});
