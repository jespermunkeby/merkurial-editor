import { CID } from "../cid"
import { Commit } from "../immutable/commit"

export type Branch = {
    uuid: string
    name: string
    commit: CID<Commit>
}