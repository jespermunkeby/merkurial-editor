import { useState, useCallback, useMemo } from "react"
import { Descendant } from "slate"
import { CID, CIDable } from "./version_control/cid"
import { VersionControl } from "./version_control/VersionControl"
import { TreeWalker } from "./version_control/TreeWalker"
import { HistoryView } from "./version_control/HistoryView"
import { Directory, Document, GrammarRoot } from "./version_control/immutable/grammar"
import { Branch } from "./version_control/mutable/branch"
import { Commit } from "./version_control/immutable/commit"
import { documentToSlate, slateToDocument } from "./projection"
import {
    GrammarRootView,
    DocumentEditor,
    VersionControlPanel,
    ReviewView,
} from "./grammar_views/user_views"

type AppMode = "preview" | "edit" | "review"

// Default empty paragraph for Slate
const EMPTY_PARAGRAPH: Descendant[] = [
    { type: "paragraph", children: [{ text: "" }] } as Descendant
]

// Create a store adapter for the projection layer
function createStoreAdapter(vc: VersionControl) {
    return {
        put: <T extends CIDable>(node: T): CID<T> => vc.put(node),
        get: <T extends CIDable>(id: CID<T>): T | undefined => vc.resolve(id),
    }
}

// Helper to replace a document CID in the tree
function replaceDocumentCidInRoot(
    root: GrammarRoot,
    oldCid: CID<Document>,
    newCid: CID<Document>,
    resolve: <T extends CIDable>(id: CID<T>) => T | undefined,
    vc: VersionControl
): GrammarRoot {
    const replaceInDirectory = (dir: Directory): Directory => {
        let changed = false
        const newChildren = dir.children.map(childCid => {
            if (childCid === oldCid) {
                changed = true
                return newCid
            }
            const child = resolve(childCid as CID<CIDable>)
            if (child && (child as any).type === 'folder') {
                const newChild = replaceInDirectory(child as Directory)
                if (newChild !== child) {
                    changed = true
                    return vc.put(newChild)
                }
            }
            return childCid
        })
        if (changed) {
            return { ...dir, children: newChildren }
        }
        return dir
    }

    const newContent = root.content.map(dirCid => {
        const dir = resolve(dirCid) as Directory | undefined
        if (!dir) return dirCid
        const newDir = replaceInDirectory(dir)
        if (newDir !== dir) {
            return vc.put(newDir)
        }
        return dirCid
    })

    return { ...root, content: newContent }
}

