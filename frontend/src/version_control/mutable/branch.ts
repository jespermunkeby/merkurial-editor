import { CID } from "../cid"
import { Commit } from "../commit"

export type Branch = {
    uuid: string
    name: string
    commit: CID<Commit>
}