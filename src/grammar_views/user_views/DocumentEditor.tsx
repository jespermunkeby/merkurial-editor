import { useCallback, useMemo, useEffect, useRef } from "react"
import { createEditor, Descendant, Editor, Element as SlateElement, Transforms } from "slate"
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps } from "slate-react"
import { withHistory } from "slate-history"

type DocumentEditorProps = {
    value: Descendant[]
    onChange: (value: Descendant[]) => void
    readOnly?: boolean
}

export function DocumentEditor({ value, onChange, readOnly = false }: DocumentEditorProps) {
    const editor = useMemo(() => withHistory(withReact(createEditor())), [])
    const isExternalChange = useRef(false)
    
    // Update editor content when value prop changes from outside
    useEffect(() => {
        // Check if the value is different from current editor content
        const currentContent = JSON.stringify(editor.children)
        const newContent = JSON.stringify(value)
        
        if (currentContent !== newContent) {
            isExternalChange.current = true
            
            // Clear the editor and insert new content
            Transforms.deselect(editor)
            editor.children = value
            editor.onChange()
            
            isExternalChange.current = false
        }
    }, [value, editor])

    const renderElement = useCallback((props: RenderElementProps) => {
        const { attributes, children, element } = props
        const elem = element as any

        switch (elem.type) {
            case "heading": {
                const level = elem.level || 1
                if (level === 1) return <h1 {...attributes} style={styles.heading}>{children}</h1>
                if (level === 2) return <h2 {...attributes} style={styles.heading}>{children}</h2>
                if (level === 3) return <h3 {...attributes} style={styles.heading}>{children}</h3>
                if (level === 4) return <h4 {...attributes} style={styles.heading}>{children}</h4>
                if (level === 5) return <h5 {...attributes} style={styles.heading}>{children}</h5>
                return <h6 {...attributes} style={styles.heading}>{children}</h6>
            }

            case "paragraph":
                return (
                    <p {...attributes} style={styles.paragraph}>
                        {children}
                    </p>
                )

            case "list":
                const ListTag = elem.ordered ? "ol" : "ul"
                return (
                    <ListTag {...attributes} style={styles.list}>
                        {children}
                    </ListTag>
                )

            case "list-item":
                return (
                    <li {...attributes} style={styles.listItem}>
                        {children}
                    </li>
                )

            case "code-block":
                return (
                    <pre {...attributes} style={styles.codeBlock}>
                        <code>{children}</code>
                    </pre>
                )

            case "blockquote":
                return (
                    <blockquote {...attributes} style={styles.blockquote}>
                        {children}
                    </blockquote>
                )

            case "hr":
                return (
                    <div {...attributes} contentEditable={false}>
                        <hr style={styles.hr} />
                        {children}
                    </div>
                )

            case "link":
                return (
                    <a {...attributes} href={elem.href} style={styles.link}>
                        {children}
                    </a>
                )

            case "image":
                return (
                    <div {...attributes} contentEditable={false}>
                        <img src={elem.src} alt={elem.alt} style={styles.image} />
                        {children}
                    </div>
                )

            default:
                return (
                    <p {...attributes} style={styles.paragraph}>
                        {children}
                    </p>
                )
        }
    }, [])

    const renderLeaf = useCallback((props: RenderLeafProps) => {
        let { children } = props
        const { attributes, leaf } = props
        const leafAny = leaf as any

        if (leafAny.bold) {
            children = <strong>{children}</strong>
        }
        if (leafAny.italic) {
            children = <em>{children}</em>
        }
        if (leafAny.code) {
            children = <code style={styles.inlineCode}>{children}</code>
        }

        return <span {...attributes}>{children}</span>
    }, [])

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case "b":
                    event.preventDefault()
                    toggleMark(editor, "bold")
                    break
                case "i":
                    event.preventDefault()
                    toggleMark(editor, "italic")
                    break
                case "`":
                    event.preventDefault()
                    toggleMark(editor, "code")
                    break
            }
        }
    }, [editor])

    // Wrap onChange to prevent triggering during external updates
    const handleChange = useCallback((newValue: Descendant[]) => {
        if (!isExternalChange.current) {
            onChange(newValue)
        }
    }, [onChange])

    return (
        <div style={styles.container}>
            <Slate editor={editor} initialValue={value} onChange={handleChange}>
                <div style={styles.toolbar}>
                    <ToolbarButton
                        icon="B"
                        title="Bold (Ctrl+B)"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            toggleMark(editor, "bold")
                        }}
                    />
                    <ToolbarButton
                        icon="I"
                        title="Italic (Ctrl+I)"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            toggleMark(editor, "italic")
                        }}
                    />
                    <ToolbarButton
                        icon="<>"
                        title="Code (Ctrl+`)"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            toggleMark(editor, "code")
                        }}
                    />
                    <span style={styles.divider} />
                    <ToolbarButton
                        icon="H1"
                        title="Heading 1"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            toggleBlock(editor, "heading", { level: 1 })
                        }}
                    />
                    <ToolbarButton
                        icon="H2"
                        title="Heading 2"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            toggleBlock(editor, "heading", { level: 2 })
                        }}
                    />
                    <ToolbarButton
                        icon="¶"
                        title="Paragraph"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            toggleBlock(editor, "paragraph")
                        }}
                    />
                    <ToolbarButton
                        icon="•"
                        title="Bullet List"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            toggleBlock(editor, "list", { ordered: false })
                        }}
                    />
                    <ToolbarButton
                        icon="1."
                        title="Numbered List"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            toggleBlock(editor, "list", { ordered: true })
                        }}
                    />
                </div>
                <Editable
                    style={styles.editor}
                    renderElement={renderElement}
                    renderLeaf={renderLeaf}
                    onKeyDown={handleKeyDown}
                    readOnly={readOnly}
                    placeholder="Start writing..."
                    spellCheck
                />
            </Slate>
        </div>
    )
}

