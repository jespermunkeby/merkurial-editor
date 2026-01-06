import { useState, useMemo } from "react"
import { CID, CIDable } from "../../version_control/cid"
import { Document, BlockNode, InlineNode } from "../../version_control/immutable/grammar"
import { Branch } from "../../version_control/mutable/branch"

type DocumentInfo = {
    cid: CID<Document>
    doc: Document & { name?: string }
    path: string
}

type Resolution = "ours" | "theirs" | null

type ConflictState = {
    [path: string]: Resolution
}

type ReviewViewProps = {
    featureBranch: Branch
    defaultBranch: Branch
    featureDocuments: DocumentInfo[]
    defaultDocuments: DocumentInfo[]
    resolveCid: <T>(cid: CID<T>) => T | undefined
    hasConflicts: boolean
    onMerge: () => void
    onBackToEdit: () => void
}

export function ReviewView({
    featureBranch,
    defaultBranch,
    featureDocuments,
    defaultDocuments,
    resolveCid,
    hasConflicts,
    onMerge,
    onBackToEdit,
}: ReviewViewProps) {
    // Track conflict resolutions
    const [resolutions, setResolutions] = useState<ConflictState>({})

    // Build a map of default documents by path for comparison
    const defaultDocsByPath = useMemo(() => {
        const map = new Map<string, DocumentInfo>()
        for (const doc of defaultDocuments) {
            map.set(doc.path, doc)
        }
        return map
    }, [defaultDocuments])

    // Build a map of feature documents by path
    const featureDocsByPath = useMemo(() => {
        const map = new Map<string, DocumentInfo>()
        for (const doc of featureDocuments) {
            map.set(doc.path, doc)
        }
        return map
    }, [featureDocuments])

    // Categorize documents
    const { added, modified, conflicts, unchanged } = useMemo(() => {
        const added: DocumentInfo[] = []
        const modified: { feature: DocumentInfo; base: DocumentInfo }[] = []
        const conflicts: { feature: DocumentInfo; base: DocumentInfo }[] = []
        const unchanged: DocumentInfo[] = []

        for (const featureDoc of featureDocuments) {
            const baseDoc = defaultDocsByPath.get(featureDoc.path)
            if (!baseDoc) {
                added.push(featureDoc)
            } else if (baseDoc.cid !== featureDoc.cid) {
                // If there are conflicts (default has diverged), mark as conflict
                // Otherwise it's just a modification
                if (hasConflicts) {
                    conflicts.push({ feature: featureDoc, base: baseDoc })
                } else {
                    modified.push({ feature: featureDoc, base: baseDoc })
                }
            } else {
                unchanged.push(featureDoc)
            }
        }

        // Also check for documents that exist in default but not in feature (deleted)
        // For now, we'll skip this case

        return { added, modified, conflicts, unchanged }
    }, [featureDocuments, defaultDocsByPath, hasConflicts])

    // Check if all conflicts are resolved
    const allConflictsResolved = useMemo(() => {
        if (!hasConflicts) return true
        return conflicts.every(({ feature }) => resolutions[feature.path] !== undefined && resolutions[feature.path] !== null)
    }, [conflicts, resolutions, hasConflicts])

    // Count resolved conflicts
    const resolvedCount = useMemo(() => {
        return conflicts.filter(({ feature }) => resolutions[feature.path]).length
    }, [conflicts, resolutions])

    const handleResolve = (path: string, resolution: Resolution) => {
        setResolutions(prev => ({ ...prev, [path]: resolution }))
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <h2 style={styles.title}>Review Changes</h2>
                    <div style={styles.branchInfo}>
                        <span style={styles.branchLabel}>Merging</span>
                        <span style={styles.branchName}>{featureBranch.name}</span>
                        <span style={styles.branchArrow}>→</span>
                        <span style={styles.branchName}>{defaultBranch.name}</span>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    <button style={styles.backButton} onClick={onBackToEdit}>
                        ← Back to Editing
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div style={styles.summary}>
                <div style={styles.summaryItem}>
                    <span style={styles.summaryCount}>{added.length}</span>
                    <span style={styles.summaryLabel}>Added</span>
                </div>
                <div style={styles.summaryItem}>
                    <span style={styles.summaryCount}>{modified.length}</span>
                    <span style={styles.summaryLabel}>Modified</span>
                </div>
                {hasConflicts && (
                    <div style={styles.summaryItem}>
                        <span style={{ ...styles.summaryCount, color: "#f59e0b" }}>
                            {resolvedCount}/{conflicts.length}
                        </span>
                        <span style={styles.summaryLabel}>Conflicts Resolved</span>
                    </div>
                )}
                <div style={styles.summaryItem}>
                    <span style={styles.summaryCount}>{unchanged.length}</span>
                    <span style={styles.summaryLabel}>Unchanged</span>
                </div>
            </div>

            {/* Document Changes */}
            <div style={styles.changes}>
                {/* Conflicts - Action Required */}
                {conflicts.length > 0 && (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>
                            <span style={styles.conflictBadge}>!</span> Action Required
                        </h3>
                        {conflicts.map(({ feature, base }) => (
                            <ConflictCard
                                key={feature.path}
                                feature={feature}
                                base={base}
                                featureBranch={featureBranch}
                                defaultBranch={defaultBranch}
                                resolveCid={resolveCid}
                                resolution={resolutions[feature.path] || null}
                                onResolve={(resolution) => handleResolve(feature.path, resolution)}
                            />
                        ))}
                    </div>
                )}

                {/* Added Documents */}
                {added.length > 0 && (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>
                            <span style={styles.addedBadge}>+</span> Added Documents
                        </h3>
                        {added.map((doc) => (
                            <div key={doc.cid} style={styles.documentCard}>
                                <div style={styles.documentHeader}>
                                    <span style={styles.documentPath}>{doc.path}</span>
                                    <span style={styles.addedTag}>New</span>
                                </div>
                                <div style={styles.documentPreview}>
                                    <DocumentPreview
                                        doc={doc.doc}
                                        resolveCid={resolveCid}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modified Documents (no conflict) */}
                {modified.length > 0 && (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>
                            <span style={styles.modifiedBadge}>~</span> Modified Documents
                        </h3>
                        {modified.map(({ feature, base }) => (
                            <div key={feature.cid} style={styles.documentCard}>
                                <div style={styles.documentHeader}>
                                    <span style={styles.documentPath}>{feature.path}</span>
                                    <span style={styles.modifiedTag}>Changed</span>
                                </div>
                                <div style={styles.diffContainer}>
                                    <DiffSide
                                        label="Before"
                                        branchName={defaultBranch.name}
                                        doc={base.doc}
                                        resolveCid={resolveCid}
                                        variant="removed"
                                    />
                                    <div style={styles.diffDivider} />
                                    <DiffSide
                                        label="After"
                                        branchName={featureBranch.name}
                                        doc={feature.doc}
                                        resolveCid={resolveCid}
                                        variant="added"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {added.length === 0 && modified.length === 0 && conflicts.length === 0 && (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>✓</div>
                        <p style={styles.emptyText}>No changes to review</p>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div style={styles.footer}>
                {hasConflicts && !allConflictsResolved ? (
                    <>
                        <div style={styles.conflictBanner}>
                            <span style={styles.conflictIcon}>⚠️</span>
                            <span>Resolve all conflicts to merge ({resolvedCount}/{conflicts.length} resolved)</span>
                        </div>
                        <button style={styles.mergeButtonDisabled} disabled>
                            Merge Changes
                        </button>
                    </>
                ) : (
                    <>
                        <div style={styles.readyBanner}>
                            <span style={styles.readyIcon}>✓</span>
                            <span>Ready to merge into {defaultBranch.name}</span>
                        </div>
                        <button style={styles.mergeButton} onClick={onMerge}>
                            Merge Changes
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

// Conflict Card with resolution UI
function ConflictCard({
    feature,
    base,
    featureBranch,
    defaultBranch,
    resolveCid,
    resolution,
    onResolve,
}: {
    feature: DocumentInfo
    base: DocumentInfo
    featureBranch: Branch
    defaultBranch: Branch
    resolveCid: <T>(cid: CID<T>) => T | undefined
    resolution: Resolution
    onResolve: (resolution: Resolution) => void
}) {
    return (
        <div style={{
            ...styles.documentCard,
            borderColor: resolution ? "var(--success)" : "#f59e0b",
            borderWidth: 2,
        }}>
            <div style={{
                ...styles.documentHeader,
                background: resolution ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
            }}>
                <span style={styles.documentPath}>{feature.path}</span>
                {resolution ? (
                    <span style={styles.resolvedTag}>
                        ✓ Using {resolution === "ours" ? "your" : "their"} version
                    </span>
                ) : (
                    <span style={styles.conflictTag}>Choose a version</span>
                )}
            </div>
            <div style={styles.diffContainer}>
                <div
                    style={{
                        ...styles.diffSide,
                        cursor: "pointer",
                        background: resolution === "theirs" ? "rgba(34, 197, 94, 0.1)" : undefined,
                        borderRadius: 0,
                    }}
                    onClick={() => onResolve("theirs")}
                >
                    <div style={styles.diffHeader}>
                        <span style={styles.diffLabel}>Their Version</span>
                        <span style={styles.diffBranch}>{defaultBranch.name}</span>
                    </div>
                    <div style={styles.diffContent}>
                        <DocumentPreview
                            doc={base.doc}
                            resolveCid={resolveCid}
                            variant={resolution === "theirs" ? "selected" : undefined}
                        />
                    </div>
                    <div style={styles.chooseButtonContainer}>
                        <button
                            style={resolution === "theirs" ? styles.chooseButtonSelected : styles.chooseButton}
                            onClick={(e) => {
                                e.stopPropagation()
                                onResolve("theirs")
                            }}
                        >
                            {resolution === "theirs" ? "✓ Selected" : "Use This Version"}
                        </button>
                    </div>
                </div>
                <div style={styles.diffDivider}>
                    <div style={styles.vsLabel}>VS</div>
                </div>
                <div
                    style={{
                        ...styles.diffSide,
                        cursor: "pointer",
                        background: resolution === "ours" ? "rgba(34, 197, 94, 0.1)" : undefined,
                        borderRadius: 0,
                    }}
                    onClick={() => onResolve("ours")}
                >
                    <div style={styles.diffHeader}>
                        <span style={styles.diffLabel}>Your Version</span>
                        <span style={styles.diffBranch}>{featureBranch.name}</span>
                    </div>
                    <div style={styles.diffContent}>
                        <DocumentPreview
                            doc={feature.doc}
                            resolveCid={resolveCid}
                            variant={resolution === "ours" ? "selected" : undefined}
                        />
                    </div>
                    <div style={styles.chooseButtonContainer}>
                        <button
                            style={resolution === "ours" ? styles.chooseButtonSelected : styles.chooseButton}
                            onClick={(e) => {
                                e.stopPropagation()
                                onResolve("ours")
                            }}
                        >
                            {resolution === "ours" ? "✓ Selected" : "Use This Version"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Diff Side Component
function DiffSide({
    label,
    branchName,
    doc,
    resolveCid,
    variant,
}: {
    label: string
    branchName: string
    doc: Document & { name?: string }
    resolveCid: <T>(cid: CID<T>) => T | undefined
    variant?: "added" | "removed"
}) {
    return (
        <div style={styles.diffSide}>
            <div style={styles.diffHeader}>
                <span style={styles.diffLabel}>{label}</span>
                <span style={styles.diffBranch}>{branchName}</span>
            </div>
            <div style={styles.diffContent}>
                <DocumentPreview doc={doc} resolveCid={resolveCid} variant={variant} />
            </div>
        </div>
    )
}

// Document Preview Component
function DocumentPreview({
    doc,
    resolveCid,
    variant,
}: {
    doc: Document & { name?: string }
    resolveCid: <T>(cid: CID<T>) => T | undefined
    variant?: "added" | "removed" | "selected"
}) {
    if (doc.content.length === 0) {
        return <div style={styles.emptyDoc}>Empty document</div>
    }

    const contentStyle = variant === "added" 
        ? styles.addedContent 
        : variant === "removed" 
        ? styles.removedContent 
        : variant === "selected"
        ? styles.selectedContent
        : {}

    return (
        <div style={contentStyle}>
            {doc.content.map((blockCid, i) => (
                <BlockPreview
                    key={`${blockCid}-${i}`}
                    blockCid={blockCid}
                    resolveCid={resolveCid}
                />
            ))}
        </div>
    )
}

function BlockPreview({
    blockCid,
    resolveCid,
}: {
    blockCid: CID<BlockNode>
    resolveCid: <T>(cid: CID<T>) => T | undefined
}) {
    const block = resolveCid(blockCid) as BlockNode | undefined
    if (!block) return null

    switch (block.type) {
        case "heading":
            return (
                <div style={{ ...styles.blockHeading, fontSize: 20 - (block.level - 1) * 2 }}>
                    <InlinePreview inlineCids={block.content} resolveCid={resolveCid} />
                </div>
            )
        case "paragraph":
            return (
                <p style={styles.blockParagraph}>
                    <InlinePreview inlineCids={block.content} resolveCid={resolveCid} />
                </p>
            )
        case "code_block":
            return <pre style={styles.blockCode}>{block.value}</pre>
        case "list": {
            const ListTag = block.ordered ? "ol" : "ul"
            return (
                <ListTag style={styles.blockList}>
                    {block.items.map((itemCid, i) => {
                        const item = resolveCid(itemCid)
                        if (!item) return null
                        return (
                            <li key={i}>
                                {item.content.map((bc, j) => (
                                    <BlockPreview key={j} blockCid={bc} resolveCid={resolveCid} />
                                ))}
                            </li>
                        )
                    })}
                </ListTag>
            )
        }
        case "blockquote":
            return (
                <blockquote style={styles.blockQuote}>
                    {block.content.map((bc, i) => (
                        <BlockPreview key={i} blockCid={bc} resolveCid={resolveCid} />
                    ))}
                </blockquote>
            )
        case "horizontal_rule":
            return <hr style={styles.blockHr} />
        default:
            return null
    }
}

function InlinePreview({
    inlineCids,
    resolveCid,
}: {
    inlineCids: CID<InlineNode>[]
    resolveCid: <T>(cid: CID<T>) => T | undefined
}) {
    return (
        <>
            {inlineCids.map((cid, i) => {
                const inline = resolveCid(cid) as InlineNode | undefined
                if (!inline) return null

                switch (inline.type) {
                    case "text":
                        return <span key={i}>{inline.value}</span>
                    case "strong":
                        return (
                            <strong key={i}>
                                <InlinePreview inlineCids={inline.content} resolveCid={resolveCid} />
                            </strong>
                        )
                    case "emphasis":
                        return (
                            <em key={i}>
                                <InlinePreview inlineCids={inline.content} resolveCid={resolveCid} />
                            </em>
                        )
                    case "code_span":
                        return <code key={i} style={styles.inlineCode}>{inline.value}</code>
                    case "link":
                        return (
                            <a key={i} href={inline.href} style={styles.inlineLink}>
                                <InlinePreview inlineCids={inline.content} resolveCid={resolveCid} />
                            </a>
                        )
                    default:
                        return null
                }
            })}
        </>
    )
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px",
        borderBottom: "1px solid var(--bg-tertiary)",
        background: "var(--bg-secondary)",
    },
    headerLeft: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    headerRight: {},
    title: {
        margin: 0,
        fontSize: 20,
        fontWeight: 600,
        color: "var(--text-primary)",
    },
    branchInfo: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
    },
    branchLabel: {
        color: "var(--text-secondary)",
    },
    branchName: {
        padding: "2px 8px",
        background: "var(--bg-tertiary)",
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        color: "var(--text-primary)",
    },
    branchArrow: {
        color: "var(--text-secondary)",
    },
    backButton: {
        background: "transparent",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--bg-tertiary)",
        borderRadius: 6,
        padding: "8px 16px",
        color: "var(--text-secondary)",
        fontSize: 13,
        cursor: "pointer",
    },
    summary: {
        display: "flex",
        gap: 32,
        padding: "16px 24px",
        borderBottom: "1px solid var(--bg-tertiary)",
        background: "var(--bg-secondary)",
    },
    summaryItem: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    summaryCount: {
        fontSize: 24,
        fontWeight: 600,
        color: "var(--text-primary)",
    },
    summaryLabel: {
        fontSize: 12,
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    },
    changes: {
        flex: 1,
        overflow: "auto",
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "0 0 16px 0",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-primary)",
    },
    addedBadge: {
        width: 20,
        height: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(34, 197, 94, 0.2)",
        color: "#22c55e",
        borderRadius: 4,
        fontWeight: 700,
    },
    modifiedBadge: {
        width: 20,
        height: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(99, 102, 241, 0.2)",
        color: "var(--accent)",
        borderRadius: 4,
        fontWeight: 700,
    },
    conflictBadge: {
        width: 20,
        height: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(245, 158, 11, 0.2)",
        color: "#f59e0b",
        borderRadius: 4,
        fontWeight: 700,
    },
    documentCard: {
        background: "var(--bg-secondary)",
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--bg-tertiary)",
        marginBottom: 16,
        overflow: "hidden",
    },
    documentHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid var(--bg-tertiary)",
        background: "var(--bg-tertiary)",
    },
    documentPath: {
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--text-primary)",
    },
    addedTag: {
        padding: "2px 8px",
        background: "rgba(34, 197, 94, 0.2)",
        color: "#22c55e",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
    },
    modifiedTag: {
        padding: "2px 8px",
        background: "rgba(99, 102, 241, 0.2)",
        color: "var(--accent)",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
    },
    conflictTag: {
        padding: "4px 12px",
        background: "rgba(245, 158, 11, 0.2)",
        color: "#f59e0b",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
    },
    resolvedTag: {
        padding: "4px 12px",
        background: "rgba(34, 197, 94, 0.2)",
        color: "#22c55e",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
    },
    documentPreview: {
        padding: 16,
    },
    diffContainer: {
        display: "flex",
    },
    diffSide: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
    },
    diffHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        borderBottom: "1px solid var(--bg-tertiary)",
    },
    diffLabel: {
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        color: "var(--text-secondary)",
    },
    diffBranch: {
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        color: "var(--text-secondary)",
    },
    diffContent: {
        padding: 16,
        minHeight: 100,
        flex: 1,
    },
    diffDivider: {
        width: 1,
        background: "var(--bg-tertiary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    vsLabel: {
        position: "absolute",
        background: "var(--bg-tertiary)",
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        color: "var(--text-secondary)",
    },
    chooseButtonContainer: {
        padding: "12px 16px",
        borderTop: "1px solid var(--bg-tertiary)",
    },
    chooseButton: {
        width: "100%",
        padding: "8px 16px",
        background: "var(--bg-tertiary)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "transparent",
        borderRadius: 6,
        color: "var(--text-secondary)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
    },
    chooseButtonSelected: {
        width: "100%",
        padding: "8px 16px",
        background: "var(--success)",
        border: "none",
        borderRadius: 6,
        color: "white",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
    },
    addedContent: {
        background: "rgba(34, 197, 94, 0.05)",
        borderRadius: 4,
        padding: 8,
    },
    removedContent: {
        background: "rgba(239, 68, 68, 0.05)",
        borderRadius: 4,
        padding: 8,
    },
    selectedContent: {
        background: "rgba(34, 197, 94, 0.1)",
        borderRadius: 4,
        padding: 8,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: "var(--success)",
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 64,
        color: "var(--text-secondary)",
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
        color: "var(--success)",
    },
    emptyText: {
        fontSize: 14,
        margin: 0,
    },
    emptyDoc: {
        color: "var(--text-secondary)",
        fontStyle: "italic",
        fontSize: 13,
    },
    footer: {
        padding: "16px 24px",
        borderTop: "1px solid var(--bg-tertiary)",
        background: "var(--bg-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    conflictBanner: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "#f59e0b",
        fontSize: 14,
    },
    conflictIcon: {
        fontSize: 18,
    },
    readyBanner: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "var(--success)",
        fontSize: 14,
    },
    readyIcon: {
        fontSize: 18,
    },
    mergeButton: {
        background: "var(--success)",
        border: "none",
        borderRadius: 6,
        padding: "10px 24px",
        color: "white",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
    },
    mergeButtonDisabled: {
        background: "var(--bg-tertiary)",
        border: "none",
        borderRadius: 6,
        padding: "10px 24px",
        color: "var(--text-secondary)",
        fontSize: 14,
        fontWeight: 600,
        cursor: "not-allowed",
    },
    // Block styles
    blockHeading: {
        fontWeight: 600,
        marginBottom: 8,
        color: "var(--text-primary)",
    },
    blockParagraph: {
        margin: "0 0 8px 0",
        lineHeight: 1.6,
        color: "var(--text-primary)",
        fontSize: 14,
    },
    blockCode: {
        background: "var(--bg-primary)",
        padding: 12,
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        margin: "0 0 8px 0",
        overflow: "auto",
    },
    blockList: {
        margin: "0 0 8px 0",
        paddingLeft: 20,
    },
    blockQuote: {
        margin: "0 0 8px 0",
        paddingLeft: 12,
        borderLeft: "3px solid var(--accent)",
        color: "var(--text-secondary)",
        fontStyle: "italic",
    },
    blockHr: {
        border: "none",
        borderTop: "1px solid var(--bg-tertiary)",
        margin: "16px 0",
    },
    inlineCode: {
        background: "var(--bg-tertiary)",
        padding: "2px 4px",
        borderRadius: 3,
        fontFamily: "var(--font-mono)",
        fontSize: "0.9em",
    },
    inlineLink: {
        color: "var(--accent)",
        textDecoration: "underline",
    },
}
