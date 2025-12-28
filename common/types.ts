import { Root } from "./grammar"

export type CID<T> = string & { __phantom: T }

type Commit = {
  parent: CID<Commit>
  content: CID<Root>
  author: string
  timestamp: number
  message: string
}

type Reference = {
  commit: CID<Commit>, //what root are we taking the path in?
  path: CID<any>[]
} //we will be able to do locate/llm infra with this! :D
//first class llm product! (we can have programmatic and agentic summarization/traveral)

type Branch = {
    name: string
    commit: CID<Commit>
}

type Comment = { //todo
    
} //could possible be added as invariant on the verion model. Or hybrid (multihash kind of)..

// we could refer to anything in comments and ai editor!!


