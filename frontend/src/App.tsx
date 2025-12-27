import { useEffect, useState } from "react"
import type { GrammarNode } from "@merkurial/common"

type HealthResponse = {
  status: string
  message: string
  timestamp: string
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [example, setExample] = useState<GrammarNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [healthRes, exampleRes] = await Promise.all([
          fetch("http://localhost:3001/api/health"),
          fetch("http://localhost:3001/api/example"),
        ])

        if (!healthRes.ok || !exampleRes.ok) {
          throw new Error("Failed to connect to backend")
        }

        setHealth(await healthRes.json())
        setExample(await exampleRes.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Merkurial Editor</h1>
        <p style={styles.subtitle}>pnpm monorepo with shared types</p>

        <div style={styles.statusSection}>
          <h2 style={styles.sectionTitle}>Backend Connection</h2>

          {loading && <p style={styles.loading}>Connecting to backend...</p>}

          {error && (
            <div style={styles.errorBox}>
              <span style={styles.statusDot("#ef4444")} />
              <span>Error: {error}</span>
            </div>
          )}

          {health && (
            <div style={styles.successBox}>
              <span style={styles.statusDot("#22c55e")} />
              <span>{health.message}</span>
            </div>
          )}
        </div>

        {example && (
          <div style={styles.codeSection}>
            <h2 style={styles.sectionTitle}>Response from /api/example</h2>
            <pre style={styles.codeBlock}>
              {JSON.stringify(example, null, 2)}
            </pre>
            <p style={styles.hint}>
              This uses the shared <code style={styles.inlineCode}>GrammarNode</code> type from{" "}
              <code style={styles.inlineCode}>@merkurial/common</code>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)",
  },
  card: {
    background: "rgba(26, 26, 37, 0.8)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    borderRadius: "16px",
    padding: "3rem",
    maxWidth: "560px",
    width: "100%",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 80px rgba(99, 102, 241, 0.1)",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: 700,
    background: "linear-gradient(135deg, #e8e8ed 0%, #6366f1 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "0.5rem",
  },
  subtitle: {
    color: "#9898a8",
    fontSize: "1.1rem",
    marginBottom: "2rem",
  },
  statusSection: {
    marginBottom: "2rem",
  },
  sectionTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#9898a8",
    marginBottom: "1rem",
  },
  loading: {
    color: "#9898a8",
    fontStyle: "italic",
  },
  successBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem",
    background: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderRadius: "8px",
    color: "#22c55e",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    color: "#ef4444",
  },
  statusDot: (color: string): React.CSSProperties => ({
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: color,
    boxShadow: `0 0 10px ${color}`,
  }),
  codeSection: {
    marginTop: "1.5rem",
  },
  codeBlock: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.875rem",
    background: "#0a0a0f",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    borderRadius: "8px",
    padding: "1.25rem",
    overflow: "auto",
    color: "#e8e8ed",
  },
  hint: {
    marginTop: "1rem",
    fontSize: "0.875rem",
    color: "#9898a8",
  },
  inlineCode: {
    fontFamily: "'JetBrains Mono', monospace",
    background: "rgba(99, 102, 241, 0.15)",
    padding: "0.15rem 0.4rem",
    borderRadius: "4px",
    fontSize: "0.8rem",
    color: "#6366f1",
  },
}

