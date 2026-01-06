import { useState, useRef, useEffect } from "react"
import { CID } from "../../version_control/cid"
import { Directory, Document, GrammarRoot } from "../../version_control/immutable/grammar"
import { DirectoryView } from "./DirectoryView"

type GrammarRootViewProps = {
    grammarRoot: GrammarRoot
    resolveCid: <T>(cid: CID<T>) => T | undefined
    selectedDocumentCid: CID<Document> | null
    onSelectDocument: (cid: CID<Document>) => void
    onAddRootDirectory: (name: string) => void
    onAddDirectory: (parentCid: CID<Directory>, name: string) => void
    onAddDocument: (parentCid: CID<Directory>, name: string) => void
}

export function GrammarRootView({
    grammarRoot,
    resolveCid,
    selectedDocumentCid,
    onSelectDocument,
    onAddRootDirectory,
    onAddDirectory,
    onAddDocument,
}: GrammarRootViewProps) {
    const [isAddingFolder, setIsAddingFolder] = useState(false)
    const [newName, setNewName] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isAddingFolder && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isAddingFolder])

    const handleAddFolder = () => {
        setIsAddingFolder(true)
        setNewName("")
    }

    const handleSubmit = () => {
        if (newName.trim()) {
            onAddRootDirectory(newName.trim())
        }
        setIsAddingFolder(false)
        setNewName("")
    }

    const handleCancel = () => {
        setIsAddingFolder(false)
        setNewName("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSubmit()
        } else if (e.key === "Escape") {
            handleCancel()
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>Project</span>
                <button
                    style={styles.addRootButton}
                    onClick={handleAddFolder}
                    title="Add root folder"
                >
                    + 📁
                </button>
            </div>
            <div style={styles.tree}>
                {/* Inline input for new root folder */}
                {isAddingFolder && (
                    <div style={styles.newItemRow}>
                        <span style={styles.folderIcon}>📁</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSubmit}
                            style={styles.newItemInput}
                            placeholder="Folder name..."
                        />
                    </div>
                )}

                {grammarRoot.content.length === 0 && !isAddingFolder ? (
                    <div style={styles.empty}>
                        No folders yet. Click + to create one.
                    </div>
                ) : (
                    grammarRoot.content.map((dirCid) => {
                        const dir = resolveCid(dirCid)
                        if (!dir) return null
                        return (
                            <DirectoryView
                                key={dirCid}
                                directory={dir as Directory}
                                directoryCid={dirCid}
                                resolveCid={resolveCid}
                                selectedDocumentCid={selectedDocumentCid}
                                onSelectDocument={onSelectDocument}
                                onAddDirectory={onAddDirectory}
                                onAddDocument={onAddDocument}
                            />
                        )
                    })
                )}
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid var(--bg-tertiary)",
    },
    title: {
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "var(--text-secondary)",
    },
    addRootButton: {
        background: "var(--bg-tertiary)",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 4,
        color: "var(--text-primary)",
    },
    tree: {
        flex: 1,
        overflow: "auto",
        padding: "8px",
    },
    empty: {
        padding: "24px 16px",
        textAlign: "center",
        color: "var(--text-secondary)",
        fontSize: 13,
    },
    newItemRow: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        marginBottom: 4,
    },
    folderIcon: {
        fontSize: 14,
    },
    newItemInput: {
        flex: 1,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--accent)",
        borderRadius: 4,
        padding: "4px 8px",
        fontSize: 13,
        color: "var(--text-primary)",
        outline: "none",
    },
}
