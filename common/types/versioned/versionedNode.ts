import { BlockNode, Directory, Document, InlineNode, Project } from "./project";

export type VersionedNode = 
    | Project
    | Directory
    | Document
    | BlockNode
    | InlineNode