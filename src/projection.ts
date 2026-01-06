import { Descendant, Element as SlateElement, Text as SlateText } from "slate"
import { CID, CIDable, cid } from "./version_control/cid"
import {
    BlockNode,
    Document,
    Heading,
    Paragraph,
    List,
    ListItem,
    CodeBlock,
    BlockQuote,
    HorizontalRule,
    InlineNode,
    Text,
    Emphasis,
    Strong,
    CodeSpan,
    Link,
    Image,
} from "./version_control/immutable/grammar"

// Slate custom types
type CustomText = {
    text: string
    bold?: boolean
    italic?: boolean
    code?: boolean
}

type CustomElement = {
    type: string
    level?: number
    ordered?: boolean
    language?: string
    href?: string
    src?: string
    alt?: string
    children: (CustomElement | CustomText)[]
}

type KVStore = {
    put: <T extends CIDable>(node: T) => CID<T>
    get: <T extends CIDable>(id: CID<T>) => T | undefined
}

/**
 * Convert a Document to Slate Descendant array
 */
export function documentToSlate(
    doc: Document,
    resolve: <T extends CIDable>(cid: CID<T>) => T | undefined
): Descendant[] {
    if (doc.content.length === 0) {
        // Return empty paragraph for empty documents
        return [{ type: "paragraph", children: [{ text: "" }] }]
    }

    return doc.content.map((blockCid) => {
        const block = resolve(blockCid)
        if (!block) {
            return { type: "paragraph", children: [{ text: "" }] }
        }
        return blockNodeToSlate(block, resolve)
    })
}

function blockNodeToSlate(
    block: BlockNode,
    resolve: <T extends CIDable>(cid: CID<T>) => T | undefined
): SlateElement {
    switch (block.type) {
        case "heading":
            return {
                type: "heading",
                level: block.level,
                children: inlineNodesToSlate(block.content, resolve),
            } as CustomElement

        case "paragraph":
            return {
                type: "paragraph",
                children: inlineNodesToSlate(block.content, resolve),
            } as CustomElement

        case "list":
            return {
                type: "list",
                ordered: block.ordered,
                children: block.items.map((itemCid) => {
                    const item = resolve(itemCid)
                    if (!item) return { type: "list-item", children: [{ text: "" }] }
                    return {
                        type: "list-item",
                        children: item.content.map((blockCid) => {
                            const b = resolve(blockCid)
                            if (!b) return { type: "paragraph", children: [{ text: "" }] }
                            return blockNodeToSlate(b, resolve)
                        }),
                    }
                }),
            } as CustomElement

        case "code_block":
            return {
                type: "code-block",
                language: block.language,
                children: [{ text: block.value }],
            } as CustomElement

        case "blockquote":
            return {
                type: "blockquote",
                children: block.content.map((blockCid) => {
                    const b = resolve(blockCid)
                    if (!b) return { type: "paragraph", children: [{ text: "" }] }
                    return blockNodeToSlate(b, resolve)
                }),
            } as CustomElement

        case "horizontal_rule":
            return {
                type: "hr",
                children: [{ text: "" }],
            } as CustomElement

        default:
            return { type: "paragraph", children: [{ text: "" }] } as CustomElement
    }
}

function inlineNodesToSlate(
    cids: CID<InlineNode>[],
    resolve: <T extends CIDable>(cid: CID<T>) => T | undefined
): (CustomText | CustomElement)[] {
    if (cids.length === 0) {
        return [{ text: "" }]
    }

    const result: (CustomText | CustomElement)[] = []

    for (const inlineCid of cids) {
        const inline = resolve(inlineCid)
        if (!inline) continue
        result.push(...inlineNodeToSlate(inline, resolve))
    }

    return result.length > 0 ? result : [{ text: "" }]
}

function inlineNodeToSlate(
    inline: InlineNode,
    resolve: <T extends CIDable>(cid: CID<T>) => T | undefined
): (CustomText | CustomElement)[] {
    switch (inline.type) {
        case "text":
            return [{ text: inline.value }]

        case "emphasis":
            return flattenWithMark(inline.content, resolve, "italic")

        case "strong":
            return flattenWithMark(inline.content, resolve, "bold")

        case "code_span":
            return [{ text: inline.value, code: true }]

        case "link":
            return [{
                type: "link",
                href: inline.href,
                children: inlineNodesToSlate(inline.content, resolve),
            } as CustomElement]

        case "image":
            return [{
                type: "image",
                src: inline.src,
                alt: inline.alt,
                children: [{ text: "" }],
            } as CustomElement]

        default:
            return [{ text: "" }]
    }
}

function flattenWithMark(
    cids: CID<InlineNode>[],
    resolve: <T extends CIDable>(cid: CID<T>) => T | undefined,
    mark: "bold" | "italic"
): CustomText[] {
    const result: CustomText[] = []
    for (const inlineCid of cids) {
        const inline = resolve(inlineCid)
        if (!inline) continue
        const children = inlineNodeToSlate(inline, resolve)
        for (const child of children) {
            if ("text" in child) {
                result.push({ ...child, [mark]: true })
            }
        }
    }
    return result.length > 0 ? result : [{ text: "", [mark]: true }]
}

/**
 * Convert Slate Descendant array back to Document
 */
