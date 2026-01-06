# Merkurial Editor

A structured document editor built with React and TypeScript.

## Project Structure

```
merkurial-editor/
├── src/
│   ├── App.tsx           # Main application component
│   ├── model.ts          # Application state types
│   ├── version_control/  # Content-addressed types for version control
│   │   ├── immutable/    # Immutable content types (commits, grammar nodes)
│   │   └── mutable/      # Mutable state types (branches, projects, users)
│   └── grammar_views/    # UI components for grammar nodes
├── index.html
├── vite.config.ts
└── tsconfig.json
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

The app will be available at http://localhost:5173

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```
