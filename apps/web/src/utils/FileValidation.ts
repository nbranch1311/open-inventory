export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

function isAllowedFileType(fileType: string) {
  return fileType === 'application/pdf' || fileType.startsWith('image/')
}

export function validateFileForUpload(file: { type: string; size: number }): string | null {
  if (!isAllowedFileType(file.type)) {
    return 'Only images and PDFs are allowed'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File size must be 5MB or less'
  }
  return null
}

