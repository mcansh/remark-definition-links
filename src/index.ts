import { visit, SKIP } from "unist-util-visit";
import type { Definition, ImageReference, LinkReference } from "mdast";
import type { Plugin } from "unified";
import slugify from "@sindresorhus/slugify";

let own = {}.hasOwnProperty;

function aggregate(node: any) {
  const text: string = node.children.reduce((str: string, arr: any) => {
    if (["text", "inlineCode"].includes(arr.type)) {
      str += arr.value;
    }
    return str;
  }, "");

  return text;
}

function findImage(node: any) {
  if (node.children && node.children.length > 0) {
    return node.children.find((child: any) => child.type === "image");
  }
}

export function remarkDefinitionLinks(): Plugin {
  return (tree) => {
    let definitions: Record<string, Record<string, string>> = {};
    let existing: Array<string> = [];
    let references = Object.create(null);

    visit(tree, "definition", (node) => {
      let url = node.url;
      existing.push(node.identifier);

      if (!own.call(definitions, url)) {
        definitions[url] = Object.create(null);
      }

      let title = node.label || "";

      definitions[url][title] = node;
    });

    visit(tree, (node, index, parent) => {
      if (
        parent &&
        typeof index === "number" &&
        ["image", "link"].includes(node.type)
      ) {
        let url: string = node.url;
        let title: string = node.type === "image" ? node.alt : aggregate(node);
        let reference = slugify(title);

        // this is usually blank if the image is also a link
        if (!reference) {
          let image = findImage(node);
          if (image) {
            reference = slugify(image.alt + "-image");
          } else {
            reference = slugify(node.url);
          }
        }

        let urls: Record<string, Definition> = own.call(definitions, url)
          ? definitions[url]
          : (definitions[url] = Object.create(null));

        let identifier: string;

        if (own.call(urls, url)) {
          identifier = urls[url].identifier;
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

          urls[url] = definition;
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
