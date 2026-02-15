import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as ItemDocuments from '@/actions/ItemDocuments'
import * as FileValidation from '@/utils/FileValidation'
import { ItemDocumentsSection } from './ItemDocumentsSection'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock('@/actions/ItemDocuments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/actions/ItemDocuments')>()
  return {
    ...actual,
    uploadItemDocumentFromForm: vi.fn(),
    deleteItemDocument: vi.fn(),
    getItemDocumentDownloadUrl: vi.fn(),
  }
})

vi.mock('@/utils/FileValidation', () => ({
  validateFileForUpload: vi.fn(),
}))

const mockDocuments = [
  {
    id: 'doc-1',
    household_id: 'hh-1',
    item_id: 'item-1',
    file_name: 'receipt.pdf',
    file_path: 'hh-1/item-1/receipt.pdf',
    file_size: 1024,
    file_type: 'application/pdf',
    created_at: '2024-01-01T00:00:00Z',
  },
]

describe('ItemDocumentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders documents section with upload zone', () => {
    render(
      <ItemDocumentsSection householdId="hh-1" itemId="item-1" documents={[]} />,
    )

    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /upload file/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/click to select or drag and drop/i),
    ).toBeInTheDocument()
    expect(screen.getByText('No documents yet.')).toBeInTheDocument()
  })

  it('renders document list when documents exist', () => {
    render(
      <ItemDocumentsSection
        householdId="hh-1"
        itemId="item-1"
        documents={mockDocuments}
      />,
    )

    expect(screen.getByText('receipt.pdf')).toBeInTheDocument()
    expect(screen.getByText('1.0 KB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete receipt\.pdf/i })).toBeInTheDocument()
  })

  it('shows validation error for invalid file type', async () => {
    vi.mocked(FileValidation.validateFileForUpload).mockReturnValue(
      'Only images and PDFs are allowed',
    )

    render(
      <ItemDocumentsSection householdId="hh-1" itemId="item-1" documents={[]} />,
    )

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()

    const file = new File(['content'], 'bad.txt', { type: 'text/plain' })
    const fileList = { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) } as FileList
    fireEvent.change(fileInput!, { target: { files: fileList } })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only images and PDFs are allowed',
    )
  })

  it('uploads file and refreshes on success', async () => {
    vi.mocked(FileValidation.validateFileForUpload).mockReturnValue(null)
    vi.mocked(ItemDocuments.uploadItemDocumentFromForm).mockResolvedValue({
      data: { id: 'doc-2', file_name: 'new.pdf' },
    })

    const user = userEvent.setup()
    render(
      <ItemDocumentsSection householdId="hh-1" itemId="item-1" documents={[]} />,
    )

    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['content'], 'new.pdf', { type: 'application/pdf' })
    await user.upload(fileInput!, file)

    await waitFor(() => {
      expect(ItemDocuments.uploadItemDocumentFromForm).toHaveBeenCalledWith(
        expect.any(FormData),
      )
    })
  })

  it('calls deleteItemDocument when delete is clicked', async () => {
    vi.mocked(ItemDocuments.deleteItemDocument).mockResolvedValue({ success: true })

    const user = userEvent.setup()
    render(
      <ItemDocumentsSection
        householdId="hh-1"
        itemId="item-1"
        documents={mockDocuments}
      />,
    )

    const deleteBtn = screen.getByRole('button', {
      name: /delete receipt\.pdf/i,
    })
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(ItemDocuments.deleteItemDocument).toHaveBeenCalledWith('hh-1', 'doc-1')
    })
  })

  it('opens signed URL when View is clicked', async () => {
    vi.mocked(ItemDocuments.getItemDocumentDownloadUrl).mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed' },
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const user = userEvent.setup()
    render(
      <ItemDocumentsSection
        householdId="hh-1"
        itemId="item-1"
        documents={mockDocuments}
      />,
    )

    const viewBtn = screen.getByRole('button', { name: 'View' })
    await user.click(viewBtn)

    await waitFor(() => {
      expect(ItemDocuments.getItemDocumentDownloadUrl).toHaveBeenCalledWith(
        'hh-1',
        'doc-1',
        300,
      )
      expect(openSpy).toHaveBeenCalledWith(
        'https://example.com/signed',
        '_blank',
        'noopener,noreferrer',
      )
    })

    openSpy.mockRestore()
  })
})
