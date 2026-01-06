import { CID, CIDable } from "./cid"
import { Directory, Document, GrammarRoot } from "./immutable/grammar"

/**
 * Resolver function type - abstracts away the storage implementation
 */
export type Resolver = <T extends CIDable>(id: CID<T>) => T | undefined

/**
 * Document info returned by tree walking
 */
export type DocumentInfo = {
    cid: CID<Document>
    doc: Document
    path: string
}

/**
 * Utility for walking the grammar tree structure.
 * Separated from VersionControl to keep the core minimal.
 */
export const TreeWalker = {
    /**
     * Get all documents from a grammar root with their paths
     */
    getDocuments(rootCid: CID<GrammarRoot>, resolve: Resolver): DocumentInfo[] {
        const root = resolve(rootCid) as GrammarRoot | undefined
        if (!root) return []

        const docs: DocumentInfo[] = []
        
        const walkDirectory = (dirCid: CID<Directory>, pathPrefix: string) => {
            const dir = resolve(dirCid) as Directory | undefined
            if (!dir) return

            for (const childCid of dir.children) {
                const child = resolve(childCid as CID<CIDable>)
                if (!child) continue

                if (child.type === 'folder') {
                    walkDirectory(childCid as CID<Directory>, `${pathPrefix}${(child as Directory).name}/`)
                } else if (child.type === 'document') {
                    const doc = child as Document
                    docs.push({
                        cid: childCid as CID<Document>,
                        doc,
                        path: `${pathPrefix}${doc.name || 'Untitled'}`
                    })
                }
            }
        }

        for (const dirCid of root.content) {
            const dir = resolve(dirCid) as Directory | undefined
            if (dir) {
                walkDirectory(dirCid, `${dir.name}/`)
            }
        }

        return docs
    },

    /**
     * Find a document by path
     */
    findDocumentByPath(rootCid: CID<GrammarRoot>, path: string, resolve: Resolver): DocumentInfo | undefined {
        const docs = this.getDocuments(rootCid, resolve)
        return docs.find(d => d.path === path)
    },

    /**
     * Collect all CIDs reachable from a root (for diffing, GC, etc.)
     */
    collectAllCids(rootCid: CID<any>, resolve: Resolver): Set<string> {
        const collected = new Set<string>()
        
        const walk = (cid: CID<any>) => {
            if (collected.has(cid)) return
            collected.add(cid)

            const node = resolve(cid as CID<CIDable>)
            if (!node) return

            for (const value of Object.values(node)) {
                if (isCID(value)) {
                    walk(value)
                } else if (Array.isArray(value)) {
                    for (const item of value) {
                        if (isCID(item)) {
                            walk(item)
                        }
                    }
                }
            }
        }

        walk(rootCid)
        return collected
    },

    /**
     * Collect only leaf CIDs (nodes without CID children)
     */
    collectLeafCids(rootCid: CID<any>, resolve: Resolver): Set<string> {
        const collected = new Set<string>()
        
        const walk = (cid: CID<any>): boolean => {
            if (collected.has(cid)) return false

            const node = resolve(cid as CID<CIDable>)
            if (!node) return false

            let hasChildCids = false
            for (const value of Object.values(node)) {
                if (isCID(value)) {
                    hasChildCids = true
                    walk(value)
                } else if (Array.isArray(value)) {
                    for (const item of value) {
                        if (isCID(item)) {
                            hasChildCids = true
                            walk(item)
                        }
                    }
                }
            }

            if (!hasChildCids) {
                collected.add(cid)
            }
            return hasChildCids
        }

        walk(rootCid)
        return collected
    }
}

/**
 * Check if a value looks like a CID (64-char hex string)
 */
function isCID(value: any): value is CID<any> {
    return typeof value === 'string' && value.length === 64 && /^[0-9a-f]+$/.test(value)
}

