// =============================================================================
// Markdown AST Type Definitions
// =============================================================================

export type GrammarNode = BlockNode | InlineNode

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
  content: InlineNode[]
}

export type Paragraph = {
  type: "paragraph"
  content: InlineNode[]
}

export type List = {
  type: "list"
  ordered: boolean
  items: ListItem[]
}

export type ListItem = {
  type: "list_item"
  content: BlockNode[]
}

export type CodeBlock = {
  type: "code_block"
  language?: string
  value: string
}

export type BlockQuote = {
  type: "blockquote"
  content: BlockNode[]
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
