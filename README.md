# Merkurial Editor

A TypeScript monorepo with a React frontend, Express backend, and shared common types.

## Project Structure

```
merkurial-editor/
├── frontend/     # React + Vite frontend
├── backend/      # Express API server
└── common/       # Shared TypeScript types and utilities
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) (v8 or later)

Install pnpm if you haven't:

```bash
npm install -g pnpm
```

## Getting Started

### 1. Install dependencies

From the root of the project:

```bash
pnpm install
```

This installs dependencies for all packages (frontend, backend, common).

### 2. Start development servers

Run both frontend and backend:

```bash
pnpm dev
```

Or run them separately:

```bash
# Terminal 1 - Backend (http://localhost:3001)
pnpm dev:backend

# Terminal 2 - Frontend (http://localhost:5173)
pnpm dev:frontend
```

## Using Shared Types

The `@merkurial/common` package contains shared TypeScript types. Import them in both frontend and backend:

```typescript
import { GrammarNode, BlockNode, InlineNode } from "@merkurial/common"
```

## Adding Dependencies

```bash
# Add to a specific package
pnpm --filter frontend add <package>
pnpm --filter backend add <package>
pnpm --filter @merkurial/common add <package>

# Add a dev dependency to the root (shared tooling)
pnpm add -D -w <package>
```

## Workspaces

This monorepo uses [pnpm workspaces](https://pnpm.io/workspaces). The configuration is in `pnpm-workspace.yaml`.

Packages can depend on each other using the `workspace:*` protocol:

```json
{
  "dependencies": {
    "@merkurial/common": "workspace:*"
  }
}
```

