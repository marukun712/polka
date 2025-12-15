import { execSync } from "node:child_process";
import fs from "node:fs";

const ext = process.platform === "win32" ? ".exe" : "";

const rustInfo = execSync("rustc -vV");
//@ts-expect-error
const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];
if (!targetTriple) {
	console.error("Failed to determine platform target triple");
}
fs.renameSync(
	`app${ext}`,
	`../desktop/src-tauri/binaries/app-${targetTriple}${ext}`,
);
