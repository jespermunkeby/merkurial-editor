import { cid, CID } from "./cid"
import { Commit } from "./immutable/commit";
import { GrammarRoot } from "./immutable/grammar";
import { Branch } from "./mutable/branch"
import { ProjectRoot } from "./mutable/projectRoot"
import { v4 as uuidv4 } from 'uuid';


class KVStore {
    private store: Map<CID<any>, CID<any>>

    constructor() {
        this.store = new Map()
    }

    public put(key: CID<any>, value: CID<any>) {
        this.store.set(key, value)
    }

    public get(key: CID<any>) {
        return this.store.get(key)
    }
}


class VersionControl {
    private sourceOfTruth: KVStore
    private workInProgress: KVStore
    private branches: Branch[]
    private defaultBranch: Branch
    private currentBranch: Branch

    constructor() {
        this.sourceOfTruth = new KVStore()
        this.workInProgress = new KVStore()

        const initialGrammarRoot : GrammarRoot = {
            type: "grammar_root",
            content: []
        }

        const initialCommit : Commit = {
            type: "commit",
            parents: [],
            content: cid<GrammarRoot>(initialGrammarRoot),
            author: "initial",
            timestamp: new Date().toISOString(),
            message: "initial commit"
        }

        const defaultBranch = {
            uuid: uuidv4(),
            name: "default",
            commit: cid<Commit>(initialCommit)
        }

        this.defaultBranch = defaultBranch
        this.branches = [defaultBranch]
        this.currentBranch = defaultBranch
    }

    public createBranch(name: string) {

    }

    public checkout(branch: Branch) {
    }

    public merge(targetBranch: Branch) {
    }

    public diff(targetBranch: Branch) : Diff {

    }

    public commit(){
        //put changes in working state into store, then clear working state
    }

    public get<T>(path:???, value: T) {

    }

    public set<T>(path:???, value: T) {
        
    }

    
}