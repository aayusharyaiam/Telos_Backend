import { getSupabaseClient, isSupabaseEnabled } from '../config/supabaseStorage.js'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const BUCKET_NAME = 'evidence-files'
const STORAGE_PATH = 'checkins'

export async function uploadEvidenceFile(file, userId) {
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase Storage is not enabled')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // Validate file exists
  if (!file) {
    throw new Error('No file provided')
  }

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`File type not allowed. Allowed types: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, TXT`)
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is 10MB`)
  }

  // Generate unique filename
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileName = `${timestamp}-${userId}-${random}-${originalName}`

  // Full path in storage
  const filePath = `${STORAGE_PATH}/${fileName}`

  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file')
    }

    return {
      publicUrl: urlData.publicUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: filePath
    }
  } catch (error) {
    console.error('Storage upload error:', error)
    throw error
  }
}

export function isValidMimeType(mimeType) {
  return ALLOWED_MIME_TYPES.includes(mimeType)
}

export function isValidFileSize(size) {
  return size <= MAX_FILE_SIZE
}

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE }