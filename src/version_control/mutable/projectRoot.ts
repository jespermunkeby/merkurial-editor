import { Branch } from "./branch"

export type ProjectRoot = {
    uuid: string
    name: string
    master: Branch
    branches: Branch[]
}