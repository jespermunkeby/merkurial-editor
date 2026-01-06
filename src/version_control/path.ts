/**
 * Paths are lists of field names or list indices that describe the field path from the grammar root down to specific field.
 * 
 */

type FieldName = string
type ListIndex = number
export type Path<T> = (FieldName | ListIndex)[] & { targetType: T }