export function slateToDocument(
    descendants: Descendant[],
    store: KVStore,
    existingDoc?: Document
): { document: Document; documentCid: CID<Document> } {
    const blockCids: CID<BlockNode>[] = []

    for (const node of descendants) {
        if ("type" in node) {
            const { blockNode, blockCid } = slateElementToBlockNode(node as CustomElement, store)
            if (blockNode) {
                blockCids.push(blockCid)
            }
        }
    }

    const document: Document = {
        type: "document",
        name: existingDoc?.name,
        createdAt: existingDoc?.createdAt ?? new Date().toISOString(),
        content: blockCids,
    }

    const documentCid = store.put(document)
    return { document, documentCid }
}

function slateElementToBlockNode(
    element: CustomElement,
    store: KVStore
): { blockNode: BlockNode | null; blockCid: CID<BlockNode> } {
    let blockNode: BlockNode

    switch (element.type) {
        case "heading": {
            const inlineCids = slateChildrenToInlineNodes(element.children, store)
            const heading: Heading = {
                type: "heading",
                level: (element.level || 1) as 1 | 2 | 3 | 4 | 5 | 6,
                content: inlineCids,
            }
            blockNode = heading
            break
        }

        case "paragraph": {
            const inlineCids = slateChildrenToInlineNodes(element.children, store)
            const paragraph: Paragraph = {
                type: "paragraph",
                content: inlineCids,
            }
            blockNode = paragraph
            break
        }

        case "list": {
            const itemCids: CID<ListItem>[] = []
            for (const child of element.children) {
                if ("type" in child && child.type === "list-item") {
                    const itemBlockCids: CID<BlockNode>[] = []
                    for (const itemChild of (child as CustomElement).children) {
                        if ("type" in itemChild) {
                            const { blockCid } = slateElementToBlockNode(itemChild as CustomElement, store)
                            itemBlockCids.push(blockCid)
                        }
                    }
                    const listItem: ListItem = {
                        type: "list_item",
                        content: itemBlockCids,
                    }
                    itemCids.push(store.put(listItem))
                }
            }
            const list: List = {
                type: "list",
                ordered: element.ordered || false,
                items: itemCids,
            }
            blockNode = list
            break
        }

        case "code-block": {
            const text = element.children
                .filter((c): c is CustomText => "text" in c)
                .map((c) => c.text)
                .join("")
            const codeBlock: CodeBlock = {
                type: "code_block",
                language: element.language,
                value: text,
            }
            blockNode = codeBlock
            break
        }

        case "blockquote": {
            const blockCids: CID<BlockNode>[] = []
            for (const child of element.children) {
                if ("type" in child) {
                    const { blockCid } = slateElementToBlockNode(child as CustomElement, store)
                    blockCids.push(blockCid)
                }
            }
            const blockquote: BlockQuote = {
                type: "blockquote",
                content: blockCids,
            }
            blockNode = blockquote
            break
        }

        case "hr": {
            const hr: HorizontalRule = { type: "horizontal_rule" }
            blockNode = hr
            break
        }

        default: {
            // Default to paragraph
            const inlineCids = slateChildrenToInlineNodes(element.children, store)
            const paragraph: Paragraph = {
                type: "paragraph",
                content: inlineCids,
            }
            blockNode = paragraph
        }
    }

    const blockCid = store.put(blockNode)
    return { blockNode, blockCid }
}

function slateChildrenToInlineNodes(
    children: (CustomElement | CustomText)[],
    store: KVStore
): CID<InlineNode>[] {
    const inlineCids: CID<InlineNode>[] = []

    for (const child of children) {
        if ("text" in child) {
            // Text node with possible marks
            const textNode = child as CustomText
            let inlineNode: InlineNode

            if (textNode.bold && textNode.italic) {
                // Nested: strong > emphasis > text
                const text: Text = { type: "text", value: textNode.text }
                const textCid = store.put(text)
                const emphasis: Emphasis = { type: "emphasis", content: [textCid] }
                const emphasisCid = store.put(emphasis)
                const strong: Strong = { type: "strong", content: [emphasisCid] }
                inlineCids.push(store.put(strong))
                continue
            } else if (textNode.bold) {
                const text: Text = { type: "text", value: textNode.text }
                const textCid = store.put(text)
                const strong: Strong = { type: "strong", content: [textCid] }
                inlineCids.push(store.put(strong))
                continue
            } else if (textNode.italic) {
                const text: Text = { type: "text", value: textNode.text }
                const textCid = store.put(text)
                const emphasis: Emphasis = { type: "emphasis", content: [textCid] }
                inlineCids.push(store.put(emphasis))
                continue
            } else if (textNode.code) {
                const codeSpan: CodeSpan = { type: "code_span", value: textNode.text }
                inlineCids.push(store.put(codeSpan))
                continue
            } else {
                inlineNode = { type: "text", value: textNode.text }
            }

            inlineCids.push(store.put(inlineNode))
        } else if ("type" in child) {
            // Element (link, image)
            const elem = child as CustomElement
            if (elem.type === "link") {
                const contentCids = slateChildrenToInlineNodes(elem.children, store)
                const link: Link = {
                    type: "link",
                    href: elem.href || "",
                    content: contentCids,
                }
                inlineCids.push(store.put(link))
            } else if (elem.type === "image") {
                const image: Image = {
                    type: "image",
                    src: elem.src || "",
                    alt: elem.alt || "",
                }
                inlineCids.push(store.put(image))
            }
        }
    }

    return inlineCids
}
