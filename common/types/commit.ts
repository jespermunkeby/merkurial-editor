import { CID } from "./cid"
import { User } from "./user"
import { Project } from "./versioned/project"

export type Commit = {
    parents: CID<Commit>[]
    content: CID<Project>
    author: User
    timestamp: Date
    message: string
}