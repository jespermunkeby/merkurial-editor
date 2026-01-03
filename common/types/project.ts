import { Branch } from "./branch"
import { CID } from "./cid"
import { VersionedRoot } from "./versioned/project"

export type Project = {
    name: string
    master: Branch
    branches: Branch[]
}