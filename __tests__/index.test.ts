import { glob } from "glob";
import path from "node:path";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { read } from "to-vfile";
import { describe, expect, test } from "vitest";
import { remarkDefinitionLinks } from "../src";

let FIXTURES_DIR = path.join(process.cwd(), "__tests__", "fixtures");
let INPUT_DIR = path.join(FIXTURES_DIR, "before");
let OUTPUT_DIR = path.join(FIXTURES_DIR, "after");

let files = glob.sync(`./**/*.md`, {
  cwd: INPUT_DIR,
  nodir: true,
  ignore: ["**/node_modules/**"],
});

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

    expect(result.toString()).toEqual(after.toString());
  });
});
