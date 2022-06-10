import fsp from "node:fs/promises";
import { read } from "to-vfile";
import { remark } from "remark";
import { remarkReferenceLinksBottom } from "./dist/index.js";
import path from "node:path";

let INPUT_FILE = path.join(process.cwd(), "test.md");
let OUTPUT_FILE = path.join(process.cwd(), "test-after.md");

async function run() {
  let result = await remark()
    .use(remarkReferenceLinksBottom)
    .process(await read(INPUT_FILE));

  await fsp.writeFile(OUTPUT_FILE, result.toString());
}

void run();
