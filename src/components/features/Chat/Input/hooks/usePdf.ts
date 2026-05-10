import { useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'

import { handleFileError } from '@/lib/core/utils/error'

export const usePDFUpload = (maxSize: number = 32 * 1024 * 1024) => {
  const [selectedPDFName, setSelectedPDFName] = useState<string>('')
  const [selectedPDFPath, setSelectedPDFPath] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const handlePDFPick = async (): Promise<void> => {
    try {
      setIsUploading(true)

      // Open native file dialog
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'PDF Documents',
            extensions: ['pdf'],
          },
        ],
      })

      // User cancelled
      if (!selected) {
        setIsUploading(false)
        return
      }

      // Handle single file selection
      const filePath = Array.isArray(selected) ? selected[0] : selected

      try {
        // Read the file as binary
        const binaryData = await readFile(filePath)

        // Check file size (binaryData is Uint8Array, so .length gives bytes)
        if (binaryData.length > maxSize) {
          handleFileError(
            new Error(
              `PDF file is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`,
            ),
            { message: `PDF file too large (max ${Math.round(maxSize / (1024 * 1024))}MB)` },
          )
          return
        }

        // Extract filename from path
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'document.pdf'

        setSelectedPDFName(fileName)
        setSelectedPDFPath(filePath)
      } catch (error) {
        handleFileError(error, {
          message: 'Failed to process PDF, please try again',
          metadata: { filePath },
        })
        setSelectedPDFName('')
      } finally {
        setIsUploading(false)
      }
    } catch (error) {
      handleFileError(error, {
        message: 'Failed to pick PDF, please try again',
      })
      setIsUploading(false)
    }
  }

  const resetPDF = () => {
    setSelectedPDFName('')
    setSelectedPDFPath('')
  }

  return {
    selectedPDFName,
    selectedPDFPath,
    isUploading,
    handlePDFPick,
    resetPDF,
  }
}
