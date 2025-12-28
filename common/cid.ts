import { GrammarNode } from "./grammar";
import { sha256 } from "@noble/hashes/sha2"
import { bytesToHex } from "@noble/hashes/utils"


export function cid(node: GrammarNode): string {
  return node.type + "-" + node.content.map(cid).join("-")
}