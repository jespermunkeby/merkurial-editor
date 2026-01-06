import { BaseEditor } from 'slate'
import { ReactEditor } from 'slate-react'
import { HistoryEditor } from 'slate-history'

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

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor & HistoryEditor
        Element: CustomElement
        Text: CustomText
    }
}

