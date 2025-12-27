import { GrammarNode } from "./grammar";

export function cid(node: GrammarNode): string {
  return node.type + "-" + node.content.map(cid).join("-")
}