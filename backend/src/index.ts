import express from "express"
import cors from "cors"
import { Store } from "./store"
import { Project } from "../../common/types/project"

const app = express()
const PORT = 3001

//for now we use this instead of a database
let projects: Project[] = []
let store = new Store()

/**
GET    /api/projects                    # List all projects
POST   /api/projects                    # Create new project
GET    /api/projects/:projectId         # Get project details 

GET    /api/content/:cid                # Get any content-addressed node by CID

GET    /api/diff?from=:cid&to=:cid      # Get diff between two commits
GET    /api/branches/:branchId/review   # Get review summary (diff against default branch)

GET    /api/conflicts?branch=:branchId&against=:cid   # Get list of conflicts

GET    /api/
 */

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

app.post("/api/project", (req, res) => {
  const project: Project = req.body
  store.put(project.id, project)
  res.json(project)
})

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
})

