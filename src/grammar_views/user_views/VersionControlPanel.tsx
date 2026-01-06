import { useMemo, useState, useCallback } from "react"
import { Branch } from "../../version_control/mutable/branch"
import { CommitNode } from "../../version_control/HistoryView"
import { CID } from "../../version_control/cid"
import { Commit } from "../../version_control/immutable/commit"

type VersionControlPanelProps = {
    currentBranch: Branch
    branches: Branch[]
    defaultBranchName: string
    isDirty: boolean
    commitHistory: CommitNode[]
    onBranchNameChange: (name: string) => void
    onSwitchBranch: (branch: Branch) => void
    onCreateBranch: (name: string) => void
    onCreateBranchFromCommit: (name: string, commitCid: CID<Commit>) => void
    onCommit: (message: string) => void
    onMergeInto: (sourceBranch: Branch, targetBranch: Branch) => void
    onViewCommit: (cid: CID<Commit>) => void
}

// Layout constants - git-graph style (vertical, oldest at top)
const ROW_HEIGHT = 22
const LANE_WIDTH = 14
const LEFT_PAD = 8

// Branch colors - vibrant, distinct
const COLORS = ["#22c55e", "#a855f7", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#8b5cf6"]

type LayoutNode = CommitNode & {
    row: number
    lane: number
    color: string
}

type Edge = {
    fromRow: number
    fromLane: number
    toRow: number
    toLane: number
    color: string
    isMerge: boolean
}

/**
 * Build a git-graph style layout:
 * - Commits flow top to bottom (oldest at top, newest at bottom)
 * - Each branch gets a lane (column)
 * - Main/default branch is lane 0 (leftmost)
 * - Edges connect parent to child with clean vertical/diagonal lines
 */
function buildGitGraphLayout(commits: CommitNode[], branches: Branch[], currentBranchUuid: string) {
    if (!commits.length) {
        return { nodes: [] as LayoutNode[], edges: [] as Edge[], lanes: 0, rows: 0, branchLanes: new Map<string, number>() }
    }

    // Sort commits by timestamp (oldest first - they go at top, like reading history)
    const sorted = [...commits].sort((a, b) => 
        new Date(a.commit.timestamp).getTime() - new Date(b.commit.timestamp).getTime()
    )

    // Assign lanes to branches (0 = default/main, others get sequential lanes)
    const branchLanes = new Map<string, number>()
    const defaultBranch = branches.find(b => b.name === "default")
    if (defaultBranch) branchLanes.set(defaultBranch.uuid, 0)
    
    let nextLane = 1
    branches.forEach(b => {
        if (b.name !== "default" && !branchLanes.has(b.uuid)) {
            branchLanes.set(b.uuid, nextLane++)
        }
    })

    // Assign lane to each commit based on which branch it belongs to
    const commitLane = new Map<string, number>()
    const commitMap = new Map(commits.map(c => [c.cid, c]))
    
    // First pass: assign commits that are branch heads
    commits.forEach(c => {
        if (c.branches.length > 0) {
            const lane = branchLanes.get(c.branches[0].uuid) ?? 0
            commitLane.set(c.cid, lane)
        }
    })

    // Second pass: propagate lanes backwards from heads to roots
    // We iterate newest-to-oldest, following first-parent chains
    const sortedNewestFirst = [...sorted].reverse()
    
    // Keep propagating until no changes
    let changed = true
    while (changed) {
        changed = false
        sortedNewestFirst.forEach(c => {
            if (commitLane.has(c.cid)) {
                // Propagate our lane to our first parent (if it doesn't have one yet)
                const firstParent = c.commit.parents[0]
                if (firstParent && commitMap.has(firstParent) && !commitLane.has(firstParent)) {
                    commitLane.set(firstParent, commitLane.get(c.cid)!)
                    changed = true
                }
            }
        })
    }
    
    // Any remaining commits without a lane go to lane 0 (main)
    commits.forEach(c => {
        if (!commitLane.has(c.cid)) {
            commitLane.set(c.cid, 0)
        }
    })

    // Build layout nodes
    const nodes: LayoutNode[] = sorted.map((c, i) => ({
        ...c,
        row: i,
        lane: commitLane.get(c.cid) ?? 0,
        color: COLORS[(commitLane.get(c.cid) ?? 0) % COLORS.length]
    }))

    // Create CID -> row mapping
    const cidToRow = new Map(nodes.map(n => [n.cid, n.row]))

    // Build edges
    const edges: Edge[] = []
    nodes.forEach(n => {
        n.commit.parents.forEach((parentCid, idx) => {
            const parentRow = cidToRow.get(parentCid)
            if (parentRow !== undefined) {
                const parentNode = nodes.find(p => p.cid === parentCid)
                edges.push({
                    fromRow: parentRow,
                    fromLane: parentNode?.lane ?? 0,
                    toRow: n.row,
                    toLane: n.lane,
                    color: n.color,
                    isMerge: idx > 0
                })
            }
        })
    })

    return {
        nodes,
        edges,
        lanes: Math.max(...branchLanes.values(), 0) + 1,
        rows: nodes.length,
        branchLanes
    }
}

/**
 * Render the graph column (lines and nodes) for a single row
 */
function renderGraphCell(
    row: number,
    totalRows: number,
    nodes: LayoutNode[],
    edges: Edge[],
    lanes: number,
    currentNode: LayoutNode | undefined
): JSX.Element {
    const width = LEFT_PAD + lanes * LANE_WIDTH + 8
    const height = ROW_HEIGHT
    const cy = height / 2

    // Find vertical lines that pass through this row
    const verticalLines: { lane: number; color: string }[] = []
    edges.forEach(e => {
        if (e.fromLane === e.toLane && e.fromRow < row && e.toRow > row) {
            // This edge passes through vertically
            if (!verticalLines.find(v => v.lane === e.fromLane)) {
                verticalLines.push({ lane: e.fromLane, color: e.color })
            }
        }
    })

    // Find edges that start or end at this row
    const edgesAtRow = edges.filter(e => e.fromRow === row || e.toRow === row)

    return (
        <svg width={width} height={height} style={{ display: "block", flexShrink: 0 }}>
            {/* Vertical continuation lines */}
            {verticalLines.map((v, i) => (
                <line
                    key={`v-${i}`}
                    x1={LEFT_PAD + v.lane * LANE_WIDTH}
                    y1={0}
                    x2={LEFT_PAD + v.lane * LANE_WIDTH}
                    y2={height}
                    stroke={v.color}
                    strokeWidth={2}
                />
            ))}

            {/* Edges */}
            {edgesAtRow.map((e, i) => {
                const x1 = LEFT_PAD + e.fromLane * LANE_WIDTH
                const x2 = LEFT_PAD + e.toLane * LANE_WIDTH
                
                if (e.fromRow === row && e.toRow === row) {
                    // Same row (shouldn't happen, but handle it)
                    return null
                }
                
                if (e.fromRow === row) {
                    // Edge starts here, goes down
                    if (e.fromLane === e.toLane) {
                        // Straight down
                        return (
                            <line
                                key={`e-${i}`}
                                x1={x1}
                                y1={cy}
                                x2={x1}
                                y2={height}
                                stroke={e.color}
                                strokeWidth={2}
                            />
                        )
                    } else {
                        // Diagonal - go down then across
                        return (
                            <path
                                key={`e-${i}`}
                                d={`M${x1},${cy} L${x1},${height}`}
                                fill="none"
                                stroke={e.color}
                                strokeWidth={2}
                            />
                        )
                    }
                }
                
                if (e.toRow === row) {
                    // Edge ends here, comes from above
                    if (e.fromLane === e.toLane) {
                        // Straight from above
                        return (
                            <line
                                key={`e-${i}`}
                                x1={x1}
                                y1={0}
                                x2={x1}
                                y2={cy}
                                stroke={e.color}
                                strokeWidth={2}
                            />
                        )
                    } else {
                        // Coming from different lane - diagonal entry
                        const fromX = LEFT_PAD + e.fromLane * LANE_WIDTH
                        return (
                            <path
                                key={`e-${i}`}
                                d={`M${fromX},${0} L${fromX},${cy - 8} L${x2},${cy}`}
                                fill="none"
                                stroke={e.color}
                                strokeWidth={2}
                                strokeDasharray={e.isMerge ? "3,2" : undefined}
                            />
                        )
                    }
                }
                
                return null
            })}

            {/* Node circle */}
            {currentNode && (
                <>
                    <circle
                        cx={LEFT_PAD + currentNode.lane * LANE_WIDTH}
                        cy={cy}
                        r={currentNode.isMergeCommit ? 5 : 4}
                        fill={currentNode.color}
                        stroke="var(--bg-primary)"
                        strokeWidth={2}
                    />
                    {currentNode.isMergeCommit && (
                        <circle
                            cx={LEFT_PAD + currentNode.lane * LANE_WIDTH}
                            cy={cy}
                            r={2}
                            fill="var(--bg-primary)"
                        />
                    )}
                </>
            )}
        </svg>
    )
}

export function VersionControlPanel({
    currentBranch, branches, defaultBranchName, isDirty, commitHistory,
    onBranchNameChange, onSwitchBranch, onCreateBranch, onCreateBranchFromCommit, onCommit, onMergeInto, onViewCommit
}: VersionControlPanelProps) {
    const [branchPopup, setBranchPopup] = useState(false)
    const [commitPopup, setCommitPopup] = useState(false)
    const [selectingMergeTarget, setSelectingMergeTarget] = useState(false)
    const [newName, setNewName] = useState("")
    const [msg, setMsg] = useState("")
    const [selectedCid, setSelectedCid] = useState<string | null>(null)

    const layout = useMemo(() => 
        buildGitGraphLayout(commitHistory, branches, currentBranch.uuid),
        [commitHistory, branches, currentBranch.uuid]
    )

    const isDefault = currentBranch.name === defaultBranchName
    const currentLane = layout.branchLanes.get(currentBranch.uuid) ?? 0
    const currentColor = COLORS[currentLane % COLORS.length]
    
    // Find the current branch's head commit
    const branchHeadNode = layout.nodes.find(n => n.branches.some(b => b.uuid === currentBranch.uuid))
    
    // Check if we're viewing a historical commit (not at the current branch's head)
    const selectedNode = selectedCid ? layout.nodes.find(n => n.cid === selectedCid) : null
    const isAtBranchHead = !selectedCid || (selectedNode && selectedNode.branches.some(b => b.uuid === currentBranch.uuid))
    const isViewingHistory = selectedCid && !isAtBranchHead

    const doCommit = useCallback(() => {
        if (msg.trim()) {
            onCommit(msg.trim())
            setMsg("")
            setCommitPopup(false)
        }
    }, [msg, onCommit])

    const doBranch = useCallback(() => {
        if (newName.trim()) {
            if (selectedCid) {
                // Create branch from selected commit
                onCreateBranchFromCommit(newName.trim(), selectedCid as CID<Commit>)
            } else {
                // Create branch from current head
                onCreateBranch(newName.trim())
            }
            setNewName("")
            setBranchPopup(false)
            setSelectedCid(null)
        }
    }, [newName, selectedCid, onCreateBranch, onCreateBranchFromCommit])

    const handleBranchClick = useCallback((branch: Branch) => {
        if (selectingMergeTarget && branch.uuid !== currentBranch.uuid) {
            onMergeInto(currentBranch, branch)
            setSelectingMergeTarget(false)
        } else if (!selectingMergeTarget) {
            // Switch branch first (this does checkout which sets working root correctly)
            onSwitchBranch(branch)
            // Then select the branch head in the UI
            const branchHead = commitHistory.find(c => c.branches.some(b => b.uuid === branch.uuid))
            if (branchHead) {
                setSelectedCid(branchHead.cid)
            }
        }
    }, [selectingMergeTarget, currentBranch, onMergeInto, onSwitchBranch, commitHistory])

    // Format timestamp
    const formatTime = (ts: string) => {
        const d = new Date(ts)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return "just now"
        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        return d.toLocaleDateString()
    }

    return (
        <div style={styles.container}>
            {/* Header with branch selector and actions */}
            <div style={styles.header}>
                <div style={styles.branchSelector}>
                    {branches.map(b => {
                        const lane = layout.branchLanes.get(b.uuid) ?? 0
                        const color = COLORS[lane % COLORS.length]
                        const isCurrent = b.uuid === currentBranch.uuid
                        const isHighlighted = selectingMergeTarget && !isCurrent
                        
                        return (
                            <button
                                key={b.uuid}
                                onClick={() => handleBranchClick(b)}
                                style={{
                                    ...styles.branchTab,
                                    background: isCurrent ? color : "transparent",
                                    color: isCurrent ? "white" : (isHighlighted ? color : "#888"),
                                    borderColor: isHighlighted ? color : "transparent",
                                    fontWeight: isCurrent ? 600 : 400,
                                }}
                            >
                                <span style={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: "50%", 
                                    background: color,
                                    marginRight: 6,
                                    opacity: isCurrent ? 1 : 0.5
                                }} />
                                {b.name}
                                {isHighlighted && " ←"}
                            </button>
                        )
                    })}
            </div>

                <div style={styles.actions}>
                    {isDirty && <span style={styles.dirtyIndicator}>● unsaved</span>}
                    {isViewingHistory && <span style={styles.historyIndicator}>viewing history</span>}
                    
                    {isDirty && !isViewingHistory && (
                        <button style={{ ...styles.actionBtn, background: currentColor }} onClick={() => setCommitPopup(true)}>
                            Commit
                        </button>
                    )}
                    
                    <button style={{ ...styles.actionBtn, background: "#a855f7" }} onClick={() => setBranchPopup(true)}>
                        Branch{selectedCid ? " from here" : ""}
                    </button>
                    
                    {!isDefault && !isViewingHistory && (
                        <button 
                            style={{ 
                                ...styles.actionBtn, 
                                background: selectingMergeTarget ? "#16a34a" : "#22c55e" 
                            }} 
                            onClick={() => setSelectingMergeTarget(!selectingMergeTarget)}
                        >
                            {selectingMergeTarget ? "Cancel" : "Merge"}
                        </button>
                    )}
                </div>
            </div>

            {/* Git graph - vertical list */}
            <div style={styles.graphContainer}>
                {layout.nodes.map((node, idx) => {
                    const isSelected = selectedCid === node.cid
                    const branchNames = node.branches.map(b => b.name)
                    
                    return (
                        <div
                            key={node.cid}
                            onClick={() => {
                                const newSelected = isSelected ? null : node.cid
                                setSelectedCid(newSelected)
                                if (newSelected) {
                                    onViewCommit(node.cid as CID<Commit>)
                                }
                            }}
                                    style={{
                                ...styles.commitRow,
                                background: isSelected ? "rgba(255,255,255,0.08)" : "transparent",
                                cursor: "pointer",
                            }}
                        >
                            {/* Graph column */}
                            <div style={styles.graphColumn}>
                                {renderGraphCell(idx, layout.rows, layout.nodes, layout.edges, layout.lanes, node)}
                            </div>
                            
                            {/* Commit info - all on one line */}
                            <div style={styles.commitInfo}>
                                <div style={styles.commitMain}>
                                    {branchNames.length > 0 && (
                                        <span style={{ ...styles.branchBadge, background: node.color }}>
                                            {branchNames[0]}
                                        </span>
                                    )}
                                    <span style={styles.commitMessage}>
                                        {node.commit.message}
                                    </span>
                                </div>
                                <div style={styles.commitMeta}>
                                    {node.isMergeCommit && <span style={styles.mergeBadge}>⊗</span>}
                                    <span style={styles.commitHash}>{node.cid.slice(0, 7)}</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
                
                {layout.nodes.length === 0 && (
                    <div style={styles.emptyState}>No commits yet</div>
                )}
            </div>

            {/* Popups */}
            {commitPopup && (
                <div style={styles.popup}>
                    <div style={styles.popupTitle}>Commit Changes</div>
                    <input
                        value={msg}
                        onChange={e => setMsg(e.target.value)}
                        placeholder="Commit message..."
                        onKeyDown={e => {
                            if (e.key === "Enter") doCommit()
                            if (e.key === "Escape") setCommitPopup(false)
                        }}
                        style={{ ...styles.input, borderColor: currentColor }}
                        autoFocus
                    />
                    <div style={styles.popupRow}>
                        <button 
                            style={{ ...styles.btn, background: currentColor }} 
                            onClick={doCommit} 
                            disabled={!msg.trim()}
                        >
                            Commit
                        </button>
                        <button style={styles.cancelBtn} onClick={() => setCommitPopup(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {branchPopup && (
                <div style={styles.popup}>
                    <div style={styles.popupTitle}>Create Branch</div>
                    <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Branch name..."
                        onKeyDown={e => {
                            if (e.key === "Enter") doBranch()
                            if (e.key === "Escape") setBranchPopup(false)
                        }}
                        style={{ ...styles.input, borderColor: "#a855f7" }}
                        autoFocus
                    />
                    <div style={styles.popupRow}>
                        <button
                            style={{ ...styles.btn, background: "#a855f7" }} 
                            onClick={doBranch} 
                            disabled={!newName.trim()}
                        >
                            Create
                        </button>
                        <button style={styles.cancelBtn} onClick={() => setBranchPopup(false)}>
                            Cancel
                        </button>
                    </div>
                    </div>
                )}

            {selectingMergeTarget && (
                <div style={styles.mergeHint}>
                    Select a branch to merge <strong>{currentBranch.name}</strong> into
            </div>
            )}
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary)",
        borderTop: "1px solid rgba(99,102,241,0.12)",
        height: 220,
        position: "relative",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        gap: 12,
    },
    branchSelector: {
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
    },
    branchTab: {
        display: "flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 6,
        border: "1px solid",
        fontSize: 11,
        cursor: "pointer",
        transition: "all 0.15s",
    },
    actions: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    dirtyIndicator: {
        color: "#f59e0b",
        fontSize: 10,
        marginRight: 4,
    },
    historyIndicator: {
        color: "#06b6d4",
        fontSize: 10,
        marginRight: 4,
        fontStyle: "italic",
    },
    actionBtn: {
        padding: "5px 12px",
        borderRadius: 6,
        border: "none",
        color: "white",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
    },
    graphContainer: {
        flex: 1,
        overflow: "auto",
        fontFamily: "var(--font-mono, monospace)",
    },
    commitRow: {
        display: "flex",
        alignItems: "stretch",
        height: ROW_HEIGHT,
    },
    graphColumn: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
    },
    commitInfo: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingRight: 8,
        minWidth: 0,
    },
    commitMain: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flex: 1,
        minWidth: 0,
    },
    commitMessage: {
        fontSize: 11,
        color: "var(--text-primary)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    branchBadge: {
        padding: "1px 5px",
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 600,
        color: "white",
        flexShrink: 0,
    },
    mergeBadge: {
        padding: "1px 4px",
        borderRadius: 3,
        fontSize: 8,
        background: "rgba(255,255,255,0.08)",
        color: "#777",
        flexShrink: 0,
    },
    commitMeta: {
        display: "flex",
        gap: 8,
        flexShrink: 0,
    },
    commitHash: {
        fontSize: 9,
        color: "#555",
        fontFamily: "var(--font-mono, monospace)",
    },
    commitTime: {
        fontSize: 9,
        color: "#444",
    },
    emptyState: {
        padding: 24,
        textAlign: "center",
        color: "#666",
        fontSize: 12,
    },
    popup: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "var(--bg-tertiary)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: 20,
        minWidth: 280,
        zIndex: 100,
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
    },
    popupTitle: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-primary)",
        marginBottom: 16,
    },
    input: {
        width: "100%",
        background: "var(--bg-primary)",
        border: "2px solid",
        borderRadius: 8,
        padding: "12px 14px",
        color: "var(--text-primary)",
        fontSize: 13,
        outline: "none",
        marginBottom: 16,
        boxSizing: "border-box",
    },
    popupRow: {
        display: "flex",
        gap: 10,
    },
    btn: {
        flex: 1,
        border: "none",
        borderRadius: 8,
        padding: "12px",
        color: "white",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
    },
    cancelBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 8,
        padding: "12px 20px",
        color: "#888",
        fontSize: 13,
        cursor: "pointer",
    },
    mergeHint: {
        position: "absolute",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(34, 197, 94, 0.15)",
        border: "1px solid rgba(34, 197, 94, 0.3)",
        borderRadius: 8,
        padding: "10px 20px",
        fontSize: 12,
        color: "#22c55e",
    },
}
