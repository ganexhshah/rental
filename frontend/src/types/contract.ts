export interface ContractTemplate {
  id: string
  tenantId: string
  title: string
  vehicleType: 'all' | 'car' | 'bike' | 'scooter'
  version: string
  content: string
  variables: string[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ContractSignature {
  signerName: string
  signerRole: 'customer' | 'agent'
  signedAt: string
  ipAddress?: string
  signatureDataUrl?: string
}

export interface Contract {
  id: string
  contractNumber: string
  tenantId: string
  bookingId: string
  bookingCode: string
  customerId: string
  customerName: string
  vehicleId: string
  vehicleInfo: string
  templateId: string
  templateTitle: string
  renderedContent: string
  startDate: string
  endDate: string
  totalAmount: number
  depositAmount: number
  status: 'draft' | 'pending_signature' | 'signed' | 'expired' | 'terminated'
  customerSignature?: ContractSignature
  agentSignature?: ContractSignature
  signedAt?: string
  expiresAt: string
  pdfUrl?: string
  createdAt: string
  updatedAt: string
}
