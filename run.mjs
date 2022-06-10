import fsp from "node:fs/promises";
import path from "node:path";

import { read } from "to-vfile";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";

import { remarkReferenceLinksBottom } from "./dist/index.js";

let INPUT_FILE = path.join(process.cwd(), "test.md");
let OUTPUT_FILE = path.join(process.cwd(), "test-after.md");

async function run() {
  let result = await remark()
    .use(remarkReferenceLinksBottom)
    .use(remarkFrontmatter, ["yaml", "toml"])
    .process(await read(INPUT_FILE));

  await fsp.writeFile(OUTPUT_FILE, result.toString());
}

void run();
