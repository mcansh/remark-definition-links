import fsp from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { read } from "to-vfile";
import { remarkDefinitionLinks } from "./src/index.js";

let FIXTURES_DIR = path.join(process.cwd(), "fixtures");
let INPUT_DIR = path.join(FIXTURES_DIR, "before");
let OUTPUT_DIR = path.join(FIXTURES_DIR, "after");

// if file is ran directly ESM
if (import.meta.url === url.pathToFileURL(process.argv[1]!).href) {
  main();
}

export async function main() {
  let filesIterator = fsp.glob(`${INPUT_DIR}/**/*.md`, {
    exclude: ["**/node_modules/**"],
  });

  /** @type {Array<string>} */
  let files = [];

  for await (const entry of filesIterator) {
    files.push(entry);
  }

  for (let file of files) {
    try {
      let content = await read(file);
      let result = await remark()
        .use({
          settings: {
            fences: true,
            listItemIndent: "one",
            tightDefinitions: true,
          },
        })
        .use(remarkDefinitionLinks)
        .use(remarkGfm)
        .use(remarkFrontmatter, ["yaml", "toml"])
        .process(content);

      let output = path.join(OUTPUT_DIR, path.relative(INPUT_DIR, file));

      let dirname = path.dirname(output);

      await fsp.mkdir(dirname, { recursive: true });

      await fsp.writeFile(output, result.toString());

      console.log(`Processed ${file}`);
    } catch (error) {
      console.error(`Failed to process ${file}`);
      console.error(error);
    }
  }
}
