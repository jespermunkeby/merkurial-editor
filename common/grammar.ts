import { CID } from "./types"

export type Root = CID<Directory>[]

export type Directory = {
  type: "folder"
  name: string
  children: (CID<Directory> | CID<Document>)[]
}

export type Document = {
  type: "document"
  content: CID<BlockNode>[]
}

// -----------------------------------------------------------------------------
// Block Nodes
// -----------------------------------------------------------------------------

export type BlockNode =
  | Heading
  | Paragraph
  | List
  | ListItem
  | CodeBlock
  | BlockQuote
  | HorizontalRule
  | Reuse

export type Heading = {
  type: "heading"
  level: 1 | 2 | 3 | 4 | 5 | 6
  content: CID<InlineNode>[]
}

export type Paragraph = {
  type: "paragraph"
  content: CID<InlineNode>[]
}

export type List = {
  type: "list"
  ordered: boolean
  items: CID<ListItem>[]
}

export type ListItem = {
  type: "list_item"
  content: CID<BlockNode>[]
}

export type CodeBlock = {
  type: "code_block"
  language?: string
  value: string
}

export type BlockQuote = {
  type: "blockquote"
  content: CID<BlockNode>[]
}

export type HorizontalRule = {
  type: "horizontal_rule"
}

export type Reuse = {
  type: "reuse"
  cid: CID<BlockNode>
}

// -----------------------------------------------------------------------------
// Inline Nodes
// -----------------------------------------------------------------------------

export type InlineNode =
  | Text
  | Emphasis
  | Strong
  | CodeSpan
  | Link
  | Image
  | Reference

export type Text = {
  type: "text"
  value: string
}

export type Emphasis = {
  type: "emphasis"
  content: InlineNode[]
}

export type Strong = {
  type: "strong"
  content: InlineNode[]
}

export type CodeSpan = {
  type: "code_span"
  value: string
}

export type Link = {
  type: "link"
  href: string
  content: InlineNode[]
}

export type Image = {
  type: "image"
  src: string
  alt: string
}

export type Reference = {
  type: "cross_reference"
  to: CID
  content: InlineNode[]
}
