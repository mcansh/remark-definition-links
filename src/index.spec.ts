import fsp from "node:fs/promises";
import path from "node:path";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { read } from "to-vfile";
import { describe, expect, test } from "vitest";
import { remarkDefinitionLinks } from "./index.ts";

let FIXTURES_DIR = path.join(process.cwd(), "fixtures");
let INPUT_DIR = path.join(FIXTURES_DIR, "before");
let OUTPUT_DIR = path.join(FIXTURES_DIR, "after");
let WINDOWS_OUTPUT_DIR = path.join(FIXTURES_DIR, "after-win");

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
    let beforeFile = path.join(INPUT_DIR, filename);
    let afterFile = path.join(
      process.platform === "win32" ? WINDOWS_OUTPUT_DIR : OUTPUT_DIR,
      filename,
    );

    console.log({ beforeFile, afterFile });

    let [before, after] = await Promise.all([
      read(beforeFile),
      read(afterFile),
    ]);

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

    expect(result.toString()).toEqual(after.toString());
  });
});
