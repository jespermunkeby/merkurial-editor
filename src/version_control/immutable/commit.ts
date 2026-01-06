import { GrammarRoot } from "./grammar"
import { CID } from "../cid"

export type Commit = {
    type: "commit"
    parents: CID<Commit>[]
    content: CID<GrammarRoot>
    author: string
    timestamp: string
    message: string
}