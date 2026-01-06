import { CID } from "../cid"

export type GrammarRoot = {
  type: "grammar_root"
  content: CID<Directory>[]
}

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

export type Text = {
  type: "text"
  value: string
}

export type Emphasis = {
  type: "emphasis"
  content: CID<InlineNode>[]
}

export type Strong = {
  type: "strong"
  content: CID<InlineNode>[]
}

export type CodeSpan = {
  type: "code_span"
  value: string
}

export type Link = {
  type: "link"
  href: string
  content: CID<InlineNode>[]
}

export type Image = {
  type: "image"
  src: string
  alt: string
}
