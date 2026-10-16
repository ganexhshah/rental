import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  publicApi,
  PublicTenantConfig,
  PublicVehicle,
  PublicAddon,
  CreatePublicBookingPayload,
  PublicBookingResponse,
} from '../api'

export const TenantLandingPage: React.FC = () => {
  const { tenantSlug = 'ridersone' } = useParams<{ tenantSlug: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<PublicTenantConfig | null>(null)
  const [vehicles, setVehicles] = useState<PublicVehicle[]>([])
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'bike' | 'scooter' | 'car'>('all')

  // Search widget dates & location
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const defaultReturnStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().split('T')[0]
  }, [])

  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(defaultReturnStr)
  const [selectedLocation, setSelectedLocation] = useState<string>('')

  // Booking Modal State
  const [selectedVehicle, setSelectedVehicle] = useState<PublicVehicle | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [insuranceSelected, setInsuranceSelected] = useState(true)
  const [customerFirstName, setCustomerFirstName] = useState('')
  const [customerLastName, setCustomerLastName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerLicense, setCustomerLicense] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [bookingSuccessData, setBookingSuccessData] = useState<PublicBookingResponse | null>(null)

  // Fetch initial data from real backend
  useEffect(() => {
    let isMounted = true
    async function loadTenantData() {
      try {
        setLoading(true)
        setError(null)
        const [cfg, vList] = await Promise.all([
          publicApi.getTenantConfig(tenantSlug),
          publicApi.getPublicVehicles(tenantSlug),
        ])
        if (isMounted) {
          setConfig(cfg)
          setVehicles(vList || [])
          if (cfg?.locations && cfg.locations.length > 0) {
            setSelectedLocation(cfg.locations[0].id)
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load tenant public config:', err)
          setError(err?.message || 'Could not load rental fleet for this provider.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadTenantData()
    return () => {
      isMounted = false
    }
  }, [tenantSlug])

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    if (categoryFilter === 'all') return vehicles
    return vehicles.filter(
      (v) => v.vehicle_type?.toLowerCase() === categoryFilter || v.category?.toLowerCase().includes(categoryFilter)
    )
  }, [vehicles, categoryFilter])

  // Calculation for modal
  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return 1
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 1
  }, [startDate, endDate])

  const currencySymbol = config?.currency_symbol || 'Rs.'

  const calculateTotal = useMemo(() => {
    if (!selectedVehicle) return 0
    let total = selectedVehicle.daily_rate * rentalDays
    if (insuranceSelected) {
      total += 500 * rentalDays
    }
    if (config?.addons) {
      for (const addonId of selectedAddons) {
        const found = config.addons.find((a) => a.id === addonId)
        if (found) {
          total += found.price_per_day * rentalDays
        }
      }
    }
    return total
  }, [selectedVehicle, rentalDays, insuranceSelected, selectedAddons, config])

  const handleOpenBooking = (vehicle: PublicVehicle) => {
    setSelectedVehicle(vehicle)
    setBookingSuccessData(null)
    setBookingModalOpen(true)
  }

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    )
  }

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle || !customerFirstName || !customerEmail) return

    try {
      setSubmittingBooking(true)
      const loc = config?.locations.find((l) => l.id === selectedLocation)

      const payload: CreatePublicBookingPayload = {
        vehicle_id: selectedVehicle.id,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        pickup_location_id: selectedLocation || undefined,
        return_location_id: selectedLocation || undefined,
        pickup_location: loc?.name || 'Kathmandu Station',
        return_location: loc?.name || 'Kathmandu Station',
        insurance: insuranceSelected,
        customer: {
          first_name: customerFirstName,
          last_name: customerLastName,
          email: customerEmail,
          phone: customerPhone,
          license_number: customerLicense,
        },
        notes: bookingNotes
          ? `${bookingNotes} | Addons: ${selectedAddons.join(', ')}`
          : selectedAddons.length > 0
          ? `Addons: ${selectedAddons.join(', ')}`
          : undefined,
      }

      const res = await publicApi.createBooking(tenantSlug, payload)
      setBookingSuccessData(res)
    } catch (err: any) {
      alert(err?.message || 'Failed to complete booking. Please try again or reach out by phone.')
    } finally {
      setSubmittingBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <h2 className="text-xl font-semibold">Loading Rental Fleet...</h2>
          <p className="text-slate-400 text-sm mt-1">Connecting to official {tenantSlug} fleet portal</p>
        </div>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Portal Unavailable</h2>
          <p className="text-slate-300 text-sm mb-6">{error || 'Provider fleet not found'}</p>
          <Link
            to="/login"
            className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition"
          >
            Go to Management Login
          </Link>
        </div>
      </div>
    )
  }

  const company = config.company || {
    name: config.name,
    tagline: 'Ride the Himalayas with Zero Hassle',
    phone: '+977-1-4700000',
    email: 'info@ridersone.com',
    address: 'Thamel Marg, Kathmandu',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20 text-white">
              {company.name.charAt(0)}
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white block leading-tight">
                {company.name}
              </span>
              <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider block">
                Official Fleet Rental
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#fleet" className="hover:text-amber-400 transition">Our Fleet</a>
            <a href="#why-us" className="hover:text-amber-400 transition">Why Choose Us</a>
            <a href="#locations" className="hover:text-amber-400 transition">Stations</a>
            <a href="#reviews" className="hover:text-amber-400 transition">Rider Reviews</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={`tel:${company.phone}`}
              className="hidden lg:flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{company.phone}</span>
            </a>
            <Link
              to="/login"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            >
              Staff Portal
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Instant Online Confirmation • Verified Fleet 2025/2026
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              {company.heroTitle || 'Explore Nepal on Two & Four Wheels'}
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed font-normal">
              {company.heroSubtitle ||
                'Premium adventure motorcycles, touring bikes, SUVs, and city scooters. Transparent daily rates, comprehensive insurance, and zero hidden fees.'}
            </p>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left max-w-4xl mx-auto mb-12">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Full Insurance</div>
                  <div className="text-[11px] text-slate-400">Zero worries on trail</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Govt. Bluebook</div>
                  <div className="text-[11px] text-slate-400">100% Legal & Verified</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">24/7 Roadside Assist</div>
                  <div className="text-[11px] text-slate-400">Nationwide mechanic net</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Transparent Rates</div>
                  <div className="text-[11px] text-slate-400">No surprise surcharges</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Reservation Bar */}
          <div className="max-w-4xl mx-auto bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Pickup Station
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {(config.locations || []).map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Pickup Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={todayStr}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Return Date ({rentalDays} Days)
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Fleet Catalog Section */}
      <section id="fleet" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Available Fleet Catalog</h2>
            <p className="text-slate-400 text-sm mt-1">
              Select your machine for Kathmandu, Pokhara, Mustang, or Everest circuit
            </p>
          </div>

          {/* Category Tabs */}
          <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl self-start">
            {(['all', 'bike', 'scooter', 'car'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCategoryFilter(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  categoryFilter === tab
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All Machines' : `${tab}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition duration-300 flex flex-col group shadow-lg shadow-black/40"
            >
              {/* Image banner */}
              <div className="relative h-56 bg-slate-950 overflow-hidden">
                <img
                  src={vehicle.image_url}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  {vehicle.category}
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-500/90 text-slate-950 text-[11px] font-black uppercase tracking-wider">
                  Ready to Ride
                </div>
              </div>

              {/* Vehicle Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition">
                      {vehicle.make} {vehicle.model}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mb-4">
                    Plate: {vehicle.license_plate} • Model Year: {vehicle.year}
                  </div>

                  {/* Specs Pill List */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-6 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Transmission:</span>
                      <span className="font-medium text-slate-200 truncate">{vehicle.transmission}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Fuel:</span>
                      <span className="font-medium text-slate-200 truncate">{vehicle.fuel_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Seats:</span>
                      <span className="font-medium text-slate-200">{vehicle.seating_capacity} Persons</span>
                    </div>
                    {vehicle.engine_cc && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Displacement:</span>
                        <span className="font-medium text-slate-200">{vehicle.engine_cc}</span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  {vehicle.features && vehicle.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {vehicle.features.slice(0, 3).map((f, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60"
                        >
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price and CTA */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-black text-amber-400">
                      {currencySymbol} {vehicle.daily_rate.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-medium"> / day</span>
                  </div>

                  <button
                    onClick={() => handleOpenBooking(vehicle)}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-md shadow-amber-500/20"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Why Us / Benefits */}
      <section id="why-us" className="py-20 bg-slate-900 border-t border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white">Why Tour With {company.name}?</h2>
            <p className="text-slate-400 text-sm mt-2">
              Everything engineered for seamless, reliable road trips across high-altitude mountain terrain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xl mb-6">
                01
              </div>
              <h3 className="text-lg font-bold text-white mb-2">10-Point Pre-Rental Inspection</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Every vehicle undergoes tire tread, brake fluid, engine tuning, and electronic diagnostics before handover.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xl mb-6">
                02
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Flexible Multi-City Stations</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Pick up in Kathmandu (Thamel or Airport) and drop off in Pokhara Lakeside with ease.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl mb-6">
                03
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Official Contracts & Invoices</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Govt. registered enterprise with PAN compliance. Printable QR agreements and verified damage reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Stations / Locations */}
      <section id="locations" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl font-extrabold text-white">Our Station Network</h2>
          <p className="text-slate-400 text-sm mt-2">Convenient pickup and dropoff points across major hubs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(config.locations || []).map((loc) => (
            <div key={loc.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-2">
                  {loc.city} Station
                </span>
                <h4 className="text-lg font-bold text-white mb-2">{loc.name}</h4>
                <p className="text-slate-400 text-sm mb-4">{loc.address}</p>
              </div>
              <div className="pt-4 border-t border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{loc.phone}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center">
                {company.name.charAt(0)}
              </div>
              <span className="font-bold text-white text-base">{company.name}</span>
            </div>
            <div className="text-xs text-slate-400">
              {company.pan ? company.pan : 'PAN: 601234567'} • {company.address}
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>© {new Date().getFullYear()} {company.name}. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <Link to="/login" className="hover:text-slate-300">Staff Access</Link>
              <a href="#fleet" className="hover:text-slate-300">Browse Fleet</a>
              <a href={`mailto:${company.email}`} className="hover:text-slate-300">Email Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* 7. Interactive Instant Booking Modal */}
      {bookingModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <button
              onClick={() => setBookingModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
            >
              ✕
            </button>

            {bookingSuccessData ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Booking Reserved!</h3>
                <p className="text-slate-300 text-sm max-w-md mx-auto mb-6">
                  {bookingSuccessData.confirmation_message}
                </p>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 max-w-md mx-auto text-left mb-8 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reference:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {bookingSuccessData.booking?.booking_number || bookingSuccessData.booking?.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="font-semibold text-white">
                      {selectedVehicle.make} {selectedVehicle.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-semibold text-white">{rentalDays} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-semibold text-white">{customerFirstName} {customerLastName}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Total Estimated:</span>
                    <span className="font-bold text-amber-400">
                      {currencySymbol} {calculateTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Link
                    to={`/print/agreement?id=${bookingSuccessData.booking?.id}&autoprint=0`}
                    target="_blank"
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-600 transition"
                  >
                    View Agreement PDF
                  </Link>
                  <button
                    onClick={() => {
                      setBookingModalOpen(false)
                      setBookingSuccessData(null)
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Reservation Step
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    Book {selectedVehicle.make} {selectedVehicle.model}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Plate: {selectedVehicle.license_plate} • {selectedVehicle.category}
                  </p>
                </div>

                {/* Rental Summary Card */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block">Pickup:</span>
                    <span className="font-semibold text-white">{startDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Return:</span>
                    <span className="font-semibold text-white">{endDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duration:</span>
                    <span className="font-semibold text-amber-400">{rentalDays} Days</span>
                  </div>
                </div>

                {/* Add-ons & Insurance */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Add-ons & Protections
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={insuranceSelected}
                          onChange={(e) => setInsuranceSelected(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">Damage Waiver (CDW)</div>
                          <div className="text-[11px] text-slate-400">Zero deductible road cover</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400">
                        +{currencySymbol} 500/day
                      </span>
                    </label>

                    {config.addons?.map((addon) => (
                      <label
                        key={addon.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedAddons.includes(addon.id)}
                            onChange={() => handleToggleAddon(addon.id)}
                            className="rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                          />
                          <div>
                            <div className="text-xs font-bold text-white">{addon.name}</div>
                            <div className="text-[11px] text-slate-400">{addon.description}</div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-amber-400">
                          +{currencySymbol} {addon.price_per_day}/day
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Customer Details */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Rider Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="First Name *"
                      value={customerFirstName}
                      onChange={(e) => setCustomerFirstName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={customerLastName}
                      onChange={(e) => setCustomerLastName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email Address *"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="WhatsApp / Phone *"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Driving License Number"
                      value={customerLicense}
                      onChange={(e) => setCustomerLicense(e.target.value)}
                      className="sm:col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Total & Submit */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Total Price Estimate ({rentalDays}d)</div>
                    <div className="text-2xl font-black text-amber-400">
                      {currencySymbol} {calculateTotal.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBookingModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingBooking}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20"
                    >
                      {submittingBooking ? 'Submitting...' : 'Confirm Reservation'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

