import { CID, CIDable } from "./cid"
import { Commit } from "./immutable/commit"
import { Branch } from "./mutable/branch"

/**
 * Resolver function type
 */
export type Resolver = <T extends CIDable>(id: CID<T>) => T | undefined

/**
 * A commit node with metadata for visualization
 */
export type CommitNode = {
    cid: CID<Commit>
    commit: Commit
    branches: Branch[]
    isMergeCommit: boolean
}

/**
 * Utility for building commit history views.
 * Separated from VersionControl to keep the core minimal.
 */
export const HistoryView = {
    /**
     * Get commit history as a list for visualization.
     * Returns commits in topological order (newest first) with branch info.
     */
    getCommitHistory(
        branches: Branch[], 
        resolve: Resolver,
        maxDepth: number = 50
    ): CommitNode[] {
        const visited = new Set<string>()
        const result: CommitNode[] = []
        
        // Start from all branch heads
        const queue: { cid: CID<Commit>, depth: number }[] = []
        
        for (const branch of branches) {
            queue.push({ cid: branch.commit, depth: 0 })
        }
        
        // BFS to collect commits
        while (queue.length > 0 && result.length < maxDepth) {
            // Sort by timestamp to process newest first
            queue.sort((a, b) => {
                const commitA = resolve(a.cid) as Commit | undefined
                const commitB = resolve(b.cid) as Commit | undefined
                if (!commitA || !commitB) return 0
                return new Date(commitB.timestamp).getTime() - new Date(commitA.timestamp).getTime()
            })
            
            const { cid, depth } = queue.shift()!
            
            if (visited.has(cid)) continue
            visited.add(cid)
            
            const commit = resolve(cid) as Commit | undefined
            if (!commit) continue
            
            // Find which branches point to this commit
            const branchesAtCommit = branches.filter(b => b.commit === cid)
            
            result.push({
                cid,
                commit,
                branches: branchesAtCommit,
                isMergeCommit: commit.parents.length > 1
            })
            
            // Add parents to queue
            for (const parentCid of commit.parents) {
                if (!visited.has(parentCid)) {
                    queue.push({ cid: parentCid, depth: depth + 1 })
                }
            }
        }
        
        return result
    },

    /**
     * Find the common ancestor of two branches using BFS from both sides
     */
    findCommonAncestor(
        branchA: Branch, 
        branchB: Branch, 
        resolve: Resolver
    ): CID<Commit> | null {
        const visitedA = new Set<string>()
        const visitedB = new Set<string>()
        const queueA: CID<Commit>[] = [branchA.commit]
        const queueB: CID<Commit>[] = [branchB.commit]

        while (queueA.length > 0 || queueB.length > 0) {
            if (queueA.length > 0) {
                const cidA = queueA.shift()!
                if (visitedB.has(cidA)) return cidA
                visitedA.add(cidA)
                const commitA = resolve(cidA) as Commit | undefined
                if (commitA) queueA.push(...commitA.parents)
            }
            if (queueB.length > 0) {
                const cidB = queueB.shift()!
                if (visitedA.has(cidB)) return cidB
                visitedB.add(cidB)
                const commitB = resolve(cidB) as Commit | undefined
                if (commitB) queueB.push(...commitB.parents)
            }
        }

        return null
    },

    /**
     * Check if a commit is an ancestor of another
     */
    isAncestor(
        potentialAncestor: CID<Commit>, 
        descendant: CID<Commit>, 
        resolve: Resolver
    ): boolean {
        const visited = new Set<string>()
        const queue: CID<Commit>[] = [descendant]

        while (queue.length > 0) {
            const cid = queue.shift()!
            if (cid === potentialAncestor) return true
            if (visited.has(cid)) continue
            visited.add(cid)

            const commit = resolve(cid) as Commit | undefined
            if (commit) {
                queue.push(...commit.parents)
            }
        }

        return false
    }
}

