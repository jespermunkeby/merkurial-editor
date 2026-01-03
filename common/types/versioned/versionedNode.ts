import { BlockNode, Directory, Document, InlineNode, VersionedRoot } from "./project";

export type VersionedNode = 
    | VersionedRoot
    | Directory
    | Document
    | BlockNode
    | InlineNode