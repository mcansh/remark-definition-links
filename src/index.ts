import { URL } from "node:url";
import * as path from "node:path";

import { visit, SKIP } from "unist-util-visit";
import type { Definition, ImageReference, LinkReference } from "mdast";
import type { Plugin } from "unified";

let own = {}.hasOwnProperty;

export function remarkReferenceLinksBottom(): Plugin {
  return (tree) => {
    let definitions = Object.create(null);
    let existing: Array<string> = [];
    let hosts = Object.create(null);

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
        let host: string = "";
        let title = node.title || "";
        try {
          host = new URL(url).host;
          host = host ? path.parse(host).name : "";
        } catch {}

        let titles: Record<string, Definition> = own.call(definitions, url)
          ? definitions[url]
          : (definitions[url] = Object.create(null));

        let identifier: string;

        if (own.call(titles, title)) {
          identifier = titles[title].identifier;
        } else {
          do {
            if (!(host in hosts)) {
              hosts[host] = 0;
            }

            identifier = (host ? host + "-" : "") + ++hosts[host];
          } while (existing.includes(identifier));

          let definition: Definition = {
            type: "definition",
            identifier,
            title,
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
