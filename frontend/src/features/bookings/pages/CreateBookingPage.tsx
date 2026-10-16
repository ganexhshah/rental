import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Row,
  Col,
  Checkbox,
  DatePicker,
  Segmented,
  Tag,
  Alert,
  Typography,
  Avatar,
  App,
  Switch,
  Divider,
  Tooltip,
} from 'antd'
import {
  CarOutlined,
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  PrinterOutlined,
  ClearOutlined,
  SafetyCertificateOutlined,
  DollarCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { FileUploader } from '@/components/forms/FileUploader'
import { InstantCustomerKYCModal } from '../components/InstantCustomerKYCModal'
import { BookingSuccessModal } from '../components/BookingSuccessModal'
import {
  VehicleRatePlanModal,
  splitDaysToCompound,
  type RatePlanType,
  type CompoundDuration,
} from '../components/VehicleRatePlanModal'
import {
  printBookingAgreement,
  type CollateralPrintDetails,
} from '../utils/printTemplates'
import { bookingsApi } from '../api'
import { vehiclesApi } from '@/features/vehicles/api'
import { customersApi } from '@/features/customers/api'
import type { Vehicle, VehicleLocation } from '@/types/vehicle'
import type { Customer } from '@/types/customer'
import type { Booking } from '@/types/booking'
import type { UploadFile, InputRef } from 'antd'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

const CUSTOM_BANKS_STORAGE_KEY = 'fleet_custom_nepal_banks'

const DEFAULT_NEPAL_BANKS = [
  // Commercial Banks (Class A)
  'Agriculture Development Bank Ltd. (ADBL)',
  'Citizens Bank International Ltd.',
  'Everest Bank Ltd.',
  'Global IME Bank Ltd.',
  'Himalayan Bank Ltd.',
  'Kumari Bank Ltd.',
  'Laxmi Sunrise Bank Ltd.',
  'Machhapuchchhre Bank Ltd.',
  'Nabil Bank Ltd.',
  'Nepal Bank Ltd.',
  'Nepal Investment Mega Bank Ltd. (NIMB)',
  'Nepal SBI Bank Ltd.',
  'NIC Asia Bank Ltd.',
  'NMB Bank Ltd.',
  'Prabhu Bank Ltd.',
  'Prime Commercial Bank Ltd.',
  'Rastriya Banijya Bank Ltd.',
  'Sanima Bank Ltd.',
  'Siddhartha Bank Ltd.',
  'Standard Chartered Bank Nepal Ltd.',
  // Development Banks (Class B)
  'Corporate Development Bank Ltd.',
  'Garima Bikas Bank Ltd.',
  'Green Development Bank Ltd.',
  'Jyoti Bikas Bank Ltd.',
  'Kamana Sewa Bikas Bank Ltd.',
  'Lumbini Bikas Bank Ltd.',
  'Mahalaxmi Bikas Bank Ltd.',
  'Miteri Development Bank Ltd.',
  'Muktinath Bikas Bank Ltd.',
  'Saptakoshi Development Bank Ltd.',
  'Shangrila Development Bank Ltd.',
  'Shine Resunga Development Bank Ltd.',
  'Sindhu Bikas Bank Ltd.',
  // Finance Companies (Class C)
  'Best Finance Co. Ltd.',
  'Central Finance Ltd.',
  'Goodwill Finance Ltd.',
  'Guheswori Merchant Banking & Finance Ltd.',
  'Gurkhas Finance Ltd.',
  'ICFC Finance Ltd.',
  'Janaki Finance Co. Ltd.',
  'Manjushree Finance Ltd.',
  'Multipurpose Finance Ltd.',
  'Pokhara Finance Ltd.',
  'Progressive Finance Ltd.',
  'Reliance Finance Ltd.',
  'Samriddhi Finance Co. Ltd.',
  'Shree Investment & Finance Co. Ltd.',
  // Cooperatives & Other Institutions
  'Rastriya Sahakari Bank Ltd.',
  'Nepal Clearing House (connectIPS)',
  'Cooperative / Saving & Credit Sanstha',
  'Foreign / International Bank',
]

export const CreateBookingPage: React.FC = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const preselectedVehicleId = searchParams.get('vehicleId') || ''
  const preselectedCustomerId = searchParams.get('customerId') || ''

  // Customer & Vehicle state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(preselectedVehicleId)
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all')
  const [selectedDates, setSelectedDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  // Pricing & Payment state
  const [couponCode, setCouponCode] = useState<string>('')
  const [couponApplied, setCouponApplied] = useState<string | null>(null)
  const [deliveryNeeded, setDeliveryNeeded] = useState<boolean>(false)
  const [collectionNeeded, setCollectionNeeded] = useState<boolean>(false)
  const [deliveryFee, setDeliveryFee] = useState<number>(0)
  const [collectionFee, setCollectionFee] = useState<number>(0)
  const [oneWayFee, setOneWayFee] = useState<number>(0)
  const [paymentOption, setPaymentOption] = useState<'unpaid' | 'advance' | 'full'>('unpaid')
  const [advanceAmount, setAdvanceAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('fonepay')
  const [eligibilityWarning, setEligibilityWarning] = useState<string | null>(null)

  // Pricing Plans & Custom Rates (Daily, Weekly, Monthly, Hourly, Custom)
  const [ratePlan, setRatePlan] = useState<'daily' | 'weekly' | 'monthly' | 'hourly' | 'custom'>('daily')
  const [customDailyRate, setCustomDailyRate] = useState<number | undefined>(undefined)
  const [customDepositAmount, setCustomDepositAmount] = useState<number | undefined>(undefined)
  const [vatEnabled, setVatEnabled] = useState<boolean>(true)

  // Collateral & Cheque Security
  const [collateralType, setCollateralType] = useState<
    'bank_cheque' | 'cash_card' | 'original_document' | 'guarantor_only' | 'waived'
  >('bank_cheque')
  const [isBlankCheque, setIsBlankCheque] = useState<boolean>(true)
  const [chequeAmount, setChequeAmount] = useState<number | undefined>(undefined)
  const [chequeBankName, setChequeBankName] = useState<string>('Nabil Bank Ltd.')
  const [chequeNumber, setChequeNumber] = useState<string>('')
  const [chequeAccountHolder, setChequeAccountHolder] = useState<string>('')
  const [chequePhotos, setChequePhotos] = useState<UploadFile[]>([])

  // Dynamic Bank Options state with localStorage persistence
  const [bankOptions, setBankOptions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_BANKS_STORAGE_KEY)
      if (stored) {
        const custom = JSON.parse(stored) as string[]
        return Array.from(new Set([...DEFAULT_NEPAL_BANKS, ...custom]))
      }
    } catch {
      // fallback to defaults
    }
    return DEFAULT_NEPAL_BANKS
  })
  const [newBankInput, setNewBankInput] = useState('')
  const newBankInputRef = useRef<InputRef>(null)

  const handleAddCustomBank = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault()
    const trimmed = newBankInput.trim()
    if (!trimmed) return
    if (!bankOptions.includes(trimmed)) {
      const updated = [...bankOptions, trimmed]
      setBankOptions(updated)
      try {
        const stored = localStorage.getItem(CUSTOM_BANKS_STORAGE_KEY)
        const custom = stored ? (JSON.parse(stored) as string[]) : []
        if (!custom.includes(trimmed)) {
          localStorage.setItem(CUSTOM_BANKS_STORAGE_KEY, JSON.stringify([...custom, trimmed]))
        }
      } catch {
        // ignore
      }
      message.success(`Added "${trimmed}" to bank list`)
    }
    setChequeBankName(trimmed)
    setNewBankInput('')
    setTimeout(() => {
      newBankInputRef.current?.focus()
    }, 0)
  }

  // Guarantor details
  const [hasGuarantor, setHasGuarantor] = useState<boolean>(false)
  const [guarantorName, setGuarantorName] = useState<string>('')
  const [guarantorPhone, setGuarantorPhone] = useState<string>('')
  const [guarantorRelationship, setGuarantorRelationship] = useState<string>('Brother / Relative')
  const [guarantorIdNumber, setGuarantorIdNumber] = useState<string>('')
  const [guarantorAddress, setGuarantorAddress] = useState<string>('')
  const [guarantorPhotos, setGuarantorPhotos] = useState<UploadFile[]>([])

  // Original Document details
  const [originalDocType, setOriginalDocType] = useState<string>('Passport')
  const [originalDocNumber, setOriginalDocNumber] = useState<string>('')
  const [lockerReference, setLockerReference] = useState<string>('Locker A-1')

  // Modals
  const [isInstantKycModalOpen, setIsInstantKycModalOpen] = useState(false)
  const [isRatePlanModalOpen, setIsRatePlanModalOpen] = useState(false)
  const [createdBookingResult, setCreatedBookingResult] = useState<Booking | null>(null)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)

  // Fetch Vehicles
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-for-booking-creation'],
    queryFn: () => vehiclesApi.getVehicles(),
  })

  // Fetch Customers
  const {
    data: customers = [],
    isLoading: customersLoading,
    isRefetching: customersRefetching,
    refetch: refetchCustomers,
  } = useQuery<Customer[]>({
    queryKey: ['customers-for-booking-creation'],
    queryFn: () => customersApi.getCustomers(),
  })

  const handleRefreshCustomers = async () => {
    try {
      await refetchCustomers()
      message.success('Customer list refreshed')
    } catch {
      message.error('Failed to refresh customer list')
    }
  }

  // Fetch Locations
  const { data: locations = [] } = useQuery<VehicleLocation[]>({
    queryKey: ['locations-for-booking-creation'],
    queryFn: () => vehiclesApi.getLocations(),
  })

  // Fetch All Bookings to check real-time date conflicts
  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getBookings(),
  })

  // Fetch Drivers for Selected Customer
  const { data: customerDrivers = [] } = useQuery<any[]>({
    queryKey: ['customer-drivers', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return []
      try {
        return await customersApi.getCustomerDrivers(selectedCustomerId)
      } catch {
        return []
      }
    },
    enabled: Boolean(selectedCustomerId),
  })

  // Default Office location
  const defaultOfficeLocation = useMemo(() => {
    if (!locations || locations.length === 0) return undefined
    return (
      locations.find(
        (l) =>
          /office|hq|head|main|central/i.test(l.name) ||
          /office|hq|main/i.test(l.code)
      ) || locations[0]
    )
  }, [locations])

  // Pre-fill pickup and return station to default branch
  useEffect(() => {
    if (defaultOfficeLocation) {
      const curPickup = form.getFieldValue('pickupLocationId')
      const curReturn = form.getFieldValue('returnLocationId')
      if (!curPickup) {
        form.setFieldValue('pickupLocationId', defaultOfficeLocation.id)
      }
      if (!curReturn) {
        form.setFieldValue('returnLocationId', defaultOfficeLocation.id)
      }
    }
  }, [defaultOfficeLocation, form])

  // Set initial form values if params present
  useEffect(() => {
    if (preselectedVehicleId) {
      setSelectedVehicleId(preselectedVehicleId)
      form.setFieldValue('vehicleId', preselectedVehicleId)
    }
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId)
      form.setFieldValue('customerId', preselectedCustomerId)
    }
  }, [preselectedVehicleId, preselectedCustomerId, form])

  const currentCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  )

  const currentVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId),
    [vehicles, selectedVehicleId]
  )

  useEffect(() => {
    if (currentCustomer && !chequeAccountHolder) {
      setChequeAccountHolder(currentCustomer.fullName)
    }
  }, [currentCustomer, chequeAccountHolder])

  useEffect(() => {
    if (currentVehicle) {
      if (customDepositAmount === undefined) {
        const defaultDeposit =
          currentVehicle.pricing?.depositAmount ||
          (currentVehicle.type === 'car' ? 15000 : 5000)
        form.setFieldValue('depositAmount', defaultDeposit)
      }
      if (currentVehicle.locationId) {
        const currentPickup = form.getFieldValue('pickupLocationId')
        const currentReturn = form.getFieldValue('returnLocationId')
        if (!currentPickup || currentPickup === defaultOfficeLocation?.id) {
          form.setFieldValue('pickupLocationId', currentVehicle.locationId)
          if (!currentReturn || currentReturn === defaultOfficeLocation?.id) {
            form.setFieldValue('returnLocationId', currentVehicle.locationId)
          }
        }
      }
    }
  }, [currentVehicle, defaultOfficeLocation, customDepositAmount, form])

  const filteredVehicles = useMemo(() => {
    let list = vehicles
    if (vehicleTypeFilter !== 'all') {
      list = list.filter((v) => v.type === vehicleTypeFilter)
    }
    return list
  }, [vehicles, vehicleTypeFilter])

  // Conflict map for all vehicles based on currently selected dates
  const vehicleConflictsMap = useMemo(() => {
    if (!selectedDates || !selectedDates[0] || !selectedDates[1]) {
      return new Map<string, Booking>()
    }
    const startReq = selectedDates[0].valueOf()
    const endReq = selectedDates[1].valueOf()

    const map = new Map<string, Booking>()
    for (const b of allBookings) {
      if (['cancelled', 'completed', 'no_show', 'rejected'].includes(b.status)) continue
      const bStart = dayjs(b.startDate).valueOf()
      const bEnd = dayjs(b.endDate).valueOf()
      if (startReq < bEnd && endReq > bStart) {
        if (!map.has(b.vehicleId)) {
          map.set(b.vehicleId, b)
        }
      }
    }
    return map
  }, [selectedDates, allBookings])

  // Conflict details for current selected vehicle
  const activeVehicleConflict = useMemo(() => {
    if (!selectedVehicleId) return null
    return vehicleConflictsMap.get(selectedVehicleId) || null
  }, [selectedVehicleId, vehicleConflictsMap])

  // Available alternative vehicles for the selected dates
  const availableAlternatives = useMemo(() => {
    if (!activeVehicleConflict || !currentVehicle) return []
    return vehicles.filter(
      (v) =>
        v.id !== selectedVehicleId &&
        (v.type === currentVehicle.type || v.categoryId === currentVehicle.categoryId) &&
        v.status === 'available' &&
        !vehicleConflictsMap.has(v.id)
    )
  }, [activeVehicleConflict, currentVehicle, vehicles, selectedVehicleId, vehicleConflictsMap])

  const handleSwitchToAlternative = (altVehicle: Vehicle) => {
    setSelectedVehicleId(altVehicle.id)
    form.setFieldValue('vehicleId', altVehicle.id)
    setRatePlan('daily')
    setCustomDailyRate(altVehicle.pricing.dailyRate)
    setCustomDepositAmount(
      altVehicle.pricing.depositAmount || (altVehicle.type === 'car' ? 15000 : 5000)
    )
    message.success(
      `Switched to available vehicle: ${altVehicle.make} ${altVehicle.model} (${altVehicle.plateNumber})`
    )
  }

  useEffect(() => {
    if (!currentCustomer) {
      setEligibilityWarning(null)
      return
    }
    if (currentCustomer.isBlacklisted) {
      setEligibilityWarning(
        `Customer is blacklisted: ${currentCustomer.blacklistReason || 'Restricted by administrator'}`
      )
    } else if (currentCustomer.verificationStatus === 'pending') {
      setEligibilityWarning('Customer KYC documents are pending verification.')
    } else {
      setEligibilityWarning(null)
    }
  }, [currentCustomer])

  // Rental Days & Compound Duration (Months, Weeks, Days) calculation
  const rentalDays = useMemo(() => {
    if (!selectedDates || !selectedDates[0] || !selectedDates[1]) return 1
    const diffHours = selectedDates[1].diff(selectedDates[0], 'hour', true)
    return Math.max(1, Math.ceil(diffHours / 24))
  }, [selectedDates])

  const durationCompound = useMemo(() => {
    return splitDaysToCompound(rentalDays)
  }, [rentalDays])

  const handleSetCompoundDuration = (m: number, w: number, d: number) => {
    const safeDays = Math.max(1, (m || 0) * 30 + (w || 0) * 7 + (d || 0))
    const start = selectedDates?.[0] || dayjs()
    const newEnd = start.add(safeDays, 'day')
    setSelectedDates([start, newEnd])
  }

  // Multi-tier vehicle rate options (Daily, Weekly, Monthly, Hourly)
  const vehicleRates = useMemo(() => {
    if (!currentVehicle) {
      return {
        daily: 0,
        weekly: 0,
        weeklyPerDay: 0,
        monthly: 0,
        monthlyPerDay: 0,
        hourly: 0,
      }
    }
    const daily = currentVehicle.pricing?.dailyRate || 0
    const weekly = currentVehicle.pricing?.weeklyRate || Math.round(daily * 7 * 0.88)
    const weeklyPerDay = Math.round(weekly / 7)
    const monthly = currentVehicle.pricing?.monthlyRate || Math.round(daily * 30 * 0.72)
    const monthlyPerDay = Math.round(monthly / 30)
    const hourly = currentVehicle.pricing?.hourlyRate || Math.round(daily / 8)

    return {
      daily,
      weekly,
      weeklyPerDay,
      monthly,
      monthlyPerDay,
      hourly,
    }
  }, [currentVehicle])

  const effectiveDailyRate = useMemo(() => {
    if (!currentVehicle) return 0
    if (ratePlan === 'custom') {
      return customDailyRate !== undefined && customDailyRate >= 0
        ? customDailyRate
        : vehicleRates.daily
    }
    if (ratePlan === 'weekly') {
      return vehicleRates.weeklyPerDay
    }
    if (ratePlan === 'monthly') {
      return vehicleRates.monthlyPerDay
    }
    if (ratePlan === 'hourly') {
      return vehicleRates.hourly
    }
    return vehicleRates.daily
  }, [ratePlan, customDailyRate, currentVehicle, vehicleRates])

  const effectiveDepositAmount = useMemo(() => {
    if (customDepositAmount !== undefined && customDepositAmount >= 0) {
      return customDepositAmount
    }
    return (
      currentVehicle?.pricing?.depositAmount ||
      (currentVehicle?.type === 'car' ? 15000 : 5000)
    )
  }, [customDepositAmount, currentVehicle])

  const pricingSummary = useMemo(() => {
    const safeDays = rentalDays
    let rentalAmount = effectiveDailyRate * safeDays
    let rateFormula = `${safeDays}d × Rs. ${effectiveDailyRate.toLocaleString()}/day`

    if (ratePlan === 'weekly') {
      const fullWeeks = Math.floor(safeDays / 7)
      const remainderDays = safeDays % 7
      const weeksTotal = fullWeeks * vehicleRates.weekly
      const daysTotal = remainderDays * vehicleRates.weeklyPerDay
      rentalAmount = weeksTotal + daysTotal
      const parts: string[] = []
      if (fullWeeks > 0) parts.push(`${fullWeeks} Wk (Rs. ${weeksTotal.toLocaleString()})`)
      if (remainderDays > 0) parts.push(`${remainderDays} Day${remainderDays > 1 ? 's' : ''} (Rs. ${daysTotal.toLocaleString()})`)
      rateFormula = parts.length > 0 ? parts.join(' + ') : `${safeDays}d @ Rs. ${effectiveDailyRate.toLocaleString()}/day`
    } else if (ratePlan === 'monthly') {
      const fullMonths = Math.floor(safeDays / 30)
      const remAfterMonths = safeDays % 30
      const fullWeeks = Math.floor(remAfterMonths / 7)
      const remainderDays = remAfterMonths % 7
      const monthsTotal = fullMonths * vehicleRates.monthly
      const weeksTotal = fullWeeks * vehicleRates.weekly
      const daysTotal = remainderDays * vehicleRates.monthlyPerDay
      rentalAmount = monthsTotal + weeksTotal + daysTotal
      const parts: string[] = []
      if (fullMonths > 0) parts.push(`${fullMonths} Mo (Rs. ${monthsTotal.toLocaleString()})`)
      if (fullWeeks > 0) parts.push(`${fullWeeks} Wk (Rs. ${weeksTotal.toLocaleString()})`)
      if (remainderDays > 0) parts.push(`${remainderDays} Day${remainderDays > 1 ? 's' : ''} (Rs. ${daysTotal.toLocaleString()})`)
      rateFormula = parts.length > 0 ? parts.join(' + ') : `${safeDays}d @ Rs. ${effectiveDailyRate.toLocaleString()}/day`
    }

    const transportSurcharges =
      (deliveryNeeded ? deliveryFee : 0) +
      (collectionNeeded ? collectionFee : 0) +
      oneWayFee

    let discountAmount = 0
    if (couponApplied === 'WELCOME10') {
      discountAmount = Math.round(rentalAmount * 0.1)
    } else if (couponApplied === 'HIMALAYA500') {
      discountAmount = 500
    } else if (couponApplied === 'FESTIVE15') {
      discountAmount = Math.round(rentalAmount * 0.15)
    }

    const subtotal = Math.max(0, rentalAmount + transportSurcharges - discountAmount)
    const vatTax = vatEnabled ? Math.round(subtotal * 0.13) : 0
    const securityDeposit = effectiveDepositAmount
    const grandTotal = subtotal + vatTax

    return {
      dailyRate: effectiveDailyRate,
      rentalDays: safeDays,
      rentalAmount,
      rateFormula,
      transportSurcharges,
      discountAmount,
      subtotal,
      vatTax,
      securityDeposit,
      grandTotal,
    }
  }, [
    effectiveDailyRate,
    effectiveDepositAmount,
    rentalDays,
    ratePlan,
    vehicleRates,
    deliveryNeeded,
    deliveryFee,
    collectionNeeded,
    collectionFee,
    oneWayFee,
    couponApplied,
    vatEnabled,
  ])

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase()
    if (!code) return
    if (['WELCOME10', 'HIMALAYA500', 'FESTIVE15'].includes(code)) {
      setCouponApplied(code)
      message.success(`Coupon "${code}" applied.`)
    } else {
      message.error(`Coupon "${code}" is invalid or expired.`)
    }
  }

  const collateralPrintData: CollateralPrintDetails = useMemo(() => {
    return {
      collateralType,
      depositAmount: effectiveDepositAmount,
      isBlankCheque,
      chequeAmount: isBlankCheque ? undefined : chequeAmount || effectiveDepositAmount,
      chequeBankName,
      chequeNumber,
      chequeAccountHolder: chequeAccountHolder || currentCustomer?.fullName || '',
      chequePhotoUrl: chequePhotos[0]?.url,
      originalDocType,
      originalDocNumber,
      lockerReference,
      hasGuarantor,
      guarantorName,
      guarantorPhone,
      guarantorRelationship,
      guarantorIdNumber,
      guarantorAddress,
      guarantorPhotoUrl: guarantorPhotos[0]?.url,
    }
  }, [
    collateralType,
    effectiveDepositAmount,
    isBlankCheque,
    chequeAmount,
    chequeBankName,
    chequeNumber,
    chequeAccountHolder,
    chequePhotos,
    currentCustomer,
    originalDocType,
    originalDocNumber,
    lockerReference,
    hasGuarantor,
    guarantorName,
    guarantorPhone,
    guarantorRelationship,
    guarantorIdNumber,
    guarantorAddress,
    guarantorPhotos,
  ])

  const createBookingMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!selectedDates || !selectedDates[0] || !selectedDates[1]) {
        throw new Error('Please choose rental start and end dates.')
      }

      const paidAmt =
        paymentOption === 'full'
          ? pricingSummary.grandTotal
          : paymentOption === 'advance'
          ? advanceAmount
          : 0

      const payload = {
        customer_id: values.customerId,
        primary_driver_id: values.primaryDriverId || undefined,
        vehicle_id: values.vehicleId,
        pickup_location_id: values.pickupLocationId || locations[0]?.id || 'loc-1',
        return_location_id:
          values.returnLocationId || values.pickupLocationId || locations[0]?.id || 'loc-1',
        start_date: selectedDates[0].toISOString(),
        end_date: selectedDates[1].toISOString(),
        initial_status: values.initialStatus || 'confirmed',
        coupon_code: couponApplied || undefined,
        delivery_fee: deliveryNeeded ? deliveryFee : 0,
        collection_fee: collectionNeeded ? collectionFee : 0,
        one_way_fee: oneWayFee,
        paid_amount: paidAmt,
        payment_method: paymentMethod,
        deposit_amount: effectiveDepositAmount,
        notes: values.notes || '',
        collateral: collateralPrintData,
      }

      return bookingsApi.createBooking(payload)
    },
    onSuccess: (newBooking) => {
      message.success(`Booking ${newBooking.bookingCode} created successfully.`)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['operations-summary'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })

      setCreatedBookingResult(newBooking)
      setIsSuccessModalOpen(true)
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to create booking')
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!selectedDates || !selectedDates[0] || !selectedDates[1]) {
        message.error('Please select rental schedule dates.')
        return
      }
      if (activeVehicleConflict) {
        message.error(
          `Cannot create booking: ${currentVehicle?.make} ${currentVehicle?.model} (${currentVehicle?.plateNumber}) is already booked from ${dayjs(activeVehicleConflict.startDate).format('YYYY-MM-DD HH:mm')} to ${dayjs(activeVehicleConflict.endDate).format('YYYY-MM-DD HH:mm')}. Please select an alternative vehicle or change rental dates.`
        )
        return
      }
      createBookingMutation.mutate(values)
    } catch {
      message.error('Please fill in all required fields.')
    }
  }

  const handlePreviewAgreement = () => {
    if (!currentCustomer) {
      message.warning('Please select or register a customer first.')
      return
    }
    if (!currentVehicle) {
      message.warning('Please select a vehicle first.')
      return
    }
    if (!selectedDates || !selectedDates[0] || !selectedDates[1]) {
      message.warning('Please select rental dates to generate agreement preview.')
      return
    }

    const previewBooking: Booking = {
      id: `bk-preview-${Date.now()}`,
      bookingCode: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      customerId: currentCustomer.id,
      customerName: currentCustomer.fullName,
      customerEmail: currentCustomer.email,
      customerPhone: currentCustomer.phone,
      vehicleId: currentVehicle.id,
      vehiclePlate: currentVehicle.plateNumber,
      vehicleModel: `${currentVehicle.make} ${currentVehicle.model}`,
      vehicleType: currentVehicle.type,
      pickupLocationId: form.getFieldValue('pickupLocationId') || locations[0]?.id || 'loc-1',
      pickupLocationName:
        locations.find((l) => l.id === form.getFieldValue('pickupLocationId'))?.name ||
        'Main Office',
      returnLocationId: form.getFieldValue('returnLocationId') || locations[0]?.id || 'loc-1',
      returnLocationName:
        locations.find((l) => l.id === form.getFieldValue('returnLocationId'))?.name ||
        'Main Office',
      startDate: selectedDates[0].toISOString(),
      endDate: selectedDates[1].toISOString(),
      status: 'confirmed',
      paymentStatus: paymentOption === 'full' ? 'paid' : paymentOption === 'advance' ? 'partially_paid' : 'unpaid',
      totalDays: rentalDays,
      dailyRate: effectiveDailyRate,
      rentalAmount: pricingSummary.rentalAmount,
      insuranceAmount: 0,
      extraCharges: pricingSummary.transportSurcharges,
      taxAmount: pricingSummary.vatTax,
      discountAmount: pricingSummary.discountAmount,
      totalAmount: pricingSummary.grandTotal,
      depositAmount: effectiveDepositAmount,
      depositStatus: 'held',
      paidAmount: paymentOption === 'full' ? pricingSummary.grandTotal : paymentOption === 'advance' ? advanceAmount : 0,
      balanceDue: paymentOption === 'full' ? 0 : pricingSummary.grandTotal - advanceAmount,
      contractSigned: false,
      source: 'admin',
      pickupReturnDetails: {},
      activityLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    printBookingAgreement(previewBooking, currentVehicle, currentCustomer, collateralPrintData)
  }

  return (
    <PageContainer>
      <PageHeader
        title="New Booking"
        subtitle="Create a customer rental booking, configure collateral security, and print agreements."
        extra={
          <Space size="middle">
            <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate('/operations/bookings')}>
              Back
            </Button>
            <Button size="large" icon={<PrinterOutlined />} onClick={handlePreviewAgreement}>
              Preview Agreement
            </Button>
            <Button size="large" icon={<ClearOutlined />} onClick={() => form.resetFields()}>
              Reset
            </Button>
            <Button
              size="large"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleSubmit}
              loading={createBookingMutation.isPending}
              disabled={Boolean(activeVehicleConflict)}
              title={activeVehicleConflict ? 'Vehicle is already booked for selected dates' : undefined}
              style={{ fontWeight: 600, paddingLeft: 24, paddingRight: 24 }}
            >
              Create Booking
            </Button>
          </Space>
        }
      />

      <Form
        form={form}
        layout="vertical"
        size="large"
        initialValues={{
          initialStatus: 'confirmed',
          pickupLocationId: defaultOfficeLocation?.id || locations[0]?.id || 'loc-1',
          returnLocationId: defaultOfficeLocation?.id || locations[0]?.id || 'loc-1',
          vehicleId: preselectedVehicleId,
          customerId: preselectedCustomerId,
          depositAmount: 15000,
        }}
      >
        <Row gutter={[24, 24]}>
          {/* Left Column */}
          <Col xs={24} lg={15} xl={16}>
            {eligibilityWarning && (
              <Alert
                title="Customer Notice"
                description={eligibilityWarning}
                type="warning"
                showIcon
                style={{ marginBottom: 20, borderRadius: 10 }}
              />
            )}

            {/* 1. Customer Information */}
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Customer Details</span>}
              extra={
                <Space>
                  <Tooltip title="Refresh customers list">
                    <Button
                      icon={<ReloadOutlined spin={customersRefetching} />}
                      onClick={handleRefreshCustomers}
                      loading={customersLoading || customersRefetching}
                    >
                      Refresh
                    </Button>
                  </Tooltip>
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => setIsInstantKycModalOpen(true)}
                    style={{ fontWeight: 600 }}
                  >
                    New Customer / KYC
                  </Button>
                </Space>
              }
              style={{ marginBottom: 20, borderRadius: 12 }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={14}>
                  <Form.Item
                    name="customerId"
                    label={<strong style={{ fontSize: 14 }}>Customer</strong>}
                    rules={[{ required: true, message: 'Please select or register a customer' }]}
                  >
                    <Select
                      size="large"
                      showSearch
                      placeholder="Search by name, phone, or email"
                      optionFilterProp="label"
                      loading={customersLoading || customersRefetching}
                      value={selectedCustomerId}
                      onChange={(val) => {
                        setSelectedCustomerId(val)
                        form.setFieldValue('primaryDriverId', undefined)
                      }}
                      options={customers.map((c) => ({
                        value: c.id,
                        label: `${c.fullName} — ${c.phone || c.email} ${c.isBlacklisted ? '[Blacklisted]' : `[KYC: ${(c.verificationStatus || 'verified').toUpperCase()}]`}`,
                      }))}
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: '8px 0' }} />
                          <div style={{ padding: '0 8px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                              type="text"
                              size="small"
                              icon={<ReloadOutlined spin={customersRefetching} />}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRefreshCustomers()
                              }}
                            >
                              Refresh List
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={(e) => {
                                e.stopPropagation()
                                setIsInstantKycModalOpen(true)
                              }}
                            >
                              New Customer / KYC
                            </Button>
                          </div>
                        </>
                      )}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={10}>
                  <Form.Item
                    name="primaryDriverId"
                    label={<strong style={{ fontSize: 14 }}>Authorized Driver</strong>}
                  >
                    <Select
                      size="large"
                      placeholder="Default (Customer)"
                      allowClear
                      options={customerDrivers.map((d: any) => ({
                        value: d.id,
                        label: `${d.full_name} (${d.license_number})`,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {currentCustomer && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '16px 20px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 16,
                      marginBottom: 12,
                    }}
                  >
                    <Space size="middle" align="start">
                      <Avatar size={48} style={{ backgroundColor: '#2563eb', fontWeight: 700, fontSize: 18 }}>
                        {currentCustomer.fullName.charAt(0).toUpperCase()}
                      </Avatar>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                            {currentCustomer.fullName}
                          </span>
                          {currentCustomer.isInternational || currentCustomer.originType === 'international' ? (
                            <Tag color="geekblue" style={{ fontWeight: 600 }}>
                              🌐 International ({currentCustomer.nationality || 'Foreign'})
                            </Tag>
                          ) : (
                            <Tag color="cyan" style={{ fontWeight: 600 }}>
                              🇳🇵 National ({currentCustomer.nationality || 'Nepali'})
                            </Tag>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
                          {currentCustomer.phone} • {currentCustomer.email}
                        </div>
                      </div>
                    </Space>
                    <Space size="small">
                      <Tag
                        color={currentCustomer.verificationStatus === 'verified' ? 'success' : 'warning'}
                        style={{ fontSize: 13, padding: '4px 10px', fontWeight: 600 }}
                      >
                        KYC {(currentCustomer.verificationStatus || 'Verified').toUpperCase()}
                      </Tag>
                      {currentCustomer.isBlacklisted && (
                        <Tag color="error" style={{ fontSize: 13, padding: '4px 10px', fontWeight: 600 }}>
                          BLACKLISTED
                        </Tag>
                      )}
                    </Space>
                  </div>

                  <Divider style={{ margin: '10px 0' }} />

                  <Row gutter={[16, 8]} style={{ fontSize: 12.5, color: '#334155' }}>
                    {currentCustomer.currentAddress && (
                      <Col xs={24} sm={12}>
                        <span style={{ color: '#64748b' }}>📍 Current Stay (Nepal): </span>
                        <strong>{currentCustomer.currentAddress}</strong>
                      </Col>
                    )}
                    <Col xs={24} sm={12}>
                      <span style={{ color: '#64748b' }}>🏠 Permanent Address: </span>
                      <span>{currentCustomer.permanentAddress || currentCustomer.address || 'On file'}</span>
                    </Col>
                    {currentCustomer.passportNumber ? (
                      <Col xs={24} sm={12}>
                        <span style={{ color: '#64748b' }}>🛂 Passport: </span>
                        <strong>{currentCustomer.passportNumber}</strong>
                        {currentCustomer.passportExpiry && ` (Exp: ${currentCustomer.passportExpiry})`}
                      </Col>
                    ) : null}
                    {currentCustomer.idpNumber ? (
                      <Col xs={24} sm={12}>
                        <span style={{ color: '#64748b' }}>🚗 IDP No: </span>
                        <strong>{currentCustomer.idpNumber}</strong>
                      </Col>
                    ) : currentCustomer.licenseNumber ? (
                      <Col xs={24} sm={12}>
                        <span style={{ color: '#64748b' }}>🪪 License No: </span>
                        <strong>{currentCustomer.licenseNumber}</strong>
                      </Col>
                    ) : null}
                    {currentCustomer.emergencyContactName && (
                      <Col xs={24}>
                        <span style={{ color: '#64748b' }}>🚨 Emergency Contact: </span>
                        <span>{currentCustomer.emergencyContactName} ({currentCustomer.emergencyContactRelationship || 'Contact'} - {currentCustomer.emergencyContactPhone || ''})</span>
                      </Col>
                    )}
                  </Row>
                </div>
              )}
            </Card>

            {/* 2. Vehicle Selection & Rate */}
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Vehicle Selection</span>}
              style={{ marginBottom: 20, borderRadius: 12 }}
            >
              <div style={{ marginBottom: 16 }}>
                <Segmented
                  size="large"
                  value={vehicleTypeFilter}
                  onChange={(val) => setVehicleTypeFilter(val as string)}
                  options={[
                    { label: `All (${vehicles.length})`, value: 'all' },
                    { label: `Cars (${vehicles.filter((v) => v.type === 'car').length})`, value: 'car' },
                    { label: `Bikes (${vehicles.filter((v) => v.type === 'bike').length})`, value: 'bike' },
                    { label: `Scooters (${vehicles.filter((v) => v.type === 'scooter').length})`, value: 'scooter' },
                  ]}
                />
              </div>

              {activeVehicleConflict && (
                <Alert
                  type="error"
                  showIcon
                  icon={<CloseCircleOutlined style={{ fontSize: 20, color: '#dc2626' }} />}
                  title={
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#991b1b' }}>
                      Schedule Conflict: Vehicle is Already Booked for Selected Dates
                    </span>
                  }
                  description={
                    <div style={{ marginTop: 8, fontSize: 13, color: '#450a0a' }}>
                      <div
                        style={{
                          marginBottom: 12,
                          padding: '10px 14px',
                          backgroundColor: '#fef2f2',
                          borderRadius: 8,
                          border: '1px solid #fecaca',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong>Conflicting Booking:</strong>
                          <Tag color="red" style={{ fontWeight: 700, margin: 0 }}>
                            {activeVehicleConflict.bookingCode}
                          </Tag>
                          <Tag color="purple" style={{ textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
                            {activeVehicleConflict.status}
                          </Tag>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <strong>Reserved Period:</strong>{' '}
                          {dayjs(activeVehicleConflict.startDate).format('YYYY-MM-DD HH:mm')} – {dayjs(activeVehicleConflict.endDate).format('YYYY-MM-DD HH:mm')}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <strong>Renter:</strong> {activeVehicleConflict.customerName} ({activeVehicleConflict.customerPhone || activeVehicleConflict.customerEmail || 'Contact on file'})
                        </div>
                      </div>

                      {availableAlternatives.length > 0 ? (
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>
                            Available alternative vehicles ready for this date range:
                          </div>
                          <Space wrap size={[8, 8]}>
                            {availableAlternatives.map((alt) => (
                              <Button
                                key={alt.id}
                                size="middle"
                                type="primary"
                                ghost
                                icon={<SwapOutlined />}
                                onClick={() => handleSwitchToAlternative(alt)}
                                style={{ fontWeight: 600, borderRadius: 6 }}
                              >
                                Switch to {alt.make} {alt.model} ({alt.plateNumber}) • Rs. {alt.pricing.dailyRate.toLocaleString()}/day
                              </Button>
                            ))}
                          </Space>
                        </div>
                      ) : (
                        <div style={{ color: '#b91c1c', fontStyle: 'italic' }}>
                          No alternative vehicles in this category are available for the selected dates. Please adjust your rental schedule dates.
                        </div>
                      )}
                    </div>
                  }
                  style={{ marginBottom: 18, borderRadius: 10, border: '1px solid #fca5a5' }}
                />
              )}

              <Form.Item
                name="vehicleId"
                label={<strong style={{ fontSize: 14 }}>Select Vehicle</strong>}
                rules={[{ required: true, message: 'Please select a vehicle' }]}
              >
                <Select
                  size="large"
                  showSearch
                  placeholder="Select by model, plate number, or category"
                  optionFilterProp="filterText"
                  loading={vehiclesLoading}
                  value={selectedVehicleId}
                  onChange={(val) => {
                    setSelectedVehicleId(val)
                    const vObj = vehicles.find((v) => v.id === val)
                    if (vObj) {
                      setRatePlan('daily')
                      setCustomDailyRate(vObj.pricing.dailyRate)
                      setCustomDepositAmount(vObj.pricing.depositAmount || (vObj.type === 'car' ? 15000 : 5000))
                    }
                  }}
                  options={filteredVehicles.map((v) => {
                    const conflict = vehicleConflictsMap.get(v.id)
                    const isBooked = Boolean(conflict)
                    const isSelected = v.id === selectedVehicleId
                    return {
                      value: v.id,
                      disabled: isBooked && !isSelected,
                      filterText: `${v.make} ${v.model} ${v.plateNumber} ${v.type} ${v.categoryName || ''}`,
                      label: (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span>
                            {v.make} {v.model} ({v.plateNumber})
                          </span>
                          {isBooked ? (
                            <Tag color="error" style={{ fontSize: 11, margin: 0, fontWeight: 600 }}>
                              Booked: {dayjs(conflict!.startDate).format('MMM D')} - {dayjs(conflict!.endDate).format('MMM D')}
                            </Tag>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>
                              Rs. {v.pricing.dailyRate.toLocaleString()}/day
                            </span>
                          )}
                        </div>
                      ),
                    }
                  })}
                />
              </Form.Item>

              {currentVehicle && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '16px 20px',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    marginBottom: 20,
                  }}
                >
                  <Row gutter={[20, 16]} align="middle">
                    <Col xs={24} sm={7}>
                      <img
                        src={currentVehicle.primaryImage}
                        alt={currentVehicle.model}
                        style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                      />
                    </Col>
                    <Col xs={24} sm={17}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                            {currentVehicle.make} {currentVehicle.model} ({currentVehicle.year})
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                            Plate: <strong>{currentVehicle.plateNumber}</strong> • {currentVehicle.specs.transmission} • {currentVehicle.specs.fuelType} • {currentVehicle.specs.seatingCapacity} Seats
                          </div>
                        </div>

                        {/* Rate Tag & Change Plan Button */}
                        <Space size="small" align="center">
                          <Tag
                            color={ratePlan === 'custom' ? 'orange' : ratePlan === 'monthly' ? 'purple' : ratePlan === 'weekly' ? 'green' : ratePlan === 'hourly' ? 'cyan' : 'blue'}
                            onClick={() => setIsRatePlanModalOpen(true)}
                            style={{
                              fontSize: 14,
                              padding: '5px 12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              borderRadius: 6,
                              userSelect: 'none',
                            }}
                            title="Click to change rate plan"
                          >
                            Rs. {effectiveDailyRate.toLocaleString()}/day
                          </Tag>
                          <Button
                            type="primary"
                            ghost
                            size="middle"
                            icon={<DollarCircleOutlined />}
                            onClick={() => setIsRatePlanModalOpen(true)}
                            style={{ fontWeight: 600, borderRadius: 6 }}
                          >
                            Rate Plans
                          </Button>
                        </Space>
                      </div>

                      {/* Clean Active Plan Info Row */}
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 10,
                          borderTop: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8,
                          fontSize: 13,
                        }}
                      >
                        <Space size="small">
                          <span style={{ color: '#64748b' }}>Active Rate Plan:</span>
                          <Tag
                            color={ratePlan === 'custom' ? 'orange' : ratePlan === 'monthly' ? 'purple' : ratePlan === 'weekly' ? 'green' : ratePlan === 'hourly' ? 'cyan' : 'blue'}
                            style={{ fontWeight: 600, borderRadius: 4, margin: 0 }}
                          >
                            {ratePlan === 'daily' && 'Daily Plan'}
                            {ratePlan === 'weekly' && 'Weekly Plan (12% Off)'}
                            {ratePlan === 'monthly' && 'Monthly Plan (28% Off)'}
                            {ratePlan === 'hourly' && 'Hourly Plan'}
                            {ratePlan === 'custom' && 'Custom Negotiated'}
                          </Tag>
                          <span style={{ color: '#334155', fontWeight: 500 }}>
                            {ratePlan === 'daily' && `Rs. ${vehicleRates.daily.toLocaleString()}/day`}
                            {ratePlan === 'weekly' && `Rs. ${vehicleRates.weeklyPerDay.toLocaleString()}/day (Rs. ${vehicleRates.weekly.toLocaleString()}/wk)`}
                            {ratePlan === 'monthly' && `Rs. ${vehicleRates.monthlyPerDay.toLocaleString()}/day (Rs. ${vehicleRates.monthly.toLocaleString()}/mo)`}
                            {ratePlan === 'hourly' && `Rs. ${vehicleRates.hourly.toLocaleString()}/hr`}
                            {ratePlan === 'custom' && `Rs. ${(customDailyRate ?? effectiveDailyRate).toLocaleString()}/day`}
                          </span>
                        </Space>

                        <Button
                          type="link"
                          size="small"
                          onClick={() => setIsRatePlanModalOpen(true)}
                          style={{ padding: 0, fontWeight: 600, fontSize: 13 }}
                        >
                          Change Plan / Custom Rate →
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </div>
              )}

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="pickupLocationId"
                    label={<strong style={{ fontSize: 14 }}>Pickup Station</strong>}
                    rules={[{ required: true, message: 'Please select pickup station' }]}
                  >
                    <Select
                      size="large"
                      placeholder="Select pickup station"
                      options={locations.map((l) => ({
                        value: l.id,
                        label: `${l.name} (${l.city})`,
                      }))}
                      onChange={(val) => {
                        form.setFieldValue('pickupLocationId', val)
                        const ret = form.getFieldValue('returnLocationId')
                        if (!ret || ret === defaultOfficeLocation?.id) {
                          form.setFieldValue('returnLocationId', val)
                        }
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    name="returnLocationId"
                    label={<strong style={{ fontSize: 14 }}>Return Station</strong>}
                    rules={[{ required: true, message: 'Please select return station' }]}
                  >
                    <Select
                      size="large"
                      placeholder="Select return station"
                      options={locations.map((l) => ({
                        value: l.id,
                        label: `${l.name} (${l.city})`,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 3. Rental Schedule & Logistics */}
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Rental Period & Logistics</span>}
              style={{ marginBottom: 20, borderRadius: 12 }}
            >
              <Form.Item
                label={<strong style={{ fontSize: 14 }}>Rental Schedule (Pickup — Return)</strong>}
                rules={[{ required: true, message: 'Please select dates' }]}
                style={{ marginBottom: 12 }}
              >
                <RangePicker
                  size="large"
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%', height: 44 }}
                  value={selectedDates}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setSelectedDates([dates[0], dates[1]])
                    } else {
                      setSelectedDates(null)
                    }
                  }}
                />
              </Form.Item>

              <Row gutter={12} style={{ marginBottom: 16 }}>
                <Col xs={8}>
                  <Form.Item label="Months (30d)" style={{ marginBottom: 0 }}>
                    <InputNumber
                      min={0}
                      max={24}
                      value={durationCompound.months}
                      onChange={(val) => {
                        const m = val || 0
                        handleSetCompoundDuration(m, durationCompound.weeks, durationCompound.days)
                        if (m >= 1 && ratePlan !== 'monthly' && ratePlan !== 'custom') {
                          setRatePlan('monthly')
                        } else if (m === 0 && ratePlan === 'monthly') {
                          setRatePlan(durationCompound.weeks >= 1 ? 'weekly' : 'daily')
                        }
                      }}
                      addonAfter="Mo"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={8}>
                  <Form.Item label="Weeks (7d)" style={{ marginBottom: 0 }}>
                    <InputNumber
                      min={0}
                      max={52}
                      value={durationCompound.weeks}
                      onChange={(val) => {
                        const w = val || 0
                        handleSetCompoundDuration(durationCompound.months, w, durationCompound.days)
                        if (w >= 1 && durationCompound.months === 0 && ratePlan !== 'weekly' && ratePlan !== 'custom') {
                          setRatePlan('weekly')
                        } else if (w === 0 && durationCompound.months === 0 && ratePlan === 'weekly') {
                          setRatePlan('daily')
                        }
                      }}
                      addonAfter="Wk"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={8}>
                  <Form.Item label="Extra Days" style={{ marginBottom: 0 }}>
                    <InputNumber
                      min={0}
                      max={31}
                      value={durationCompound.days}
                      onChange={(val) => {
                        const d = val || 0
                        handleSetCompoundDuration(durationCompound.months, durationCompound.weeks, d)
                        if (d >= 1 && durationCompound.months === 0 && durationCompound.weeks === 0 && (ratePlan === 'weekly' || ratePlan === 'monthly')) {
                          setRatePlan('daily')
                        }
                      }}
                      addonAfter="Days"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={20} style={{ marginTop: 12 }}>
                <Col xs={24} sm={12}>
                  <Checkbox
                    checked={deliveryNeeded}
                    onChange={(e) => setDeliveryNeeded(e.target.checked)}
                    style={{ marginBottom: 10, fontSize: 14 }}
                  >
                    <strong style={{ fontSize: 14 }}>Doorstep Delivery</strong>
                  </Checkbox>
                  {deliveryNeeded && (
                    <InputNumber
                      size="large"
                      min={0}
                      style={{ width: '100%', marginTop: 6 }}
                      addonBefore="Delivery Fee (Rs.)"
                      value={deliveryFee}
                      onChange={(v) => setDeliveryFee(v || 0)}
                    />
                  )}
                </Col>

                <Col xs={24} sm={12}>
                  <Checkbox
                    checked={collectionNeeded}
                    onChange={(e) => setCollectionNeeded(e.target.checked)}
                    style={{ marginBottom: 10, fontSize: 14 }}
                  >
                    <strong style={{ fontSize: 14 }}>Doorstep Return Collection</strong>
                  </Checkbox>
                  {collectionNeeded && (
                    <InputNumber
                      size="large"
                      min={0}
                      style={{ width: '100%', marginTop: 6 }}
                      addonBefore="Collection Fee (Rs.)"
                      value={collectionFee}
                      onChange={(v) => setCollectionFee(v || 0)}
                    />
                  )}
                </Col>
              </Row>
            </Card>

            {/* 4. Security Deposit & Collateral */}
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Security Deposit & Collateral</span>}
              style={{ marginBottom: 20, borderRadius: 12 }}
            >
              <Row gutter={16} align="middle" style={{ marginBottom: 18 }}>
                <Col xs={24} sm={12}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                    Security Deposit Amount:
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Refundable deposit held against fuel, damages, or traffic fines.
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <InputNumber
                    size="large"
                    min={0}
                    value={effectiveDepositAmount}
                    onChange={(v) => setCustomDepositAmount(v ?? 0)}
                    addonBefore="Rs."
                    style={{ width: '100%', fontWeight: 700 }}
                  />
                </Col>
              </Row>

              <div style={{ marginBottom: 16 }}>
                <span style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
                  Collateral Method:
                </span>
                <Segmented
                  size="large"
                  block
                  value={collateralType}
                  onChange={(val) => setCollateralType(val as any)}
                  options={[
                    { label: 'Bank Cheque', value: 'bank_cheque' },
                    { label: 'Cash / Card', value: 'cash_card' },
                    { label: 'Original Doc', value: 'original_document' },
                    { label: 'Guarantor', value: 'guarantor_only' },
                    { label: 'Waived', value: 'waived' },
                  ]}
                />
              </div>

              {/* Cheque details */}
              {collateralType === 'bank_cheque' && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '16px 20px',
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ marginBottom: 14 }}>
                    <Segmented
                      size="large"
                      value={isBlankCheque ? 'blank' : 'fixed'}
                      onChange={(val) => setIsBlankCheque(val === 'blank')}
                      options={[
                        { label: 'Blank Cheque', value: 'blank' },
                        { label: 'Fixed Cheque Amount', value: 'fixed' },
                      ]}
                    />
                  </div>

                  {!isBlankCheque && (
                    <div style={{ marginBottom: 16 }}>
                      <InputNumber
                        size="large"
                        min={0}
                        value={chequeAmount || effectiveDepositAmount}
                        onChange={(v) => setChequeAmount(v || 0)}
                        addonBefore="Cheque Amount (Rs.)"
                        style={{ width: '100%', maxWidth: 300, fontWeight: 700 }}
                      />
                    </div>
                  )}

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item label={<strong style={{ fontSize: 13 }}>Bank Name</strong>} style={{ marginBottom: 12 }}>
                        <Select
                          size="large"
                          showSearch
                          placeholder="Select or add bank"
                          value={chequeBankName}
                          onChange={setChequeBankName}
                          filterOption={(input, option) =>
                            ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={bankOptions.map((b) => ({ value: b, label: b }))}
                          dropdownRender={(menu) => (
                            <div>
                              {menu}
                              <Divider style={{ margin: '8px 0' }} />
                              <Space.Compact style={{ width: '100%', padding: '0 8px 6px' }}>
                                <Input
                                  ref={newBankInputRef}
                                  size="middle"
                                  placeholder="Add custom bank / cooperative"
                                  value={newBankInput}
                                  onChange={(e) => setNewBankInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleAddCustomBank()
                                    }
                                  }}
                                />
                                <Button
                                  type="primary"
                                  icon={<PlusOutlined />}
                                  onClick={handleAddCustomBank}
                                  disabled={!newBankInput.trim()}
                                >
                                  Add
                                </Button>
                              </Space.Compact>
                            </div>
                          )}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item label={<strong style={{ fontSize: 13 }}>Cheque Leaf Number</strong>} style={{ marginBottom: 12 }}>
                        <Input
                          size="large"
                          placeholder="e.g. 00892341"
                          value={chequeNumber}
                          onChange={(e) => setChequeNumber(e.target.value)}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item label={<strong style={{ fontSize: 13 }}>Account Holder Name</strong>} style={{ marginBottom: 12 }}>
                        <Input
                          size="large"
                          placeholder="Account holder name"
                          value={chequeAccountHolder}
                          onChange={(e) => setChequeAccountHolder(e.target.value)}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item label={<strong style={{ fontSize: 13 }}>Cheque Photo (Optional)</strong>} style={{ marginBottom: 12 }}>
                        <FileUploader
                          fileList={chequePhotos}
                          onChange={setChequePhotos}
                          folder="booking-collateral"
                          title="Upload cheque photo"
                          description="Clear front scan or photo"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Original Document details */}
              {collateralType === 'original_document' && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '16px 20px',
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  <Row gutter={16}>
                    <Col xs={24} sm={8}>
                      <Form.Item label={<strong style={{ fontSize: 13 }}>Document Type</strong>} style={{ marginBottom: 12 }}>
                        <Select
                          size="large"
                          value={originalDocType}
                          onChange={setOriginalDocType}
                          options={[
                            { value: 'Passport', label: 'Original Passport' },
                            { value: 'Citizenship', label: 'Original Citizenship' },
                            { value: 'Vehicle Bluebook', label: 'Vehicle Bluebook' },
                            { value: 'Other Document', label: 'Other Document' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label={<strong style={{ fontSize: 13 }}>Document Number</strong>} style={{ marginBottom: 12 }}>
                        <Input
                          size="large"
                          placeholder="e.g. 08923412"
                          value={originalDocNumber}
                          onChange={(e) => setOriginalDocNumber(e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label={<strong style={{ fontSize: 13 }}>Safe / Locker Ref</strong>} style={{ marginBottom: 12 }}>
                        <Input
                          size="large"
                          placeholder="e.g. Locker A-1"
                          value={lockerReference}
                          onChange={(e) => setLockerReference(e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Guarantor section */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '16px 20px',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Attach Guarantor / Witness:</span>
                  <Switch
                    checked={hasGuarantor}
                    onChange={setHasGuarantor}
                    checkedChildren="Attached"
                    unCheckedChildren="None"
                  />
                </div>

                {hasGuarantor && (
                  <div style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item label={<strong style={{ fontSize: 13 }}>Guarantor Name</strong>} style={{ marginBottom: 12 }}>
                          <Input
                            size="large"
                            placeholder="Full name"
                            value={guarantorName}
                            onChange={(e) => setGuarantorName(e.target.value)}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={12}>
                        <Form.Item label={<strong style={{ fontSize: 13 }}>Guarantor Phone</strong>} style={{ marginBottom: 12 }}>
                          <Input
                            size="large"
                            placeholder="Mobile phone"
                            value={guarantorPhone}
                            onChange={(e) => setGuarantorPhone(e.target.value)}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={8}>
                        <Form.Item label={<strong style={{ fontSize: 13 }}>Relationship</strong>} style={{ marginBottom: 12 }}>
                          <Select
                            size="large"
                            value={guarantorRelationship}
                            onChange={setGuarantorRelationship}
                            options={[
                              { value: 'Father', label: 'Father' },
                              { value: 'Mother', label: 'Mother' },
                              { value: 'Brother / Relative', label: 'Brother / Sister' },
                              { value: 'Spouse', label: 'Spouse' },
                              { value: 'Friend / Partner', label: 'Friend' },
                              { value: 'Employer / Colleague', label: 'Employer / Colleague' },
                            ]}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={8}>
                        <Form.Item label={<strong style={{ fontSize: 13 }}>Citizenship / ID No.</strong>} style={{ marginBottom: 12 }}>
                          <Input
                            size="large"
                            placeholder="e.g. 27-01-78-00123"
                            value={guarantorIdNumber}
                            onChange={(e) => setGuarantorIdNumber(e.target.value)}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={8}>
                        <Form.Item label={<strong style={{ fontSize: 13 }}>Address</strong>} style={{ marginBottom: 12 }}>
                          <Input
                            size="large"
                            placeholder="Permanent address"
                            value={guarantorAddress}
                            onChange={(e) => setGuarantorAddress(e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                )}
              </div>
            </Card>

            {/* 5. Status & Notes */}
            <Card title={<span style={{ fontSize: 16, fontWeight: 600 }}>Status & Notes</span>} style={{ marginBottom: 20, borderRadius: 12 }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="initialStatus" label={<strong style={{ fontSize: 14 }}>Booking Status</strong>}>
                    <Select
                      size="large"
                      options={[
                        { value: 'confirmed', label: 'Confirmed' },
                        { value: 'active', label: 'Active (Handed Over)' },
                        { value: 'pickup_scheduled', label: 'Ready for Handover' },
                        { value: 'pending_confirmation', label: 'Pending Approval' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name="notes" label={<strong style={{ fontSize: 14 }}>Notes / Special Instructions</strong>}>
                    <Input size="large" placeholder="e.g. Flight QR 652, KYC verified at counter" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Right Summary Column */}
          <Col xs={24} lg={9} xl={8}>
            <div style={{ position: 'sticky', top: 20 }}>
              <Card
                title={<span style={{ fontSize: 17, fontWeight: 700 }}>Quotation Summary</span>}
                extra={<Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>NPR</Tag>}
                style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
              >
                {/* Selected Asset Header */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '14px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                    {currentVehicle ? `${currentVehicle.make} ${currentVehicle.model}` : 'No vehicle selected'}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    {currentVehicle ? `Plate: ${currentVehicle.plateNumber}` : 'Select a vehicle from fleet'}
                  </div>
                </div>

                {/* Line Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Text strong style={{ color: '#334155' }}>Base Rental</Text>
                        {ratePlan !== 'daily' && (
                          <Tag
                            color={ratePlan === 'custom' ? 'orange' : ratePlan === 'monthly' ? 'purple' : ratePlan === 'weekly' ? 'green' : 'cyan'}
                            style={{ fontSize: 11, padding: '0 6px', margin: 0, fontWeight: 600, borderRadius: 4 }}
                          >
                            {ratePlan === 'weekly' && 'Weekly Plan'}
                            {ratePlan === 'monthly' && 'Monthly Plan'}
                            {ratePlan === 'hourly' && 'Hourly Plan'}
                            {ratePlan === 'custom' && 'Custom Rate'}
                          </Tag>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                        {pricingSummary.rateFormula}
                      </div>
                    </div>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}><CurrencyDisplay amount={pricingSummary.rentalAmount} /></strong>
                  </div>

                  {pricingSummary.transportSurcharges > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Logistics & Delivery:</Text>
                      <strong>+ <CurrencyDisplay amount={pricingSummary.transportSurcharges} /></strong>
                    </div>
                  )}

                  {pricingSummary.discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span>Discount ({couponApplied}):</span>
                      <strong>- <CurrencyDisplay amount={pricingSummary.discountAmount} /></strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Text type="secondary">VAT (13%):</Text>
                      <Switch checked={vatEnabled} onChange={setVatEnabled} />
                    </Space>
                    <span><CurrencyDisplay amount={pricingSummary.vatTax} /></span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 10,
                      marginTop: 4,
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Grand Total</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {vatEnabled ? 'Includes 13% VAT' : 'VAT Excluded'}
                      </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1e40af' }}>
                      <CurrencyDisplay amount={pricingSummary.grandTotal} />
                    </div>
                  </div>

                  {/* Security Deposit badge */}
                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      padding: '12px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#166534',
                      marginTop: 4,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Security Deposit: Rs. {pricingSummary.securityDeposit.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 3 }}>
                      {collateralType === 'bank_cheque'
                        ? `Bank Cheque (${isBlankCheque ? 'Blank Cheque' : `Rs. ${(chequeAmount || pricingSummary.securityDeposit).toLocaleString()}`})`
                        : collateralType === 'cash_card'
                        ? 'Cash / Card Deposit'
                        : collateralType === 'original_document'
                        ? `Original Document (${originalDocType})`
                        : collateralType === 'guarantor_only'
                        ? 'Guarantor Bond'
                        : 'Deposit Waived'}
                    </div>
                  </div>
                </div>

                {/* Promo Code Input */}
                <div style={{ marginTop: 18, marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                    Promo Code:
                  </Text>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      size="large"
                      placeholder="e.g. WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <Button size="large" onClick={handleApplyCoupon} style={{ fontWeight: 600 }}>
                      Apply
                    </Button>
                  </Space.Compact>
                </div>

                {/* Payment Option - Fully Responsive */}
                <div
                  style={{
                    marginBottom: 20,
                    backgroundColor: '#f8fafc',
                    padding: '16px',
                    borderRadius: 10,
                  }}
                >
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8, color: '#1e293b' }}>
                    Payment Mode:
                  </Text>

                  <Segmented
                    size="large"
                    block
                    value={paymentOption}
                    onChange={(val) => setPaymentOption(val as 'unpaid' | 'advance' | 'full')}
                    options={[
                      { label: 'Unpaid', value: 'unpaid' },
                      { label: 'Advance', value: 'advance' },
                      { label: 'Full Paid', value: 'full' },
                    ]}
                    style={{ marginBottom: 12 }}
                  />

                  {paymentOption === 'advance' && (
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Advance Amount (NPR):
                      </Text>
                      <InputNumber
                        size="large"
                        min={0}
                        max={pricingSummary.grandTotal}
                        value={advanceAmount}
                        onChange={(v) => setAdvanceAmount(v || 0)}
                        addonBefore="Rs."
                        style={{ width: '100%', fontWeight: 700 }}
                      />
                    </div>
                  )}

                  {paymentOption !== 'unpaid' && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Payment Method:
                      </Text>
                      <Select
                        size="large"
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        style={{ width: '100%' }}
                        options={[
                          { value: 'fonepay', label: 'Fonepay / QR' },
                          { value: 'cash', label: 'Cash' },
                          { value: 'bank_transfer', label: 'Bank Transfer' },
                          { value: 'pos_card', label: 'POS / Card' },
                          { value: 'esewa_khalti', label: 'eSewa / Khalti' },
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<CheckCircleOutlined />}
                    onClick={handleSubmit}
                    loading={createBookingMutation.isPending}
                    disabled={Boolean(activeVehicleConflict)}
                    style={{ height: 48, fontSize: 16, fontWeight: 700, borderRadius: 8 }}
                  >
                    {activeVehicleConflict ? 'Vehicle Already Booked (Resolve Conflict)' : 'Create Booking'}
                  </Button>

                  <Button
                    size="large"
                    block
                    icon={<PrinterOutlined />}
                    onClick={handlePreviewAgreement}
                    style={{ height: 44, fontWeight: 600, borderRadius: 8 }}
                  >
                    Preview Agreement
                  </Button>
                </Space>
              </Card>
            </div>
          </Col>
        </Row>
      </Form>

      {/* Customer KYC Modal */}
      <InstantCustomerKYCModal
        open={isInstantKycModalOpen}
        onClose={() => setIsInstantKycModalOpen(false)}
        onCustomerCreated={(newCust) => {
          // Immediately update React Query cache so currentCustomer and Select options reflect new customer
          queryClient.setQueryData<Customer[]>(['customers-for-booking-creation'], (old = []) => {
            const exists = old.some((c) => c.id === newCust.id)
            return exists ? old.map((c) => (c.id === newCust.id ? newCust : c)) : [newCust, ...old]
          })
          queryClient.invalidateQueries({ queryKey: ['customers-for-booking-creation'] })
          queryClient.invalidateQueries({ queryKey: ['customers'] })
          queryClient.invalidateQueries({ queryKey: ['customers-verification'] })

          setSelectedCustomerId(newCust.id)
          form.setFieldValue('customerId', newCust.id)
          form.setFieldValue('primaryDriverId', undefined)

          queryClient.invalidateQueries({ queryKey: ['customer-drivers', newCust.id] })
        }}
      />

      {/* Vehicle Rate Plan & Pricing Modal */}
      <VehicleRatePlanModal
        open={isRatePlanModalOpen}
        vehicle={currentVehicle || null}
        rentalDays={rentalDays}
        currentRatePlan={ratePlan}
        currentCustomRate={customDailyRate}
        onClose={() => setIsRatePlanModalOpen(false)}
        onApply={(newPlan, newCustomRate, newCompound) => {
          setRatePlan(newPlan)
          if (newPlan === 'custom') {
            setCustomDailyRate(newCustomRate)
          }
          if (newCompound) {
            handleSetCompoundDuration(newCompound.months, newCompound.weeks, newCompound.days)
          }
        }}
      />

      {/* Booking Created Modal */}
      <BookingSuccessModal
        open={isSuccessModalOpen}
        booking={createdBookingResult}
        vehicle={currentVehicle}
        customer={currentCustomer}
        collateral={collateralPrintData}
        onClose={() => {
          setIsSuccessModalOpen(false)
          navigate('/operations/bookings')
        }}
      />
    </PageContainer>
  )
}
