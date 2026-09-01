/**
 * Converts an instant to the timezone-naive UTC representation expected by a
 * MySQL DATETIME column. MySQL does not accept ISO 8601 separators or a `Z`
 * suffix for DATETIME values.
 */
export const toMysqlDatetime = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid datetime value: ${String(value)}`)
  }
  return date.toISOString().slice(0, 19).replace('T', ' ')
}
