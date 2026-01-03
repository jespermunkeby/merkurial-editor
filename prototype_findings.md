# Merkurial Editor - Prototype Findings

## What It Is

A collaborative document editor with Git-like version control. Users create projects, edit rich-text documents in a folder structure, commit changes, create branches, and merge with conflict resolution.

## Architecture

### Content-Addressed Storage

Everything immutable lives in a **CID store** (Content IDentifier). The CID is a SHA256 hash of the deterministically-serialized content.

```
VersionedNode (all CID-addressed)
├── Commit        { type, parents[], content, author, timestamp, message }
├── VersionedRoot CID<Directory>[]
├── Directory     { type: "folder", name, children[] }
├── Document      { type: "document", name?, content[] }
├── BlockNode     Heading | Paragraph | List | CodeBlock | ...
└── InlineNode    Text | Emphasis | Strong | Link | ...

Regular Types (mutable references)
├── Project       { uuid, name, master, branches[] }
├── Branch        { uuid, name, commit: CID<Commit> }
└── User          { uuid, name, avatar }
```

### Key Design Decisions (User-Guided)

1. **Unified CID function** - A single `cid()` function in `common/cid.ts` using `fast-json-stable-stringify` + SHA256. Initial implementation had three different hash methods (backend, frontend, common) causing CID mismatches. **User identified this after 404 errors.**

2. **Commit as VersionedNode** - Originally Commit was separate from VersionedNode. **User directed** moving it into the versioned types so everything content-addressed is in one union.

3. **String timestamps** - Changed `timestamp: Date` to `timestamp: string` (ISO format) for deterministic serialization. **User chose this** after being asked about serialization consistency.

4. **Document naming** - Added optional `name` field to Document for sidebar display. **User chose** this over deriving names from first heading.

5. **Projects as variables, not CIDs** - Projects and branches are mutable references stored in memory, not content-addressed. Only the content they point to (commits, documents) is CID-addressed. **User clarified** this from the start.

### Stack

- **Frontend**: React + Vite + Slate (rich text editor)
- **Backend**: Express + in-memory storage
- **Shared**: `@merkurial/common` package with types and CID function

### Data Flow

```
User edits in Slate
    ↓
fromSlateNodes() converts to CID tree using shared cid()
    ↓
Store nodes via POST /api/content
    ↓
Create commit via POST /api/branches/:id/commits
    ↓
Branch.commit updated to new CID
```

## What Worked

- Projections between Slate and CID-based document model
- Two-pane layout with folder tree sidebar
- Mode-based state machine (Dashboard → Edit → Review → Resolve)

## What Needed Correction

- CID computation was fragmented across 3 implementations
- Merge direction was backwards (merged into feature branch instead of master)
- Nested `<button>` elements in sidebar (invalid HTML)
- Import paths for `@noble/hashes` needed `.js` extension for ESM

