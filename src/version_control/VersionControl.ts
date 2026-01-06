import { cid, CID, CIDable } from "./cid"
import { Commit } from "./immutable/commit";
import { GrammarRoot } from "./immutable/grammar";
import { Branch } from "./mutable/branch"
import { v4 as uuidv4 } from 'uuid';


/**
 * Simple content-addressed key-value store
 */
class KVStore {
    private store: Map<string, CIDable> = new Map()

    put<T extends CIDable>(node: T): CID<T> {
        const id = cid(node)
        this.store.set(id, node)
        return id
    }

    get<T extends CIDable>(id: CID<T>): T | undefined {
        return this.store.get(id) as T | undefined
    }

    has(id: CID<any>): boolean {
        return this.store.has(id)
    }

    clear(): void {
        this.store.clear()
    }

    transferTo(target: KVStore): void {
        for (const [id, value] of this.store.entries()) {
            target.store.set(id, value)
    }
    }
}


/**
 * Minimal version control system with content-addressed storage.
 * 
 * Core responsibilities:
 * - Content-addressed storage (put/resolve)
 * - Branch management (create/checkout/list)
 * - Commit management (commit/isDirty)
 * - Working state management
 * - Merge
 * 
 * Higher-level concerns (tree walking, history visualization) 
 * should be handled by separate utilities.
 */
class VersionControl {
    private sourceOfTruth: KVStore
    private workInProgress: KVStore
    private branches: Branch[]
    private archivedBranches: Branch[]
    private defaultBranch: Branch
    private currentBranch: Branch
    private workingRootCid: CID<GrammarRoot>

    constructor() {
        this.sourceOfTruth = new KVStore()
        this.workInProgress = new KVStore()
        this.archivedBranches = []

        const initialGrammarRoot: GrammarRoot = {
            type: "grammar_root",
            content: []
        }

        const initialRootCid = this.sourceOfTruth.put(initialGrammarRoot)

        const initialCommit: Commit = {
            type: "commit",
            parents: [],
            content: initialRootCid,
            author: "system",
            timestamp: new Date().toISOString(),
            message: "initial commit"
        }

        const initialCommitCid = this.sourceOfTruth.put(initialCommit)

        const defaultBranch: Branch = {
            uuid: uuidv4(),
            name: "default",
            commit: initialCommitCid
        }

        this.defaultBranch = defaultBranch
        this.branches = [defaultBranch]
        this.currentBranch = defaultBranch
        this.workingRootCid = initialRootCid
    }

    // =========================================================================
    // Store Operations
    // =========================================================================

    /**
     * Store a node and return its content ID
     */
    put<T extends CIDable>(node: T): CID<T> {
        return this.workInProgress.put(node)
    }

    /**
     * Resolve a CID to its content (checks workInProgress first, then sourceOfTruth)
     */
    resolve<T extends CIDable>(id: CID<T>): T | undefined {
        return this.workInProgress.get(id) ?? this.sourceOfTruth.get(id)
    }

    // =========================================================================
    // Working State
    // =========================================================================

    /**
     * Get the current working root CID
     */
    getWorkingRoot(): CID<GrammarRoot> {
        return this.workingRootCid
    }

    /**
     * Set the working root CID directly
     */
    setWorkingRoot(cid: CID<GrammarRoot>): void {
        this.workingRootCid = cid
    }

    /**
     * Set the working root from a GrammarRoot object (stores it first)
     */
    setRoot(root: GrammarRoot): void {
        this.workingRootCid = this.workInProgress.put(root)
    }

    // =========================================================================
    // Branch Operations
    // =========================================================================

    /**
     * Get the current branch
     */
    getCurrentBranch(): Branch {
        return this.currentBranch
    }

    /**
     * Get all active branches
     */
    getBranches(): Branch[] {
        return this.branches
    }

    /**
     * Get the default branch
     */
    getDefaultBranch(): Branch {
        return this.defaultBranch
    }

    /**
     * Get archived branches
     */
    getArchivedBranches(): Branch[] {
        return this.archivedBranches
    }

