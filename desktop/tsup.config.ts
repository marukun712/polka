import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ["src/index.ts"],
		format: ["esm"],
		target: "esnext",
		dts: true,
		outDir: "dist",
	},
	{
		entry: ["lib/**/*.ts"],
		format: ["esm"],
		target: "esnext",
		dts: true,
		outDir: "dist",
	},
	{
		entry: ["src/preload.ts"],
		format: ["cjs"],
		target: "node18",
		outDir: "dist",
		clean: false,
	},
]);
