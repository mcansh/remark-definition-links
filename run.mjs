import fsp from "node:fs/promises";
import path from "node:path";

import { read } from "to-vfile";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";

import { remarkDefinitionLinks } from "./dist/index.js";

let FIXTURES_DIR = path.join(process.cwd(), "__tests__", "fixtures");
let INPUT_FILE = path.join(FIXTURES_DIR, "conventions.md");
let OUTPUT_FILE = path.join(FIXTURES_DIR, "conventions-after.md");

async function run() {
  let result = await remark()
    .use({
      settings: {
        fences: true,
        listItemIndent: "one",
        tightDefinitions: true,
      },
    })
    .use(remarkDefinitionLinks)
    .use(remarkFrontmatter, ["yaml", "toml"])
    .process(await read(INPUT_FILE));

  await fsp.writeFile(OUTPUT_FILE, result.toString());
}

void run();
