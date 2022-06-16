import { visit, SKIP } from "unist-util-visit";
import type {
  Definition,
  Image,
  ImageReference,
  Link,
  LinkReference,
  Parent,
} from "mdast";
import type { Transformer } from "unified";
import slugify from "@sindresorhus/slugify";

let own = {}.hasOwnProperty;

function aggregate(node: Parent) {
  const text = node.children.reduce((string, childNode) => {
    if ("value" in childNode) {
      string += childNode.value;
    }

    if ("children" in childNode) {
      string += aggregate(childNode);
    }

    return string;
  }, "");

  return text;
}

export function remarkDefinitionLinks(): Transformer {
  return function transformer(tree): void {
    let definitions: Record<string, Record<string, Definition>> = {};
    let existing: Array<string> = [];
    let references = Object.create(null);

    function definitionVisitor(node: Definition): void {
      let url = node.url;
      existing.push(node.identifier);

      if (!own.call(definitions, url)) {
        definitions[url] = Object.create(null);
      }

      let title = node.label || "";

      definitions[url][title] = node;
    }

    function linkVisitor(
      node: Link | Image,
      index: number,
      parent: Parent
    ): [typeof SKIP, number] | undefined {
      if (parent && typeof index === "number") {
        let url = node.url;
        let title = node.type === "image" ? node.alt : aggregate(node);
        // @ts-ignore
        let reference = slugify(title);

        // this is usually blank if the image is also a link
        if (!reference) {
          if (node.type === "link") {
            let image = node.children.find((child) => child.type === "image");
            if (image && image.type === "image") {
              reference = slugify(image.alt + "-image");
            } else {
              reference = slugify(node.url);
            }
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
          // @ts-ignore - cant figure our the actual type of `tree` to get it to include "children"
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
    }

    visit(tree, "definition", definitionVisitor);
    // @ts-ignore
    visit(tree, ["link", "image"], linkVisitor);
  };
}
