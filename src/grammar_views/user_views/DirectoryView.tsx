import { useState, useRef, useEffect } from "react"
import { CID } from "../../version_control/cid"
import { Directory, Document } from "../../version_control/immutable/grammar"

type DirectoryViewProps = {
    directory: Directory
    directoryCid: CID<Directory>
    resolveCid: <T>(cid: CID<T>) => T | undefined
    selectedDocumentCid: CID<Document> | null
    onSelectDocument: (cid: CID<Document>) => void
    onAddDirectory: (parentCid: CID<Directory>, name: string) => void
    onAddDocument: (parentCid: CID<Directory>, name: string) => void
    depth?: number
}

export function DirectoryView({
    directory,
    directoryCid,
    resolveCid,
    selectedDocumentCid,
    onSelectDocument,
    onAddDirectory,
    onAddDocument,
    depth = 0
}: DirectoryViewProps) {
    const [isAddingFolder, setIsAddingFolder] = useState(false)
    const [isAddingDoc, setIsAddingDoc] = useState(false)
    const [newName, setNewName] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if ((isAddingFolder || isAddingDoc) && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isAddingFolder, isAddingDoc])

    const handleAddFolder = () => {
        setIsAddingFolder(true)
        setNewName("")
    }

    const handleAddDoc = () => {
        setIsAddingDoc(true)
        setNewName("")
    }

    const handleSubmit = () => {
        if (newName.trim()) {
            if (isAddingFolder) {
                onAddDirectory(directoryCid, newName.trim())
            } else if (isAddingDoc) {
                onAddDocument(directoryCid, newName.trim())
            }
        }
        setIsAddingFolder(false)
        setIsAddingDoc(false)
        setNewName("")
    }

    const handleCancel = () => {
        setIsAddingFolder(false)
        setIsAddingDoc(false)
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
        <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
            <div style={styles.directoryHeader}>
                <span style={styles.folderIcon}>📁</span>
                <span style={styles.directoryName}>{directory.name}</span>
                <div style={styles.actions}>
                    <button
                        style={styles.addButton}
                        onClick={handleAddFolder}
                        title="Add folder"
                    >
                        +📁
                    </button>
                    <button
                        style={styles.addButton}
                        onClick={handleAddDoc}
                        title="Add document"
                    >
                        +📄
                    </button>
                </div>
            </div>
            <div style={styles.children}>
                {/* Inline input for new folder */}
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

                {/* Inline input for new document */}
                {isAddingDoc && (
                    <div style={styles.newItemRow}>
                        <span style={styles.docIcon}>📄</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSubmit}
                            style={styles.newItemInput}
                            placeholder="Document name..."
                        />
                    </div>
                )}

                {directory.children.map((childCid) => {
                    // Type assertion needed because children can be Directory or Document
                    const child = resolveCid(childCid as CID<Directory | Document>) as (Directory | Document) | undefined
                    if (!child) return null

                    if (child.type === "folder") {
                        const dir = child as Directory
                        return (
                            <DirectoryView
                                key={childCid}
                                directory={dir}
                                directoryCid={childCid as CID<Directory>}
                                resolveCid={resolveCid}
                                selectedDocumentCid={selectedDocumentCid}
                                onSelectDocument={onSelectDocument}
                                onAddDirectory={onAddDirectory}
                                onAddDocument={onAddDocument}
                                depth={depth + 1}
                            />
                        )
                    } else {
                        const doc = child as Document & { name?: string }
                        const isSelected = selectedDocumentCid === childCid
                        return (
                            <div
                                key={childCid}
                                style={{
                                    ...styles.documentItem,
                                    ...(isSelected ? styles.documentItemSelected : {})
                                }}
                                onClick={() => onSelectDocument(childCid as CID<Document>)}
                            >
                                <span style={styles.docIcon}>📄</span>
                                <span>{doc.name || "Untitled"}</span>
                            </div>
                        )
                    }
                })}
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    directoryHeader: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px",
        borderRadius: 4,
        cursor: "default",
    },
    folderIcon: {
        fontSize: 14,
    },
    directoryName: {
        flex: 1,
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-primary)",
    },
    actions: {
        display: "flex",
        gap: 2,
        opacity: 0.6,
    },
    addButton: {
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        padding: "2px 4px",
        borderRadius: 3,
        color: "var(--text-secondary)",
    },
    children: {
        marginLeft: 8,
        borderLeft: "1px solid var(--bg-tertiary)",
        paddingLeft: 4,
    },
    documentItem: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 13,
        color: "var(--text-secondary)",
        transition: "background 0.15s",
    },
    documentItemSelected: {
        background: "var(--accent)",
        color: "var(--text-primary)",
    },
    docIcon: {
        fontSize: 14,
    },
    newItemRow: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
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
