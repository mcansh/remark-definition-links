import path from "node:path";

import fse from "fs-extra";
import { glob } from "glob";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { read } from "to-vfile";

import { remarkDefinitionLinks } from "./dist/index.js";

let FIXTURES_DIR = path.join(process.cwd(), "__tests__", "fixtures");
let INPUT_DIR = path.join(FIXTURES_DIR, "before");
let OUTPUT_DIR = path.join(FIXTURES_DIR, "after");

main();

async function main() {
  let files = glob.sync(`${INPUT_DIR}/**/*.md`, {
    absolute: true,
    nodir: true,
    ignore: ["**/node_modules/**"],
  });

  for (let file of files) {
    try {
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
        .process(await read(file));

      let output = path.join(OUTPUT_DIR, path.relative(INPUT_DIR, file));

      let dirname = path.dirname(output);

      fse.ensureDirSync(dirname);

      await fse.writeFile(output, result.toString());

      console.log(`Processed ${file}`);
    } catch (error) {
      console.error(`Failed to process ${file}`);
      console.error(error);
    }
  }
}
