export default function App() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Merkurial Editor</h1>
        <p style={styles.subtitle}>A structured document editor</p>

        <div style={styles.statusSection}>
          <h2 style={styles.sectionTitle}>Getting Started</h2>
          <div style={styles.successBox}>
            <span style={styles.statusDot("#22c55e")} />
            <span>Ready to build</span>
          </div>
        </div>
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
  statusDot: (color: string): React.CSSProperties => ({
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: color,
    boxShadow: `0 0 10px ${color}`,
  }),
}
