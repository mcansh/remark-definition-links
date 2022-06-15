import { URL } from "node:url";
import * as path from "node:path";

import { visit, SKIP } from "unist-util-visit";
import type { Definition, ImageReference, LinkReference } from "mdast";
import type { Plugin } from "unified";
import slugify from "@sindresorhus/slugify";

let own = {}.hasOwnProperty;

export function remarkDefinitionLinks(): Plugin {
  return (tree) => {
    let definitions: Record<string, Record<string, string>> = {};
    let existing: Array<string> = [];
    let references = Object.create(null);

    function aggregate(node: any) {
      const text: string = node.children.reduce((str: string, arr: any) => {
        if (["text", "inlineCode"].includes(arr.type)) str += arr.value;
        return str;
      }, "");

      return text;
    }

    visit(tree, "definition", (node) => {
      let url = node.url;
      existing.push(node.identifier);

      if (!own.call(definitions, url)) {
        definitions[url] = Object.create(null);
      }

      let title = node.title || "";

      definitions[url][title] = node;
    });

    visit(tree, (node, index, parent) => {
      if (
        parent &&
        typeof index === "number" &&
        ["image", "link"].includes(node.type)
      ) {
        let url: string = node.url;
        let title: string = aggregate(node);
        let reference = slugify(title);

        let titles: Record<string, Definition> = own.call(definitions, url)
          ? definitions[url]
          : (definitions[url] = Object.create(null));

        let identifier: string;

        if (own.call(titles, title)) {
          identifier = titles[title].identifier;
        } else {
          do {
            if (!(reference in references)) {
              references[reference] = 0;
            }

            if (references[reference] === 0) {
              identifier = reference;
              references[reference] += 1;
            } else {
              references[reference] += 1;
              identifier = reference + "-" + references[reference];
            }
          } while (existing.includes(identifier));

          let definition: Definition = {
            type: "definition",
            identifier,
            title: "",
            url,
          };

          titles[title] = definition;
          tree.children.push(definition);
        }

        let replacement: ImageReference | LinkReference =
          node.type === "image"
            ? {
                type: "imageReference",
                identifier,
                referenceType: "full",
                alt: node.alt,
              }
            : {
                type: "linkReference",
                identifier,
                referenceType: "full",
                children: node.children,
              };

        parent.children[index] = replacement;
        return [SKIP, index];
      }
    });
  };
}