function ToolbarButton({
    icon,
    title,
    onMouseDown,
}: {
    icon: string
    title: string
    onMouseDown: (e: React.MouseEvent) => void
}) {
    return (
        <button style={styles.toolbarButton} title={title} onMouseDown={onMouseDown}>
            {icon}
        </button>
    )
}

function toggleMark(editor: Editor, mark: string) {
    const isActive = isMarkActive(editor, mark)
    if (isActive) {
        Editor.removeMark(editor, mark)
    } else {
        Editor.addMark(editor, mark, true)
    }
}

function isMarkActive(editor: Editor, mark: string) {
    const marks = Editor.marks(editor) as Record<string, boolean> | null
    return marks ? marks[mark] === true : false
}

function toggleBlock(editor: Editor, type: string, props: Record<string, any> = {}) {
    const isActive = isBlockActive(editor, type)

    Transforms.setNodes(
        editor,
        isActive ? { type: "paragraph" } : { type, ...props },
        { match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n) }
    )
}

function isBlockActive(editor: Editor, type: string) {
    const [match] = Editor.nodes(editor, {
        match: (n) => SlateElement.isElement(n) && (n as any).type === type,
    })
    return !!match
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-secondary)",
        borderRadius: 8,
        overflow: "hidden",
    },
    toolbar: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 12px",
        borderBottom: "1px solid var(--bg-tertiary)",
        background: "var(--bg-tertiary)",
    },
    toolbarButton: {
        background: "transparent",
        border: "1px solid transparent",
        borderRadius: 4,
        padding: "4px 8px",
        color: "var(--text-secondary)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
    },
    divider: {
        width: 1,
        height: 20,
        background: "var(--bg-secondary)",
        margin: "0 4px",
    },
    editor: {
        flex: 1,
        padding: "24px 32px",
        overflow: "auto",
        outline: "none",
        fontSize: 15,
        lineHeight: 1.7,
        color: "var(--text-primary)",
    },
    heading: {
        marginBottom: "0.5em",
        color: "var(--text-primary)",
        fontWeight: 600,
    },
    paragraph: {
        marginBottom: "1em",
    },
    list: {
        marginBottom: "1em",
        paddingLeft: "1.5em",
    },
    listItem: {
        marginBottom: "0.25em",
    },
    codeBlock: {
        background: "var(--bg-primary)",
        padding: "16px",
        borderRadius: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        marginBottom: "1em",
        overflow: "auto",
    },
    blockquote: {
        borderLeft: "3px solid var(--accent)",
        paddingLeft: "16px",
        marginLeft: 0,
        marginBottom: "1em",
        color: "var(--text-secondary)",
        fontStyle: "italic",
    },
    hr: {
        border: "none",
        borderTop: "1px solid var(--bg-tertiary)",
        margin: "2em 0",
    },
    link: {
        color: "var(--accent)",
        textDecoration: "underline",
    },
    image: {
        maxWidth: "100%",
        borderRadius: 4,
    },
    inlineCode: {
        background: "var(--bg-tertiary)",
        padding: "2px 6px",
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        fontSize: "0.9em",
    },
}

