import { apiPost } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type { Contract, ContractTemplate, ContractSignature } from '@/types/contract'

export const contractsApi = {
  getContracts: async (params?: { search?: string; status?: string }): Promise<Contract[]> => {
    await new Promise((r) => setTimeout(r, 80))
    let list = [...mockDb.get('contracts')]

    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (c) =>
          c.contractNumber?.toLowerCase().includes(q) ||
          c.customerName?.toLowerCase().includes(q) ||
          c.bookingCode?.toLowerCase().includes(q) ||
          c.vehicleInfo?.toLowerCase().includes(q)
      )
    }

    if (params?.status && params.status !== 'all') {
      list = list.filter((c) => c.status === params.status)
    }

    return list
  },

  getContractById: async (id: string): Promise<Contract | null> => {
    await new Promise((r) => setTimeout(r, 60))
    const list = mockDb.get('contracts')
    return list.find((c) => c.id === id) || null
  },

  getTemplates: async (): Promise<ContractTemplate[]> => {
    await new Promise((r) => setTimeout(r, 60))
    return mockDb.get('contractTemplates')
  },

  saveTemplate: async (data: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ContractTemplate> => {
    await new Promise((r) => setTimeout(r, 100))
    const list = mockDb.get('contractTemplates')
    if (data.id) {
      const idx = list.findIndex((t) => t.id === data.id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() }
        mockDb.set('contractTemplates', [...list])
        return list[idx]
      }
    }
    const created: ContractTemplate = {
      ...data,
      id: `tmpl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockDb.set('contractTemplates', [...list, created])
    return created
  },

  signContract: async (contractId: string, signature: ContractSignature): Promise<Contract> => {
    try {
      await apiPost(`/contracts/${contractId}/sign`, {
        signature_url: signature.signatureDataUrl || 'data:image/png;base64,demo',
      })
    } catch (err) {
      console.warn('API signContract failed, updating mockDb:', err)
    }

    const list = mockDb.get('contracts')
    const idx = list.findIndex((c) => c.id === contractId)
    if (idx === -1) throw new Error('Contract not found')

    if (signature.signerRole === 'customer') {
      list[idx].customerSignature = signature
    } else {
      list[idx].agentSignature = signature
    }

    if (list[idx].customerSignature) {
      list[idx].status = 'signed'
      list[idx].signedAt = new Date().toISOString()
    }

    list[idx].updatedAt = new Date().toISOString()
    mockDb.set('contracts', [...list])
    return list[idx]
  },
}
