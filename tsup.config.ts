import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/**/*.ts"],
	format: ["esm"],
	target: "esnext",
	dts: true,
});
