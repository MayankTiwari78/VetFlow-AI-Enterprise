const byteToHex = (value) => Number(value).toString(16).padStart(2, '0')

export const normalizeEntityId = (value) => {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (!value || typeof value !== 'object') {
    return ''
  }

  if (typeof value.$oid === 'string') {
    return value.$oid
  }

  const buffer = value.buffer

  if (buffer && typeof buffer === 'object') {
    const bytes = Object.keys(buffer)
      .sort((left, right) => Number(left) - Number(right))
      .map((key) => buffer[key])

    if (bytes.length === 12 && bytes.every((byte) => Number.isInteger(Number(byte)))) {
      return bytes.map(byteToHex).join('')
    }
  }

  return ''
}
