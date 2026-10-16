import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { PrinterOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { AgreementDocument } from '../components/AgreementDocument'
import { InvoiceDocument } from '../components/InvoiceDocument'
import { HandoverDocument } from '../components/HandoverDocument'
import { apiGet } from '@/lib/api/client'
import '@/features/documents/styles/printDocument.css'

const DEFAULT_SAMPLE_DATA = {
  company: {
    name: 'Himalayan Rides Nepal Pvt. Ltd.',
    registrationNumber: 'REG-2026-KTM',
    taxId: 'PAN: 601234567',
    headquartersAddress: 'Thamel Marg, Kathmandu, Nepal',
    phone: '+977-1-4700000',
    email: 'operations@himalayanrides.com',
  },
  docSettings: {
    agreementPrefix: 'BRA-',
    agreementTerms: `1. The renter must hold a valid driving licence for the rented vehicle category and obey all Nepal traffic laws.\n2. Only authorized, registered drivers may operate the vehicle. Subleasing or unauthorized handovers are strictly prohibited.\n3. The renter must follow safety regulations, report any accident or breakdown promptly, and preserve incident documentation.\n4. Extensions require prior approval. Unauthorized delays are subject to standard hourly late charges.\n5. Vehicle condition, fuel level, and mileage must match handover inspection upon return.\n6. Security deposit is held separately from rental revenue and refunded upon satisfactory check-in.`,
    depositPolicy: 'Refundable security deposit held separately from rental revenue. Refunded upon vehicle return inspection minus any documented charges or traffic fines.',
    authorizedRepresentative: 'Operations & Fleet Officer',
    invoicePrefix: 'INV-',
    invoiceVatRate: 13,
    invoicePaymentTerms: 'Payment settlement accepted via Cash, Card, Fonepay, or Bank Transfer. Thank you for your business.',
    invoiceSignatory: 'Authorized Signatory',
    handoverPrefix: 'HO-',
    checklistItems: 'Bluebook Copy in Glovebox\nHeadlamps & Indicators Working\nComprehensive Insurance Policy\nHelmets Provided (Two-Wheeler)\nSpare Tyre & Toolkit / Jack\nFirst Aid Kit & Warning Triangle\nRoad Tax & Pollution Token\nClean Exterior & Interior Wash',
  },
  booking: {
    id: 'b-sample',
    bookingCode: 'HRN-2026-0089',
    customerName: 'Aarav Sharma',
    customerPhone: '+977 9841234567',
    vehicleModel: 'Royal Enfield Classic 350 (2024)',
    vehiclePlate: 'BA 21 PA 8821',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    totalDays: 3,
    dailyRate: 2500,
    rentalAmount: 7500,
    extraCharges: 500,
    discountAmount: 0,
    taxAmount: 1040,
    totalAmount: 9040,
    paidAmount: 5000,
    balanceDue: 4040,
    depositAmount: 10000,
    pickupLocationName: 'Kathmandu Central Station',
    returnLocationName: 'Kathmandu Central Station',
    status: 'confirmed',
  },
  customer: {
    fullName: 'Aarav Sharma',
    phone: '+977 9841234567',
    citizenshipNumber: '27-01-78-04432',
    licenseNumber: '01-06-00998234',
    nationality: 'Nepali',
    originType: 'national',
    currentAddress: 'Lazimpat, Kathmandu',
    permanentAddress: 'Biratnagar-4, Morang',
    emergencyContactName: 'Bikash Sharma',
    emergencyContactRelationship: 'Brother',
    emergencyContactPhone: '+977 9801234567',
  },
  vehicle: {
    make: 'Royal Enfield',
    model: 'Classic 350',
    year: 2024,
    plateNumber: 'BA 21 PA 8821',
    odometer: 14200,
    specs: {
      transmission: 'Manual',
      fuelType: 'Petrol',
      seatingCapacity: 2,
    },
    pricing: {
      dailyRate: 2500,
      allowedKmPerDay: 200,
      extraKmRate: 20,
    },
  },
  collateral: {
    collateralType: 'bank_cheque',
    depositAmount: 10000,
    isBlankCheque: true,
    chequeBankName: 'Nabil Bank Ltd.',
    chequeNumber: '00984321',
    chequeAccountHolder: 'Aarav Sharma',
    hasGuarantor: false,
  },
}

async function fetchFromBackend(bookingId?: string | null, code?: string | null) {
  try {
    let booking: any = null

    if (code) {
      booking = await apiGet(`/public/bookings/${code}`)
    } else if (bookingId) {
      booking = await apiGet(`/bookings/${bookingId}`)
    }

    if (!booking) return null

    let vehicle: any = null
    let customer: any = null

    const vehId = booking.vehicle_id || booking.vehicleId
    if (vehId) {
      try {
        vehicle = await apiGet(`/vehicles/${vehId}`)
      } catch (_) {}
    }

    const custId = booking.customer_id || booking.customerId
    if (custId) {
      try {
        customer = await apiGet(`/customers/${custId}`)
      } catch (_) {}
    }

    let companySettings: any = null
    try {
      companySettings = await apiGet('/settings/company')
    } catch (_) {}

    return {
      company: companySettings || DEFAULT_SAMPLE_DATA.company,
      docSettings: companySettings?.documentTemplates || DEFAULT_SAMPLE_DATA.docSettings,
      booking: {
        id: booking.id,
        bookingCode: booking.booking_code || booking.bookingCode || 'HRN-001',
        customerName: customer?.full_name || customer?.fullName || booking.customer_name || booking.customerName,
        customerPhone: customer?.phone || booking.customer_phone || booking.customerPhone,
        vehicleModel: vehicle ? `${vehicle.make} ${vehicle.model}` : booking.vehicle_model || booking.vehicleModel,
        vehiclePlate: vehicle?.plate_number || vehicle?.plateNumber || booking.vehicle_plate || booking.vehiclePlate,
        startDate: booking.start_date || booking.startDate,
        endDate: booking.end_date || booking.endDate,
        totalDays: booking.total_days || booking.totalDays || 1,
        dailyRate: booking.daily_rate || booking.dailyRate || vehicle?.pricing?.dailyRate || 1500,
        rentalAmount: booking.rental_amount || booking.rentalAmount || 0,
        extraCharges: (booking.delivery_fee || 0) + (booking.collection_fee || 0) + (booking.one_way_fee || 0) || (booking.extraCharges || 0),
        discountAmount: booking.discount_amount || booking.discountAmount || 0,
        taxAmount: booking.tax_amount || booking.taxAmount || 0,
        totalAmount: booking.total_amount || booking.totalAmount || 0,
        paidAmount: booking.paid_amount || booking.paidAmount || 0,
        balanceDue: booking.balance_due ?? booking.balanceDue,
        depositAmount: booking.deposit_amount || booking.depositAmount || 10000,
        pickupLocationName: booking.pickup_location_name || booking.pickupLocationName || 'Kathmandu Central',
        returnLocationName: booking.return_location_name || booking.returnLocationName || 'Kathmandu Central',
        status: booking.status || 'confirmed',
      },
      customer: customer ? {
        fullName: customer.full_name || customer.fullName,
        phone: customer.phone,
        email: customer.email,
        passportNumber: customer.passport_number || customer.passportNumber,
        citizenshipNumber: customer.citizenship_number || customer.citizenshipNumber,
        licenseNumber: customer.license_number || customer.licenseNumber,
        nationality: customer.nationality || 'Nepali',
        originType: customer.origin_type || customer.originType || 'national',
        currentAddress: customer.current_address || customer.currentAddress || customer.address,
        permanentAddress: customer.permanent_address || customer.permanentAddress || customer.address,
        emergencyContactName: customer.emergency_contact_name || customer.emergencyContactName,
        emergencyContactPhone: customer.emergency_contact_phone || customer.emergencyContactPhone,
        emergencyContactRelationship: customer.emergency_contact_relationship || customer.emergencyContactRelationship,
      } : null,
      vehicle: vehicle ? {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plateNumber: vehicle.plate_number || vehicle.plateNumber,
        odometer: vehicle.odometer || 0,
        specs: vehicle.specs || {},
        pricing: vehicle.pricing || {},
      } : null,
      collateral: booking.collateral || {},
    }
  } catch (e) {
    console.warn('Backend / mock fetch note:', e)
    return null
  }
}

export const PrintDocumentPage: React.FC = () => {
  const { docType: routeDocType, id: routeId } = useParams<{ docType?: string; id?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialDocType = (routeDocType || searchParams.get('doc') || searchParams.get('type') || 'agreement') as
    | 'agreement'
    | 'invoice'
    | 'handover'

  const [docType, setDocType] = useState<'agreement' | 'invoice' | 'handover'>(
    ['agreement', 'invoice', 'handover'].includes(initialDocType) ? initialDocType : 'agreement'
  )
  const [docData, setDocData] = useState<any>(DEFAULT_SAMPLE_DATA)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const typeParam = routeDocType || searchParams.get('doc') || searchParams.get('type')
    if (typeParam && ['agreement', 'invoice', 'handover'].includes(typeParam)) {
      setDocType(typeParam as 'agreement' | 'invoice' | 'handover')
    }

    const bookingId = routeId || searchParams.get('id') || searchParams.get('bookingId')
    const bookingCode = searchParams.get('code')

    async function loadData() {
      // 1. Try fetching from live backend
      if (bookingId || bookingCode) {
        setIsLoading(true)
        const result = await fetchFromBackend(bookingId, bookingCode)
        setIsLoading(false)
        if (result) {
          setDocData((prev: any) => ({
            ...prev,
            ...result,
            booking: { ...prev.booking, ...result.booking },
            customer: result.customer || prev.customer,
            vehicle: result.vehicle || prev.vehicle,
          }))
          return
        }
      }

      // 2. Try localStorage payload
      try {
        const stored = localStorage.getItem('rental_print_payload')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed && typeof parsed === 'object') {
            setDocData((prev: any) => ({ ...prev, ...parsed }))
            if (parsed.docType && !typeParam) {
              setDocType(parsed.docType)
            }
          }
        }
      } catch (_) {}

      // 3. Fetch company settings from live backend
      try {
        const companySettings: any = await apiGet('/settings/company')
        if (companySettings) {
          setDocData((prev: any) => ({
            ...prev,
            company: companySettings,
            docSettings: companySettings.documentTemplates || prev.docSettings,
          }))
        }
      } catch (_) {}
    }

    loadData()

    // 4. Auto-print if requested
    if (searchParams.get('autoprint') === '1' || searchParams.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [routeDocType, routeId, searchParams])

  const handleDocTypeChange = (type: 'agreement' | 'invoice' | 'handover') => {
    setDocType(type)
    setSearchParams({ ...Object.fromEntries(searchParams.entries()), doc: type })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="print-app-container">
      {/* Top Navbar */}
      <header className="print-top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="print-switch-btn"
            onClick={() => {
              if (window.opener || window.history.length <= 1) {
                window.close()
              } else {
                navigate(-1)
              }
            }}
            title="Go back or close"
            style={{ border: '1px solid #e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeftOutlined /> Back
          </button>
          <div className="print-doc-switcher">
            <button
              className={`print-switch-btn ${docType === 'agreement' ? 'active' : ''}`}
              onClick={() => handleDocTypeChange('agreement')}
            >
              Rental Agreement
            </button>
            <button
              className={`print-switch-btn ${docType === 'invoice' ? 'active' : ''}`}
              onClick={() => handleDocTypeChange('invoice')}
            >
              Tax Invoice
            </button>
            <button
              className={`print-switch-btn ${docType === 'handover' ? 'active' : ''}`}
              onClick={() => handleDocTypeChange('handover')}
            >
              Handover Sheet
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="print-btn-primary" onClick={handlePrint} disabled={isLoading}>
            <PrinterOutlined style={{ marginRight: 6 }} />
            {isLoading ? 'Loading...' : 'Print Document'}
          </button>
        </div>
      </header>

      {/* Main Document Paper Wrapper */}
      <main className="print-paper-wrapper">
        {docType === 'agreement' && <AgreementDocument data={docData} />}
        {docType === 'invoice' && <InvoiceDocument data={docData} />}
        {docType === 'handover' && <HandoverDocument data={docData} />}
      </main>
    </div>
  )
}

export default PrintDocumentPage

