import { PdfPreview } from '@/components/features/Chat/Input/components/MediaPreview'

interface PdfAttachmentProps {
  localPath: string
  name?: string
}

export function PdfAttachment({ localPath, name }: PdfAttachmentProps) {
  return (
    <PdfPreview
      media={{
        localPath,
        name: name || 'PDF Document',
        type: 'pdf',
        mimeType: 'application/pdf',
      }}
    />
  )
}
