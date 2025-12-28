import { sha256 } from "@noble/hashes/sha2"
import { bytesToHex } from "@noble/hashes/utils"
import stringify from "fast-json-stable-stringify"
import { VersionedNode } from "./types/versioned"

export type CID<T> = string & { readonly __phantom: T }

export function cid<T extends VersionedNode>(node: T): CID<T> {
  const encoded = new TextEncoder().encode(stringify(node))
  return bytesToHex(sha256(encoded)) as CID<T>
}