const resolveProfileImageValue = (userData) => {
  if (!userData || typeof userData !== 'object') return ''
  return userData.image || ''
}

const normalizeProfileImageUrl = (image, backendUrl = '') => {
  if (!image) return ''
  const value = String(image)
  if (
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value
  }
  if (!backendUrl || !value.startsWith('/')) return value
  return `${backendUrl.replace(/\/$/, '')}${value}`
}

export const getPersistedProfileImage = (userData, backendUrl) =>
  normalizeProfileImageUrl(resolveProfileImageValue(userData), backendUrl)

export const isCustomProfileImage = (image) =>
  Boolean(image) && !String(image).startsWith('data:image/svg+xml')

export const getProfileImageSrc = (userData, preview, backendUrl) => {
  if (preview) return preview
  const image = getPersistedProfileImage(userData, backendUrl)
  return isCustomProfileImage(image) ? image : ''
}