    /**
     * Create a new branch
     * @param name - Branch name
     * @param options.fromCommit - Create from specific commit (default: current branch's commit)
     * @param options.carryWorkingState - Carry over uncommitted changes and switch to new branch
     */
    createBranch(
        name: string, 
        options?: { fromCommit?: CID<Commit>, carryWorkingState?: boolean }
    ): Branch {
        const fromCommit = options?.fromCommit ?? this.currentBranch.commit

        if (options?.carryWorkingState) {
        // Transfer work-in-progress to source of truth so it persists
        this.workInProgress.transferTo(this.sourceOfTruth)
        const currentWorkingRoot = this.workingRootCid
        
            const newBranch: Branch = {
                uuid: uuidv4(),
                name,
                commit: fromCommit
            }
            this.branches.push(newBranch)
            
            // Switch to new branch and restore working state
            this.workInProgress.clear()
            this.currentBranch = newBranch
            this.workingRootCid = currentWorkingRoot
            
            return newBranch
        }

        const newBranch: Branch = {
            uuid: uuidv4(),
            name,
            commit: fromCommit
        }
        this.branches.push(newBranch)
        return newBranch
    }

    /**
     * Switch to a different branch
     */
    checkout(branch: Branch): void {
        this.workInProgress.clear()
        this.currentBranch = branch

        const commit = this.resolve(branch.commit)!
        this.workingRootCid = commit.content
    }

    /**
     * Archive a branch (typically after merge)
     */
    archiveBranch(branch: Branch): void {
        const idx = this.branches.findIndex(b => b.uuid === branch.uuid)
        if (idx !== -1 && branch.name !== "default") {
            this.branches.splice(idx, 1)
            this.archivedBranches.push(branch)
        }
    }

    // =========================================================================
    // Commit Operations
    // =========================================================================

    /**
     * Create a commit with the current working state
     */
    commit(message: string, author: string): CID<Commit> {
        // Transfer all work-in-progress to source of truth
        this.workInProgress.transferTo(this.sourceOfTruth)
        this.workInProgress.clear()

        const newCommit: Commit = {
            type: "commit",
            parents: [this.currentBranch.commit],
            content: this.workingRootCid,
            author,
            timestamp: new Date().toISOString(),
            message
        }

        const commitCid = this.sourceOfTruth.put(newCommit)
        this.currentBranch.commit = commitCid

        return commitCid
    }

    /**
     * Check if there are uncommitted changes
     */
    isDirty(): boolean {
        const commit = this.resolve(this.currentBranch.commit)!
        return commit.content !== this.workingRootCid
    }

    // =========================================================================
    // Merge
    // =========================================================================

    /**
     * Merge sourceBranch INTO the current branch.
     * Creates a merge commit that combines content from both branches.
     */
    merge(sourceBranch: Branch): void {
        if (sourceBranch.uuid === this.currentBranch.uuid) return
        if (this.currentBranch.commit === sourceBranch.commit) return

        const currentCommit = this.resolve(this.currentBranch.commit)!
        const sourceCommit = this.resolve(sourceBranch.commit)!

        const mergedContent = this.mergeGrammarRoots(currentCommit.content, sourceCommit.content)

        const mergeCommit: Commit = {
            type: "commit",
            parents: [this.currentBranch.commit, sourceBranch.commit],
            content: mergedContent,
            author: "merge",
            timestamp: new Date().toISOString(),
            message: `Merge '${sourceBranch.name}' into '${this.currentBranch.name}'`
        }

        const mergeCid = this.sourceOfTruth.put(mergeCommit)
        this.currentBranch.commit = mergeCid
        this.workingRootCid = mergedContent
        this.workInProgress.clear()
    }

    // =========================================================================
    // Tree Mutation Helpers
    // =========================================================================

