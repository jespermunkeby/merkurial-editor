import express from "express"
import cors from "cors"
import type { GrammarNode } from "@merkurial/common"

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Merkurial Editor API is running",
    timestamp: new Date().toISOString(),
  })
})

app.get("/api/example", (_req, res) => {
  const exampleNode: GrammarNode = {
    type: "paragraph",
    content: [{ type: "text", value: "Hello from the backend!" }],
  }
  res.json(exampleNode)
})

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
})

