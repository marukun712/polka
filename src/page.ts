import { fetchPolkaEvent } from "./protocol.js";

async function main() {
	const params = new URLSearchParams(window.location.search);
	const url = params.get("url");
	const content = document.getElementById("content");
	if (!content) return;
	if (!url) {
		content.innerHTML = '<span class="error">No URL specified</span>';
		return;
	}
	try {
		const event = await fetchPolkaEvent(url);
		content.innerHTML = `<pre>${JSON.stringify(event, null, 2)}</pre>`;
	} catch (err) {
		content.innerHTML = `<span class="error">Error: ${err}</span>`;
	}
}

main();
