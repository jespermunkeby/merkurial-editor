import { CID } from "./cid"
import { Commit } from "./commit"

export type Branch = {
    name: string
    commit: CID<Commit>
}