export default function App() {
    // Core state
    const [vc] = useState(() => new VersionControl())
    const [, forceUpdate] = useState({})
    const refresh = useCallback(() => forceUpdate({}), [])

    // UI state
    const [mode, setMode] = useState<AppMode>("preview")
    const [selectedDocumentCid, setSelectedDocumentCid] = useState<CID<Document> | null>(null)
    const [slateValue, setSlateValue] = useState<Descendant[]>(EMPTY_PARAGRAPH)

    // Resolver helper (used by TreeWalker and HistoryView)
    const resolve = useCallback(
        <T extends CIDable>(id: CID<T>): T | undefined => vc.resolve(id),
        [vc]
    )

    // Derived state
    const grammarRoot = vc.resolve(vc.getWorkingRoot()) as GrammarRoot | undefined
    const currentBranch = vc.getCurrentBranch()
    const branches = vc.getBranches()
    const isDirty = vc.isDirty()
    const defaultBranch = branches.find((b) => b.name === "default")!

    // Resolve helper for components (typed version)
    const resolveCid = useCallback(
        <T,>(cid: CID<T>): T | undefined => {
            return resolve(cid as CID<CIDable>) as T | undefined
        },
        [resolve]
    )
    
    // Helper to get documents using TreeWalker
    const getDocuments = useCallback(
        (rootCid: CID<GrammarRoot>) => TreeWalker.getDocuments(rootCid, resolve),
        [resolve]
    )
    
    // Helper to get commit history using HistoryView
    const getCommitHistory = useCallback(
        () => HistoryView.getCommitHistory(branches, resolve),
        [branches, resolve]
    )

    // Get selected document
    const selectedDocument = selectedDocumentCid
        ? (resolveCid(selectedDocumentCid) as Document | undefined)
        : undefined

    // Convert document to Slate when selection changes
    const loadDocumentIntoEditor = useCallback(
        (docCid: CID<Document>) => {
            const doc = resolveCid(docCid) as Document | undefined
            if (doc) {
                const slateNodes = documentToSlate(doc, resolveCid as any)
                setSlateValue(slateNodes)
            }
        },
        [resolveCid]
    )

    // Create a new branch from current position - changes follow to the new branch
    const handleCreateBranch = useCallback((name: string) => {
        // Get current document path before any changes
        const currentDocPath = selectedDocumentCid
            ? getDocuments(vc.getWorkingRoot()).find(d => d.cid === selectedDocumentCid)?.path
            : null
        
        // Create branch with working state (carries over uncommitted changes)
        vc.createBranch(name, { carryWorkingState: true })
        
        // Create initial branch commit with the changes
        vc.commit(`Start branch: ${name}`, "user")
        
        // Restore document selection by path
        if (currentDocPath) {
            const newDocs = getDocuments(vc.getWorkingRoot())
            const sameDoc = newDocs.find(d => d.path === currentDocPath)
            if (sameDoc) {
                setSelectedDocumentCid(sameDoc.cid)
                loadDocumentIntoEditor(sameDoc.cid)
            }
        }
        
        setMode("edit")
        refresh()
    }, [vc, selectedDocumentCid, loadDocumentIntoEditor, refresh, getDocuments])

    // Commit current changes
    const handleCommit = useCallback((message: string) => {
        vc.commit(message, "user")
        refresh()
    }, [vc, refresh])

    // View a specific commit - shows the project at that point in time
    const handleViewCommit = useCallback((commitCid: CID<Commit>) => {
        const commit = resolve(commitCid)
        if (commit) {
            // Set working root to this commit's content to view the project at this state
            vc.setWorkingRoot(commit.content)
            
            // Try to keep the same document selected if it exists
            if (selectedDocumentCid) {
                const currentPath = getDocuments(commit.content).find(d => d.cid === selectedDocumentCid)?.path
                if (currentPath) {
                    const doc = getDocuments(commit.content).find(d => d.path === currentPath)
                    if (doc) {
                        setSelectedDocumentCid(doc.cid)
                        loadDocumentIntoEditor(doc.cid)
                    }
                } else {
                    // Document doesn't exist at this commit
                    setSelectedDocumentCid(null)
                    setSlateValue(EMPTY_PARAGRAPH)
                }
            }
            
            setMode("preview")
            refresh()
        }
    }, [vc, resolve, selectedDocumentCid, loadDocumentIntoEditor, refresh, getDocuments])
    
    // Create branch from a specific commit
    const handleCreateBranchFromCommit = useCallback((name: string, commitCid: CID<Commit>) => {
        const commit = resolve(commitCid)
        if (!commit) return
        
        // Create a new branch pointing to this commit
        const newBranch = vc.createBranch(name, { fromCommit: commitCid })
        vc.checkout(newBranch)
        
        // Preserve document selection if possible
        if (selectedDocumentCid) {
            const currentPath = getDocuments(vc.getWorkingRoot()).find(d => d.cid === selectedDocumentCid)?.path
            if (currentPath) {
                const doc = getDocuments(vc.getWorkingRoot()).find(d => d.path === currentPath)
                if (doc) {
                    setSelectedDocumentCid(doc.cid)
                    loadDocumentIntoEditor(doc.cid)
                }
            }
        }
        
        setMode("edit")
        refresh()
    }, [vc, resolve, selectedDocumentCid, loadDocumentIntoEditor, refresh, getDocuments])

    // Add root directory
    const handleAddRootDirectory = useCallback((name: string) => {
        const newDir: Directory = {
            type: "folder",
            name,
            children: [],
        }
        const dirCid = vc.put(newDir)

        const currentRoot = resolve(vc.getWorkingRoot()) as GrammarRoot | undefined
        if (currentRoot) {
            const newRoot: GrammarRoot = {
                type: "grammar_root",
                content: [...currentRoot.content, dirCid],
            }
            vc.setRoot(newRoot)
        }
        refresh()
    }, [vc, resolve, refresh])

    // Add subdirectory
    const handleAddDirectory = useCallback(
        (parentCid: CID<Directory>, name: string) => {
            const parent = resolveCid(parentCid) as Directory | undefined
            if (!parent) return

            const newDir: Directory = {
                type: "folder",
                name,
                children: [],
            }
            const newDirCid = vc.put(newDir)

            const updatedParent: Directory = {
                ...parent,
                children: [...parent.children, newDirCid],
            }
            vc.updateNode(parentCid, updatedParent)
            refresh()
        },
        [vc, resolveCid, refresh]
    )

    // Add document
    const handleAddDocument = useCallback(
        (parentCid: CID<Directory>, name: string) => {
            const parent = resolveCid(parentCid) as Directory | undefined
            if (!parent) return

            const newDoc: Document = {
                type: "document",
                name,
                createdAt: new Date().toISOString(),
                content: [],
            }
            const newDocCid = vc.put(newDoc)

            const updatedParent: Directory = {
                ...parent,
                children: [...parent.children, newDocCid],
            }
            vc.updateNode(parentCid, updatedParent)
            refresh()

            // Select the new document
            setSelectedDocumentCid(newDocCid)
            setSlateValue(EMPTY_PARAGRAPH)
            setMode("edit")
        },
        [vc, resolveCid, refresh]
    )

    // Select document
    const handleSelectDocument = useCallback(
        (docCid: CID<Document>) => {
            setSelectedDocumentCid(docCid)
            loadDocumentIntoEditor(docCid)
            setMode("edit")
        },
        [loadDocumentIntoEditor]
    )

    // Handle Slate changes
    const handleSlateChange = useCallback(
        (value: Descendant[]) => {
            setSlateValue(value)

            // Convert back to document and save
            if (selectedDocumentCid && mode === "edit" && selectedDocument) {
                const store = createStoreAdapter(vc)
                const { documentCid } = slateToDocument(value, store, selectedDocument)

                // Update the reference in the tree (replaces old CID with new one)
                const root = resolve(vc.getWorkingRoot()) as GrammarRoot | undefined
                if (root && documentCid !== selectedDocumentCid) {
                    // Use updateNode to replace the old document CID with the new one
                    // We need to rebuild the tree with the new CID
                    const newRoot = replaceDocumentCidInRoot(root, selectedDocumentCid, documentCid, resolve, vc)
                    vc.setRoot(newRoot)
                    setSelectedDocumentCid(documentCid)
                    refresh()
                }
            }
        },
        [vc, selectedDocumentCid, selectedDocument, mode, refresh, resolve]
    )

    // Branch name change
    const handleBranchNameChange = useCallback(
        (name: string) => {
            currentBranch.name = name
            refresh()
        },
        [currentBranch, refresh]
    )

    // Switch branch - preserve document selection by finding same document in new branch
    const handleSwitchBranch = useCallback(
        (branch: Branch) => {
            // Get current document path before switching
            const currentDocPath = selectedDocumentCid
                ? getDocuments(vc.getWorkingRoot()).find(d => d.cid === selectedDocumentCid)?.path
                : null

            vc.checkout(branch)
            
            // Try to find the same document in the new branch by path
            if (currentDocPath) {
                const newBranchDocs = getDocuments(vc.getWorkingRoot())
                const sameDoc = newBranchDocs.find(d => d.path === currentDocPath)
                if (sameDoc) {
                    setSelectedDocumentCid(sameDoc.cid)
                    loadDocumentIntoEditor(sameDoc.cid)
                } else {
                    setSelectedDocumentCid(null)
                    setSlateValue(EMPTY_PARAGRAPH)
                }
            } else {
                setSelectedDocumentCid(null)
                setSlateValue(EMPTY_PARAGRAPH)
            }
            
            // Stay in edit mode if we were editing on a non-default branch
            if (branch.name !== "default" && mode === "edit") {
                // Keep edit mode
            } else {
                setMode("preview")
            }
            refresh()
        },
        [vc, refresh, selectedDocumentCid, loadDocumentIntoEditor, mode, getDocuments]
    )

    // Check for conflicts (for review mode)
    const hasConflicts = useMemo(() => {
        if (mode !== "review") return false
        
        const featureCommit = resolve(currentBranch.commit)
        if (!featureCommit) return false
        
        const defaultCommitCid = defaultBranch.commit
        
        let current: typeof featureCommit | undefined = featureCommit
        while (current) {
            if (current.parents.includes(defaultCommitCid)) {
                return false
            }
            if (current.parents.length === 0) break
            current = resolve(current.parents[0])
        }
        
        return true
    }, [resolve, defaultBranch, currentBranch, mode])

    /**
     * Merge sourceBranch INTO targetBranch.
     * 
     * Flow:
     * 1. User is on feature branch with changes
     * 2. Clicks merge, selects main as target
     * 3. We merge feature into main
     * 4. Result: main gets a merge commit with feature's content
     * 5. We stay on main after the merge
     */
    const handleMergeInto = useCallback((sourceBranch: Branch, targetBranch: Branch) => {
        // Remember current document by path (not CID, since CIDs will change)
        const sourceDocPath = selectedDocumentCid
            ? getDocuments(vc.getWorkingRoot()).find(d => d.cid === selectedDocumentCid)?.path
            : null

        // Step 1: Switch to the target branch (where the merge commit will be created)
        vc.checkout(targetBranch)
        
        // Step 2: Merge the source branch into target
        // This creates a merge commit on targetBranch with source's content
        vc.merge(sourceBranch)
        
        // Step 3: Restore document selection from source branch if possible
        // (since the merged content comes from source)
        if (sourceDocPath) {
            const doc = getDocuments(vc.getWorkingRoot()).find(d => d.path === sourceDocPath)
            if (doc) {
                setSelectedDocumentCid(doc.cid)
                loadDocumentIntoEditor(doc.cid)
            } else {
                setSelectedDocumentCid(null)
                setSlateValue(EMPTY_PARAGRAPH)
            }
        }
        
        setMode("preview")
        refresh()
    }, [vc, selectedDocumentCid, loadDocumentIntoEditor, refresh, getDocuments])

    // Convenience: merge current branch into default (main)
    const handleMerge = useCallback(() => {
        handleMergeInto(currentBranch, defaultBranch)
    }, [handleMergeInto, currentBranch, defaultBranch])


    return (
        <div style={styles.container}>
            {/* Left Panel - Directory Tree */}
            <div style={styles.leftPanel}>
                {grammarRoot && (
                    <GrammarRootView
                        grammarRoot={grammarRoot}
                        resolveCid={resolveCid}
                        selectedDocumentCid={selectedDocumentCid}
                        onSelectDocument={handleSelectDocument}
                        onAddRootDirectory={handleAddRootDirectory}
                        onAddDirectory={handleAddDirectory}
                        onAddDocument={handleAddDocument}
                    />
                )}
            </div>

            {/* Right Panel - Document + Version Control */}
            <div style={styles.rightPanel}>
                {/* Review Mode - Full screen review view with integrated conflict resolution */}
                {mode === "review" ? (
                    <ReviewView
                        featureBranch={currentBranch}
                        defaultBranch={defaultBranch}
                        featureDocuments={getDocuments(vc.getWorkingRoot())}
                        defaultDocuments={getDocuments(resolve(defaultBranch.commit)?.content || vc.getWorkingRoot())}
                        resolveCid={resolveCid}
                        hasConflicts={hasConflicts}
                        onMerge={handleMerge}
                        onBackToEdit={() => setMode("edit")}
                    />
                ) : (
                    <>
                        {/* Document Area */}
                        <div style={styles.documentArea}>
                            {selectedDocumentCid ? (
                                <>
                                    <div style={styles.editHeader}>
                                        <input
                                            type="text"
                                            value={selectedDocument?.name || ""}
                                            onChange={(e) => {
                                                if (selectedDocument) {
                                                    const updated = {
                                                        ...selectedDocument,
                                                        name: e.target.value,
                                                    }
                                                    const newCid = vc.updateNode(
                                                        selectedDocumentCid,
                                                        updated as Document
                                                    )
                                                    setSelectedDocumentCid(newCid)
                                                    refresh()
                                                }
                                            }}
                                            style={styles.titleInput}
                                            placeholder="Document title..."
                                        />
                                        {currentBranch.name !== "default" && (
                                            <div 
                                                style={styles.branchIndicator}
                                                className="branch-indicator-new"
                                                key={currentBranch.uuid}
                                            >
                                                <span style={styles.branchIcon}>⎇</span>
                                                <span>{currentBranch.name}</span>
                                            </div>
                                        )}
                                    </div>
                                    <DocumentEditor
                                        value={slateValue}
                                        onChange={handleSlateChange}
                                        readOnly={false}
                                    />
                                </>
                            ) : (
                                <div style={styles.emptyState}>
                                    <div style={styles.emptyIcon}>📄</div>
                                    <h3 style={styles.emptyTitle}>No document selected</h3>
                                    <p style={styles.emptyText}>
                                        Select a document from the sidebar or create a new one
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Version Control Panel */}
                        <VersionControlPanel
                            currentBranch={currentBranch}
                            branches={branches}
                            defaultBranchName="default"
                            isDirty={isDirty}
                            commitHistory={getCommitHistory()}
                            onBranchNameChange={handleBranchNameChange}
                            onSwitchBranch={handleSwitchBranch}
                            onCreateBranch={handleCreateBranch}
                            onCreateBranchFromCommit={handleCreateBranchFromCommit}
                            onCommit={handleCommit}
                            onMergeInto={handleMergeInto}
                            onViewCommit={handleViewCommit}
                        />
                    </>
                )}
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        height: "100vh",
        background: "var(--bg-primary)",
    },
    leftPanel: {
        width: 280,
        minWidth: 280,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--bg-tertiary)",
        display: "flex",
        flexDirection: "column",
    },
    rightPanel: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    documentArea: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 16,
    },
    editHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 16,
    },
    titleInput: {
        flex: 1,
        background: "transparent",
        border: "none",
        borderBottom: "2px solid var(--bg-tertiary)",
        padding: "8px 0",
        fontSize: 24,
        fontWeight: 600,
        color: "var(--text-primary)",
        outline: "none",
        transition: "border-color 0.2s ease",
    },
    branchIndicator: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "rgba(99, 102, 241, 0.15)",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        color: "var(--accent)",
        whiteSpace: "nowrap",
    },
    branchIcon: {
        fontSize: 14,
    },
    emptyState: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-secondary)",
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
        opacity: 0.5,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 600,
        color: "var(--text-primary)",
        margin: "0 0 8px 0",
    },
    emptyText: {
        fontSize: 14,
        margin: 0,
    },
}
