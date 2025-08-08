import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { read } from "to-vfile";
import { describe, expect, test } from "vitest";
import { remarkDefinitionLinks } from "./index.ts";

let FIXTURES_DIR = path.join(process.cwd(), "fixtures");
let INPUT_DIR = path.join(FIXTURES_DIR, "before");
let OUTPUT_DIR = path.join(
  FIXTURES_DIR,
  os.platform() === "win32" ? "after-win" : "after",
);
let FAILED_DIR = path.join(FIXTURES_DIR, "failed");

let filesIterator = fsp.glob("./**/*.md", {
  cwd: INPUT_DIR,
  exclude: ["**/node_modules/**"],
});

let files: Array<string> = [];

for await (const entry of filesIterator) {
  files.push(entry);
}

describe("converts inline links to definitions", () => {
  test.each(files)("%s", async (filename) => {
    let before = await read(path.join(INPUT_DIR, filename));
    let after = await read(path.join(OUTPUT_DIR, filename));

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
      .process(before);

    if (result.toString() !== after.toString()) {
      let output = path.join(FAILED_DIR, filename);

      let dirname = path.dirname(output);

      if (
        !(await fsp
          .access(dirname, fsp.constants.F_OK)
          .then(() => true)
          .catch(() => false))
      ) {
        await fsp.mkdir(dirname, { recursive: true });
      }

      await fsp.writeFile(output, after.toString());
    }

    expect(result.toString()).toEqual(after.toString());
  });
});
