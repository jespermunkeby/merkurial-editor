
import stringify from "fast-json-stable-stringify"
import { Commit } from "./immutable/commit"
import { BlockNode, Directory, Document, GrammarRoot, InlineNode } from "./immutable/grammar"
import { bytesToHex } from "@noble/hashes/utils.js"
import { sha256 } from "@noble/hashes/sha2.js"

export type CID<T> = string & { __phantom: T }

type CIDable = 
| GrammarRoot 
| Commit 
| Directory 
| Document 
| BlockNode 
| InlineNode

export function cid<T extends CIDable>(node: T): CID<T> {
  const encoded = new TextEncoder().encode(stringify(node))
  return bytesToHex(sha256(encoded)) as CID<T>
}
