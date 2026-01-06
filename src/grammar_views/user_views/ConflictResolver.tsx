import { CID } from "../../version_control/cid"

type ConflictItem = {
    path: string
    oursCid: CID<any>
    theirsCid: CID<any>
    oursContent: any
    theirsContent: any
    resolution: "ours" | "theirs" | "manual" | null
    manualContent?: any
}

type ConflictResolverProps = {
    conflicts: ConflictItem[]
    onResolve: (index: number, resolution: "ours" | "theirs" | "manual", manualContent?: any) => void
    onFinishResolve: () => void
    allResolved: boolean
}

export function ConflictResolver({
    conflicts,
    onResolve,
    onFinishResolve,
    allResolved,
}: ConflictResolverProps) {
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Resolve Conflicts</h2>
                <span style={styles.count}>
                    {conflicts.filter((c) => c.resolution).length} / {conflicts.length} resolved
                </span>
            </div>

            <div style={styles.conflictList}>
                {conflicts.map((conflict, index) => (
                    <div key={index} style={styles.conflictItem}>
                        <div style={styles.conflictPath}>{conflict.path}</div>
                        
                        <div style={styles.versions}>
                            <div
                                style={{
                                    ...styles.versionCard,
                                    ...(conflict.resolution === "ours" ? styles.versionSelected : {}),
                                }}
                                onClick={() => onResolve(index, "ours")}
                            >
                                <div style={styles.versionHeader}>
                                    <span style={styles.versionLabel}>Your Version</span>
                                    {conflict.resolution === "ours" && (
                                        <span style={styles.checkmark}>✓</span>
                                    )}
                                </div>
                                <pre style={styles.versionContent}>
                                    {JSON.stringify(conflict.oursContent, null, 2)}
                                </pre>
                            </div>

                            <div
                                style={{
                                    ...styles.versionCard,
                                    ...(conflict.resolution === "theirs" ? styles.versionSelected : {}),
                                }}
                                onClick={() => onResolve(index, "theirs")}
                            >
                                <div style={styles.versionHeader}>
                                    <span style={styles.versionLabel}>Their Version</span>
                                    {conflict.resolution === "theirs" && (
                                        <span style={styles.checkmark}>✓</span>
                                    )}
                                </div>
                                <pre style={styles.versionContent}>
                                    {JSON.stringify(conflict.theirsContent, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.footer}>
                <button
                    style={{
                        ...styles.finishButton,
                        ...(allResolved ? {} : styles.finishButtonDisabled),
                    }}
                    onClick={onFinishResolve}
                    disabled={!allResolved}
                >
                    {allResolved ? "Apply Resolutions & Merge" : "Resolve all conflicts to continue"}
                </button>
            </div>
        </div>
    )
}

export type { ConflictItem }

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-secondary)",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--bg-tertiary)",
    },
    title: {
        fontSize: 18,
        fontWeight: 600,
        color: "var(--text-primary)",
        margin: 0,
    },
    count: {
        fontSize: 13,
        color: "var(--text-secondary)",
    },
    conflictList: {
        flex: 1,
        overflow: "auto",
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
    },
    conflictItem: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    conflictPath: {
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        color: "var(--accent)",
    },
    versions: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
    },
    versionCard: {
        background: "var(--bg-tertiary)",
        border: "2px solid transparent",
        borderRadius: 8,
        padding: 12,
        cursor: "pointer",
        transition: "border-color 0.15s",
    },
    versionSelected: {
        borderColor: "var(--success)",
    },
    versionHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    versionLabel: {
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        color: "var(--text-secondary)",
    },
    checkmark: {
        color: "var(--success)",
        fontWeight: 600,
    },
    versionContent: {
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        color: "var(--text-primary)",
        background: "var(--bg-primary)",
        padding: 8,
        borderRadius: 4,
        margin: 0,
        overflow: "auto",
        maxHeight: 200,
    },
    footer: {
        padding: "16px 24px",
        borderTop: "1px solid var(--bg-tertiary)",
    },
    finishButton: {
        width: "100%",
        background: "var(--success)",
        border: "none",
        borderRadius: 6,
        padding: "12px 16px",
        color: "white",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
    },
    finishButtonDisabled: {
        background: "var(--bg-tertiary)",
        color: "var(--text-secondary)",
        cursor: "not-allowed",
    },
}