    /**
     * Update a node by its old CID, replacing references throughout the tree
     */
    updateNode<T extends CIDable>(oldCid: CID<T>, newNode: T): CID<T> {
        const newCid = this.workInProgress.put(newNode)
        
        const root = this.resolve(this.workingRootCid)
        if (root) {
            const newRoot = this.replaceInTree(root, oldCid, newCid) as GrammarRoot
            this.workingRootCid = this.workInProgress.put(newRoot)
        }
        
        return newCid
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    private isCID(value: any): value is CID<any> {
        return typeof value === 'string' && value.length === 64 && /^[0-9a-f]+$/.test(value)
    }

    private replaceInTree(node: any, oldCid: CID<any>, newCid: CID<any>): any {
        if (typeof node !== 'object' || node === null) {
            return node
        }

        const result: any = Array.isArray(node) ? [] : {}

        for (const [key, value] of Object.entries(node)) {
            if (value === oldCid) {
                result[key] = newCid
            } else if (Array.isArray(value)) {
                result[key] = value.map(item => 
                    item === oldCid ? newCid : 
                    typeof item === 'object' ? this.replaceInTree(item, oldCid, newCid) : item
                )
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this.replaceInTree(value, oldCid, newCid)
            } else {
                result[key] = value
            }
        }

        return result
    }

    private mergeGrammarRoots(currentCid: CID<GrammarRoot>, sourceCid: CID<GrammarRoot>): CID<GrammarRoot> {
        const current = this.resolve(currentCid) as GrammarRoot | undefined
        const source = this.resolve(sourceCid) as GrammarRoot | undefined
        
        if (!current && !source) {
            const emptyRoot: GrammarRoot = { type: "grammar_root", content: [] }
            return this.sourceOfTruth.put(emptyRoot)
        }
        if (!current) return sourceCid
        if (!source) return currentCid
        
        // Build maps of directories by name
        const currentDirs = new Map<string, CID<any>>()
        const sourceDirs = new Map<string, CID<any>>()
        
        for (const dirCid of current.content) {
            const dir = this.resolve(dirCid as CID<CIDable>)
            if (dir && (dir as any).name) currentDirs.set((dir as any).name, dirCid)
        }
        
        for (const dirCid of source.content) {
            const dir = this.resolve(dirCid as CID<CIDable>)
            if (dir && (dir as any).name) sourceDirs.set((dir as any).name, dirCid)
        }
        
        // Merge: include all directories from both
        const mergedDirCids: CID<any>[] = []
        const processedNames = new Set<string>()
        
        for (const [name, currentDirCid] of currentDirs) {
            processedNames.add(name)
            const sourceDirCid = sourceDirs.get(name)
            
            if (sourceDirCid) {
                const mergedDirCid = this.mergeDirectories(currentDirCid, sourceDirCid)
                mergedDirCids.push(mergedDirCid)
            } else {
                mergedDirCids.push(currentDirCid)
            }
        }
        
        for (const [name, sourceDirCid] of sourceDirs) {
            if (!processedNames.has(name)) {
                mergedDirCids.push(sourceDirCid)
            }
        }
        
        const mergedRoot: GrammarRoot = {
            type: "grammar_root",
            content: mergedDirCids
        }
        
        return this.sourceOfTruth.put(mergedRoot)
    }

    private mergeDirectories(currentCid: CID<any>, sourceCid: CID<any>): CID<any> {
        const current = this.resolve(currentCid as CID<CIDable>)
        const source = this.resolve(sourceCid as CID<CIDable>)
        
        if (!current) return sourceCid
        if (!source) return currentCid
        
        const currentChildren = new Map<string, CID<any>>()
        const sourceChildren = new Map<string, CID<any>>()
        
        for (const childCid of (current as any).children || []) {
            const child = this.resolve(childCid as CID<CIDable>)
            if (child) {
                const name = (child as any).type === 'folder' ? (child as any).name : ((child as any).name || 'untitled')
                currentChildren.set(name, childCid)
            }
        }
        
        for (const childCid of (source as any).children || []) {
            const child = this.resolve(childCid as CID<CIDable>)
            if (child) {
                const name = (child as any).type === 'folder' ? (child as any).name : ((child as any).name || 'untitled')
                sourceChildren.set(name, childCid)
            }
        }
        
        const mergedChildren: CID<any>[] = []
        const processedNames = new Set<string>()
        
        for (const [name, currentChildCid] of currentChildren) {
            processedNames.add(name)
            const sourceChildCid = sourceChildren.get(name)
            
            if (sourceChildCid) {
                const currentChild = this.resolve(currentChildCid as CID<CIDable>)
                const sourceChild = this.resolve(sourceChildCid as CID<CIDable>)
                
                if ((currentChild as any)?.type === 'folder' && (sourceChild as any)?.type === 'folder') {
                    const mergedChildCid = this.mergeDirectories(currentChildCid, sourceChildCid)
                    mergedChildren.push(mergedChildCid)
                } else {
                    // Conflict - source wins
                    mergedChildren.push(sourceChildCid)
                }
            } else {
                mergedChildren.push(currentChildCid)
            }
        }
        
        for (const [name, sourceChildCid] of sourceChildren) {
            if (!processedNames.has(name)) {
                mergedChildren.push(sourceChildCid)
            }
        }
        
        const mergedDir = {
            type: "folder",
            name: (current as any).name,
            children: mergedChildren
        }
        
        return this.sourceOfTruth.put(mergedDir as CIDable)
    }
}


export { VersionControl }
