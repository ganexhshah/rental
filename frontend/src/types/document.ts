export type DocumentType =
  | 'invoice'
  | 'payment_receipt'
  | 'deposit_receipt'
  | 'refund_receipt'
  | 'credit_note'
  | 'rental_contract'
  | 'handover_sheet'
  | 'return_report'
  | 'maintenance_work_order'
  | 'expense_report'
  | 'booking_confirmation'
  | 'daily_ops_report'

export type DocumentStatus = 'issued' | 'signed' | 'voided' | 'draft' | 'archived'

export interface DocumentVersion {
  id: string
  tenantId?: string
  documentId: string
  version: number
  fileUrl: string
  storageKey?: string
  sha256Hash?: string
  fileSizeBytes?: number
  mimeType?: string
  snapshotData?: any
  generatedBy?: string
  renderedAt: string
}

export interface AppDocument {
  id: string
  tenantId?: string
  docType: DocumentType | string
  documentNumber: string
  title: string
  entityType?: string
  entityId?: string
  status: DocumentStatus
  currentVersion?: number
  metadata?: Record<string, any>
  createdAt: string
  updatedAt?: string
  fileUrl?: string
  sha256Hash?: string
  fileSizeBytes?: number
  latestVersion?: DocumentVersion
}

export interface DocumentFilterParams {
  search?: string
  docType?: string
  entityType?: string
  entityId?: string
  status?: string
  page?: number
  limit?: number
}
