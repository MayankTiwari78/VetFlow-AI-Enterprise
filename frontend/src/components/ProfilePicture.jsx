import React, { useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { isAuthSessionHandledError } from '../api/authClient'
import { getProfileImageSrc, isCustomProfileImage } from '../lib/profileImage'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024
const readUserDataResponse = (responseData) =>
  responseData?.userData ?? responseData?.data?.userData ?? null

const ProfilePicture = ({ backendUrl, token, userData, setUserData, loadUserProfileData }) => {
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const hasCustomImage = isCustomProfileImage(userData?.image)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please choose a JPG, PNG, or WEBP image.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image is too large. Maximum size is 5MB.')
      return
    }
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!preview || isUploading) return
    const file = selectedFile
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('name', userData.name)
      formData.append('phone', userData.phone)
      formData.append('address', JSON.stringify(userData.address))
      formData.append('gender', userData.gender)
      formData.append('dob', userData.dob)
      formData.append('image', file)
      const { data } = await axios.post(backendUrl + '/api/user/update-profile', formData, { headers: { token } })
      if (data.success) {
        toast.success('Profile photo updated')
        const nextUserData = readUserDataResponse(data)
        if (nextUserData && setUserData) setUserData(nextUserData)
        else await loadUserProfileData(token)
        setPreview(null)
        setSelectedFile(null)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
      if (!isAuthSessionHandledError(error)) {
        toast.error(error.response?.data?.message || error.message || 'Unable to upload photo')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return
    const confirmed = window.confirm('Remove your profile photo? This will restore the default avatar.')
    if (!confirmed) return
    setIsDeleting(true)
    try {
      const { data } = await axios.delete(backendUrl + '/api/user/profile-image', { headers: { token } })
      if (data.success) {
        toast.success('Profile photo removed')
        const nextUserData = readUserDataResponse(data)
        if (nextUserData && setUserData) setUserData(nextUserData)
        else await loadUserProfileData(token)
        setPreview(null)
        setSelectedFile(null)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
      if (!isAuthSessionHandledError(error)) {
        toast.error(error.response?.data?.message || error.message || 'Unable to remove photo')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const displaySrc = getProfileImageSrc(userData, preview, backendUrl) || assets.profile_pic
  const busy = isUploading || isDeleting

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className="relative inline-block">
        <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-mist shadow-soft-lg ring-1 ring-primary/15">
          <img className="h-full w-full object-cover" src={displaySrc} alt="Profile" onError={(e) => { e.currentTarget.src = assets.profile_pic }} />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Change profile photo"
          className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-primary to-accent text-white shadow-soft-lg transition duration-200 hover:scale-105 hover:shadow-soft-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="flex flex-col gap-2">
        {preview ? (
          <>
            <button type="button" onClick={handleUpload} disabled={busy} className="mf-button px-4 py-2 text-xs">
              {isUploading ? 'Saving…' : 'Save photo'}
            </button>
            <button type="button" onClick={() => { setPreview(null); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} disabled={busy} className="mf-button-ghost px-2 py-1 text-xs">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="mf-button-secondary px-4 py-2 text-xs">
              {hasCustomImage ? 'Change photo' : 'Upload photo'}
            </button>
            {hasCustomImage && (
              <button type="button" onClick={handleDelete} disabled={busy} className="mf-button-ghost px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-600">
                {isDeleting ? 'Removing…' : 'Remove photo'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ProfilePicture
