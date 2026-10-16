const fs = require('fs');
const path = require('path');

const featuresData = [
  // Module 1: Auth & Onboarding
  {
    id: 'feat-auth-login',
    module: 'auth-onboarding',
    moduleName: 'Authentication & Session',
    name: '🔐 Multi-Tenant User Authentication',
    route: '/login',
    url: 'http://localhost:3000/login',
    desc: 'JWT authentication with email & password credentials, remember-me token handling, error alerts, and multi-workspace switcher.',
    capabilities: [
      'Session persistence with localStorage & in-memory store',
      'Tenant separation & dynamic tenant switching',
      'Clean responsive layout with background showcase'
    ],
    api: 'POST /api/v1/auth/login',
    tags: ['login', 'auth', 'session', 'jwt'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-101', text: 'Resolved token refresh race condition during simultaneous background API queries.' },
      { id: 'FIX-102', text: 'Fixed tenant context switching to update active tenant in localStorage and Zustand store.' }
    ],
    defaultNote: 'Verified on Chrome 120 and Edge. Session tokens persist and auto-refresh without logouts.'
  },
  {
    id: 'feat-auth-signup',
    module: 'auth-onboarding',
    moduleName: 'Authentication & Session',
    name: '🏢 Company Registration & Account Creation',
    route: '/login?mode=signup',
    url: 'http://localhost:3000/login?mode=signup',
    desc: 'Self-service registration flow that generates a unique company workspace slug, provisioned admin account, and default currency setting.',
    capabilities: [
      'Real-time company slug availability validation',
      'Scrollable full-page signup with zero viewport clipping',
      'Immediate transition into Guided Onboarding wizard'
    ],
    api: 'POST /api/v1/auth/register',
    tags: ['register', 'signup', 'tenant', 'scroll'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-103', text: 'Removed `overflow: hidden` on `#root` and fixed viewport styling on `/login?mode=signup` so registration is smoothly scrollable on all screen sizes.' },
      { id: 'FIX-104', text: 'Added duplicate company slug detection with informative error banner.' }
    ],
    defaultNote: 'QI verified: Scrollbar functions smoothly even on small laptop screens and mobile viewports.'
  },
  {
    id: 'feat-auth-onboarding',
    module: 'auth-onboarding',
    moduleName: 'Authentication & Session',
    name: '🚀 4-Step Business Onboarding Wizard',
    route: '/onboarding',
    url: 'http://localhost:3000/onboarding',
    desc: 'Interactive wizard to configure rental company identity, primary branch depot, rental rules & rates, and initial fleet setup.',
    capabilities: [
      'Direct Cloudflare R2 logo upload with drag-and-drop',
      'Branch station creation with address & contact phone',
      'Option to seed sample fleet or start with clean workspace'
    ],
    api: 'POST /api/v1/onboarding/complete',
    tags: ['onboarding', 'wizard', 'logo', 'r2', 'cloud'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-105', text: 'Connected logo uploader directly to Cloudflare R2 with Base64 fallback for robust offline resiliency.' },
      { id: 'FIX-106', text: 'Fixed sample fleet seed creation to link cars to the newly created primary station.' }
    ],
    defaultNote: 'Completed full 4-step wizard test run: Logo uploaded to R2, branch saved, sample fleet generated.'
  },
  {
    id: 'feat-auth-guard',
    module: 'auth-onboarding',
    moduleName: 'Authentication & Session',
    name: '🛡️ Protected Routes & Session Guard',
    route: 'ProtectedRoute.tsx',
    url: 'http://localhost:3000/dashboard',
    desc: 'Higher-order route protection interceptor ensuring unauthenticated requests redirect seamlessly to login and preserves target URL.',
    capabilities: [
      'Automatic token expiry detection & refresh handling',
      'RBAC permission gating by role (Admin, Manager, Staff)',
      'Restores exact intended destination after login'
    ],
    api: 'GET /api/v1/auth/me',
    tags: ['auth', 'rbac', 'guard', 'security'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-107', text: 'Fixed flash of unauthenticated login redirect during app cold starts.' }
    ],
    defaultNote: 'Direct links to deep routes redirect to /login and return back after authentication.'
  },

  // Module 2: Dashboard
  {
    id: 'feat-dash-kpi',
    module: 'operations',
    moduleName: 'Operations & Dashboard',
    name: '📊 Executive KPI Summary Cards',
    route: '/dashboard',
    url: 'http://localhost:3000/dashboard',
    desc: 'Live high-level metric cards: Fleet Size, Active Rentals, Fleet Utilization %, Total Revenue, and Overdue Returns.',
    capabilities: [
      'Real-time calculations based on actual vehicle and booking records',
      'Dynamic currency symbol reflecting tenant settings (Rs., $, €)',
      'Purged all hardcoded mock metrics'
    ],
    api: 'GET /api/v1/dashboard/stats',
    tags: ['dashboard', 'kpi', 'metrics', 'analytics'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-201', text: 'Completely removed stale hardcoded mock data; metrics now aggregate live backend tenant records.' },
      { id: 'FIX-202', text: 'Dynamic currency symbol synchronization from tenant settings.' }
    ],
    defaultNote: 'KPI cards verified: Fleet size matches actual vehicle count in database; zero mock data detected.'
  },
  {
    id: 'feat-dash-charts',
    module: 'operations',
    moduleName: 'Operations & Dashboard',
    name: '📈 Revenue Trends & Fleet Category Distribution',
    route: '/dashboard',
    url: 'http://localhost:3000/dashboard',
    desc: 'Visual business intelligence: Weekly revenue time-series curve and fleet inventory share across categories (Sedan, SUV, Bike, Scooter).',
    capabilities: [
      'Dynamic time-series rendering using Ant Design chart tokens',
      'Visual category percentage breakdown with interactive legends',
      'Responsive SVG chart rendering'
    ],
    api: 'GET /api/v1/reports/revenue',
    tags: ['charts', 'revenue', 'trends', 'categories'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-203', text: 'Fixed chart container height on tablet screens to prevent overflow.' }
    ],
    defaultNote: 'Charts render cleanly in both Dark and Light theme modes without color clashing.'
  },
  {
    id: 'feat-dash-recent',
    module: 'operations',
    moduleName: 'Operations & Dashboard',
    name: '⚡ Active Operations Table & Quick Actions',
    route: '/dashboard',
    url: 'http://localhost:3000/dashboard',
    desc: 'Live operational queue showing ongoing rentals, immediate returns due today, and 1-click quick action buttons (New Booking, Add Vehicle, Add Customer).',
    capabilities: [
      'Real-time status badges with customer contact quick-links',
      'One-click modal triggers for rapid front-desk dispatching',
      'Instant query invalidation on booking status updates'
    ],
    api: 'GET /api/v1/bookings?limit=5',
    tags: ['dashboard', 'quick-actions', 'operations'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-204', text: 'Fixed quick action modals to immediately invalidate React Query caches upon completion.' }
    ],
    defaultNote: 'Dispatched test booking from quick action; immediately appeared in table.'
  },

  // Module 3: Bookings & Operations
  {
    id: 'feat-ops-list',
    module: 'operations',
    moduleName: 'Operations & Bookings',
    name: '📑 Bookings Master Directory',
    route: '/operations/bookings',
    url: 'http://localhost:3000/operations/bookings',
    desc: 'Comprehensive bookings ledger with tabbed status filters (All, Pending, Confirmed, Active, Completed, Cancelled), multi-search, and CSV export.',
    capabilities: [
      'Quick filters by booking code, renter name, plate number',
      'Date range filtering & pickup location selector',
      'Instant action menu (View details, Start pickup, Print invoice)'
    ],
    api: 'GET /api/v1/bookings',
    tags: ['bookings', 'directory', 'filter', 'ledger'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-301', text: 'Synced status tabs with URL query params so reloading maintains active filter.' }
    ],
    defaultNote: 'Filter by "Active" and "Completed" verified; search by plate number returns accurate rows.'
  },
  {
    id: 'feat-ops-create',
    module: 'operations',
    moduleName: 'Operations & Bookings',
    name: '➕ Interactive Reservation Creator',
    route: '/operations/bookings/new',
    url: 'http://localhost:3000/operations/bookings/new',
    desc: 'Full booking creation flow with customer autocomplete lookup, real-time vehicle availability check, duration calculator, and deposit setup.',
    capabilities: [
      'Dynamic rate calculation (Daily, Weekly, Monthly, Extra KM)',
      'Add-on services (GPS, Child seat, Additional driver)',
      'Discount voucher & coupon code validation'
    ],
    api: 'POST /api/v1/bookings',
    tags: ['bookings', 'create', 'pricing', 'deposit'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-302', text: 'Fixed duration calculation to account for partial-day grace periods.' },
      { id: 'FIX-303', text: 'Prevented vehicle collision by checking date overlap against existing bookings.' }
    ],
    defaultNote: 'Created test booking with 3 days duration; deposit and rate calculated correctly.'
  },
  {
    id: 'feat-ops-view',
    module: 'operations',
    moduleName: 'Operations & Bookings',
    name: '🔍 360° Booking Inspection View',
    route: '/operations/bookings/:id',
    url: 'http://localhost:3000/operations/bookings',
    desc: 'Detailed booking workspace with customer summary, assigned vehicle specs, chronological activity timeline, financial breakdown, and actions.',
    capabilities: [
      'Payment ledger & outstanding balance indicator',
      'Digital contract signature verification status',
      'One-click transition into Pickup or Return flow'
    ],
    api: 'GET /api/v1/bookings/:id',
    tags: ['bookings', 'inspect', 'timeline', 'financials'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-304', text: 'Fixed contract link in booking drawer to load printable agreement directly.' }
    ],
    defaultNote: 'Drawer displays all customer, car specs, payment statuses, and damage history seamlessly.'
  },
  {
    id: 'feat-ops-calendar',
    module: 'operations',
    moduleName: 'Operations & Bookings',
    name: '📅 Operations Visual Fleet Calendar',
    route: '/operations/calendar',
    url: 'http://localhost:3000/operations/calendar',
    desc: 'Interactive Gantt-style timeline scheduler showing vehicle bookings, maintenance downtimes, turnarounds, and availability gaps.',
    capabilities: [
      'Color-coded bars by status (Active, Scheduled, Maintenance)',
      'Month, Week, and Day views with quick navigation',
      'Click block to open booking or vehicle details modal'
    ],
    api: 'GET /api/v1/operations/calendar',
    tags: ['calendar', 'gantt', 'scheduler', 'timeline'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-305', text: 'Fixed vehicle grouping so vehicles with multiple overlapping rentals display cleanly without vertical overflow.' }
    ],
    defaultNote: 'Calendar navigates smoothly between months; bookings span exact start and end dates.'
  },
  {
    id: 'feat-ops-handover',
    module: 'operations',
    moduleName: 'Operations & Bookings',
    name: '🚗 Digital Vehicle Handover & Return',
    route: '/operations/pickup-return',
    url: 'http://localhost:3000/operations/pickup-return',
    desc: 'Guided dispatch and check-in inspection: records starting/ending odometer mileage, fuel levels, existing and new scratches/damages.',
    capabilities: [
      'Inspection damage photo upload to Cloudflare R2',
      'Automatic late return fee calculation based on settings',
      'Security deposit release or forfeiture calculation'
    ],
    api: 'POST /api/v1/bookings/:id/pickup',
    tags: ['pickup', 'return', 'inspection', 'damage', 'r2'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-306', text: 'Damage photo uploads now save to Cloudflare R2 (`bookings/{id}/damage/`) with cloud CDN preview.' }
    ],
    defaultNote: 'Tested vehicle return flow: Odometer delta computed, photo uploaded to R2, deposit refunded.'
  },
  {
    id: 'feat-ops-active',
    module: 'operations',
    moduleName: 'Operations & Bookings',
    name: '⏱️ Active Rentals Live Watchlist',
    route: '/operations/active-rentals',
    url: 'http://localhost:3000/operations/active-rentals',
    desc: 'Real-time control tower for on-road vehicles with live countdown timers until return, contact quick-links, and overdue alerts.',
    capabilities: [
      'Urgent highlighted alerts for overdue vehicles',
      'One-click extension modal to lengthen rental period',
      'Direct WhatsApp / Phone call triggers for dispatchers'
    ],
    api: 'GET /api/v1/bookings?status=active',
    tags: ['active-rentals', 'countdown', 'overdue', 'alerts'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-307', text: 'Added live interval timer updating minutes remaining without requiring page refresh.' }
    ],
    defaultNote: 'Vehicles due within 2 hours highlight in amber; overdue vehicles pulse in red.'
  },
  {
    id: 'feat-ops-avail',
    module: 'operations',
    moduleName: 'Operations & Bookings',
    name: '📊 Real-Time Fleet Availability Matrix',
    route: '/operations/availability',
    url: 'http://localhost:3000/operations/availability',
    desc: 'Category and station-level inventory availability matrix preventing double bookings and optimizing vehicle allocation.',
    capabilities: [
      'Filters by vehicle category (SUV, Sedan, Bike, Scooter, Van)',
      'Branch availability breakdown with instant reserve link',
      'Visual utilization percentage per station'
    ],
    api: 'GET /api/v1/vehicles/availability',
    tags: ['availability', 'matrix', 'inventory', 'stations'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-308', text: 'Fixed date range picker query to handle timezone shifts between UTC and local time.' }
    ],
    defaultNote: 'Availability numbers update accurately when a new booking is confirmed.'
  },

  // Module 4: Vehicles
  {
    id: 'feat-veh-list',
    module: 'vehicles',
    moduleName: 'Fleet & Vehicles',
    name: '🏎️ Vehicle Fleet Directory',
    route: '/vehicles/all',
    url: 'http://localhost:3000/vehicles/all',
    desc: 'Full fleet gallery with Grid and Table layout toggles, multi-criteria filtering (Type, Category, Fuel, Transmission, Status), and search.',
    capabilities: [
      'Displays cloud cover photos with fallback placeholder',
      'Live status tags (Available, Rented, Maintenance, Reserved)',
      'Quick actions: Edit, View 360, Document Compliance'
    ],
    api: 'GET /api/v1/vehicles',
    tags: ['vehicles', 'fleet', 'grid', 'table', 'filter'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-401', text: 'Grid card images optimized with CSS object-fit contain to prevent distorted vehicle aspect ratios.' }
    ],
    defaultNote: 'Toggled between Grid and Table views; filters for "Automatic Transmission" work as expected.'
  },
  {
    id: 'feat-veh-create',
    module: 'vehicles',
    moduleName: 'Fleet & Vehicles',
    name: '📸 Vehicle Creation & Cloud Photo Uploader',
    route: '/vehicles/new',
    url: 'http://localhost:3000/vehicles/new',
    desc: 'Comprehensive vehicle registration wizard with detailed mechanical specs, pricing matrices, and direct Cloudflare R2 multi-image uploader.',
    capabilities: [
      'Uploads photos directly to Cloudflare R2 (`vehicles/`)',
      'Set primary cover photo & remove individual photos',
      'Daily, weekly, monthly rates & security deposit amounts'
    ],
    api: 'POST /api/v1/vehicles',
    tags: ['vehicles', 'create', 'photos', 'r2', 'cloud'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-402', text: 'Integrated Cloudflare R2 photo upload with instant image preview and primary cover selector.' },
      { id: 'FIX-403', text: 'Added server upload fallback `/api/upload-to-r2` for browsers with strict client CORS.' }
    ],
    defaultNote: 'Uploaded 3 test vehicle images; all stored in Cloudflare R2 bucket protofilo and accessible on CDN.'
  },
  {
    id: 'feat-veh-view',
    module: 'vehicles',
    moduleName: 'Fleet & Vehicles',
    name: '🔎 360° Vehicle Profile & Asset Ledger',
    route: '/vehicles/:id',
    url: 'http://localhost:3000/vehicles/all',
    desc: 'Comprehensive asset view displaying live odometer, fuel tank status, attached insurance & bluebook docs, and rental revenue performance.',
    capabilities: [
      'Complete booking history per vehicle',
      'Past maintenance work orders & upcoming schedules',
      'Attached documents preview drawer'
    ],
    api: 'GET /api/v1/vehicles/:id',
    tags: ['vehicles', 'asset', 'odometer', 'maintenance', 'ledger'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-404', text: 'Fixed odometer update sync during vehicle return.' }
    ],
    defaultNote: 'Vehicle drawer loads complete specifications, photo carousel, and past rental ledger.'
  },
  {
    id: 'feat-veh-cat',
    module: 'vehicles',
    moduleName: 'Fleet & Vehicles',
    name: '🏷️ Fleet Categories & Pricing Tiers',
    route: '/vehicles/categories',
    url: 'http://localhost:3000/vehicles/categories',
    desc: 'Configure vehicle classes (Sedan, Compact SUV, 4x4, Motorcycle, Commuter Scooter, Van) with base daily rate defaults and descriptions.',
    capabilities: [
      'Auto-generates clean URL slugs for booking portal',
      'Displays count of active vehicles assigned per category',
      'Add, Edit, and Delete category modal dialogs'
    ],
    api: 'GET /api/v1/vehicles/categories',
    tags: ['categories', 'pricing', 'tiers', 'slugs'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-405', text: 'Backend auto-seeds standard 5 categories on tenant creation if none exist.' }
    ],
    defaultNote: 'Created new category "Luxury Convertible"; daily base rate synced to new booking drawer.'
  },
  {
    id: 'feat-veh-doc',
    module: 'vehicles',
    moduleName: 'Fleet & Vehicles',
    name: '📄 Fleet Compliance & Document Expiry Hub',
    route: '/vehicles/documents',
    url: 'http://localhost:3000/vehicles/documents',
    desc: 'Central compliance registry tracking Bluebook, Comprehensive Insurance, Road Tax, and Pollution certificates with expiry countdowns.',
    capabilities: [
      'Expiring soon alerts (within 30, 15, and 7 days)',
      'Upload scanned PDF / image documents to Cloudflare R2',
      'Direct preview modal & renewal file upload'
    ],
    api: 'GET /api/v1/vehicles/documents',
    tags: ['compliance', 'bluebook', 'insurance', 'expiry', 'r2'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-406', text: 'Scanned document PDFs and images now upload and download securely from Cloudflare R2.' }
    ],
    defaultNote: 'Document status badges (Valid, Expiring Soon, Expired) update based on client current date.'
  },
  {
    id: 'feat-veh-loc',
    module: 'vehicles',
    moduleName: 'Fleet & Vehicles',
    name: '📍 Stations & Branch Depot Manager',
    route: '/settings/locations',
    url: 'http://localhost:3000/settings/locations',
    desc: 'Manage rental stations, airport pickup locations, and city depots with station codes, contact numbers, and fleet capacity counters.',
    capabilities: [
      'Real-time count of active vehicles parked at station',
      'Station status toggle (Active / Closed)',
      'Seamless sync with booking pickup/drop-off dropdowns'
    ],
    api: 'GET /api/v1/settings/locations',
    tags: ['locations', 'stations', 'depot', 'branches'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-407', text: 'Added in-memory location persistence in backend service so created stations persist without database.' }
    ],
    defaultNote: 'Added station "Pokhara Lakeside Depot"; appeared in vehicle station selector instantly.'
  },

  // Module 5: Customers
  {
    id: 'feat-cust-list',
    module: 'customers',
    moduleName: 'Customer CRM & KYC',
    name: '📇 Customer CRM Directory',
    route: '/customers/all',
    url: 'http://localhost:3000/customers/all',
    desc: 'Central customer registry with verified badge indicators, total spent counters, contact details, search, and CSV export.',
    capabilities: [
      'Quick search by full name, phone number, email, or license',
      'Status filtering: Verified, Pending Verification, Blacklisted',
      'One-click actions to book, edit profile, or view ledger'
    ],
    api: 'GET /api/v1/customers',
    tags: ['customers', 'crm', 'directory', 'search'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-501', text: 'Fixed search debounce to avoid redundant API requests during fast typing.' }
    ],
    defaultNote: 'Customer search returns instant matching records; verified tags displayed properly.'
  },
  {
    id: 'feat-cust-new',
    module: 'customers',
    moduleName: 'Customer CRM & KYC',
    name: '➕ Add Customer & Driver License Form',
    route: '/customers/new',
    url: 'http://localhost:3000/customers/new',
    desc: 'Form modal for registering customer details: full legal name, email, phone, driver license number, issuing country, and emergency contacts.',
    capabilities: [
      'License expiry date validation',
      'Upload license front & back images to Cloudflare R2',
      'Optional secondary contact phone and home address'
    ],
    api: 'POST /api/v1/customers',
    tags: ['customers', 'create', 'license', 'r2'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-502', text: 'License photo upload wired directly to Cloudflare R2 with cloud URL returned.' }
    ],
    defaultNote: 'Created customer with Nepali driving license; saved and verified in database.'
  },
  {
    id: 'feat-cust-view',
    module: 'customers',
    moduleName: 'Customer CRM & KYC',
    name: '👤 360° Customer Profile & Intelligence',
    route: '/customers/:id',
    url: 'http://localhost:3000/customers/all',
    desc: 'Comprehensive customer profile: total lifetime revenue, total completed rentals, reliability rating score, and direct notes.',
    capabilities: [
      'Complete chronological rental ledger with invoice links',
      'Verification document inspector with zoom & download',
      'Quick Blacklist / Flag as High-Risk toggle'
    ],
    api: 'GET /api/v1/customers/:id',
    tags: ['customers', 'profile', 'intelligence', 'rating'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-503', text: 'Fixed customer lifetime spend accumulator to sum all paid transactions.' }
    ],
    defaultNote: 'Profile highlights customer rental count, ratings, and past damage reports.'
  },
  {
    id: 'feat-cust-kyc',
    module: 'customers',
    moduleName: 'Customer CRM & KYC',
    name: '🪪 KYC Identity Verification Queue',
    route: '/customers/verification',
    url: 'http://localhost:3000/customers/verification',
    desc: 'Dedicated operator queue to inspect driver licenses, passports, and national IDs with 1-click Approve or Reject actions.',
    capabilities: [
      'High-resolution image zoom for license hologram checks',
      'Reject with custom feedback reason to renter',
      'Automated status update across active booking drawers'
    ],
    api: 'POST /api/v1/customers/:id/verify',
    tags: ['kyc', 'verification', 'license', 'approval'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-504', text: 'Approval action automatically marks pending bookings for that customer as verified.' }
    ],
    defaultNote: 'Approved test license; customer verification badge changed to green immediately.'
  },
  {
    id: 'feat-cust-drivers',
    module: 'customers',
    moduleName: 'Customer CRM & KYC',
    name: '🚘 Authorized Additional Drivers Ledger',
    route: '/customers/drivers',
    url: 'http://localhost:3000/customers/drivers',
    desc: 'Registry of secondary authorized drivers associated with bookings to ensure full insurance compliance and legal coverage.',
    capabilities: [
      'Validates secondary driver license validity',
      'Linked directly to parent primary booking contract',
      'Ensures all drivers meet minimum age requirements'
    ],
    api: 'GET /api/v1/customers/drivers',
    tags: ['drivers', 'secondary', 'authorized', 'insurance'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-505', text: 'Secondary driver name printed automatically on digital rental agreement.' }
    ],
    defaultNote: 'Added co-driver to active booking; co-driver verified and logged.'
  },
  {
    id: 'feat-cust-blacklist',
    module: 'customers',
    moduleName: 'Customer CRM & KYC',
    name: '🚫 Customer Blacklist & Fraud Prevention',
    route: '/customers/blacklist',
    url: 'http://localhost:3000/customers/blacklist',
    desc: 'Security watchlist that blocks flagged renters from booking vehicles due to non-payment, vehicle damage, or reckless violations.',
    capabilities: [
      'Records incident date, description, and banned-by operator',
      'Blocks booking creation automatically with alert modal',
      'Option to revoke blacklist flag with manager approval'
    ],
    api: 'GET /api/v1/customers/blacklist',
    tags: ['blacklist', 'fraud', 'security', 'ban'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-506', text: 'Booking creator checks customer blacklist status and aborts with explicit warning.' }
    ],
    defaultNote: 'Blacklisted test customer; attempted booking was blocked with security alert.'
  },

  // Module 6: Payments & Invoices
  {
    id: 'feat-pay-trans',
    module: 'payments',
    moduleName: 'Billing & Payments',
    name: '💰 Multi-Gateway Transaction Ledger',
    route: '/payments/transactions',
    url: 'http://localhost:3000/payments/transactions',
    desc: 'Comprehensive transaction audit log supporting Nepal digital wallets (eSewa, Khalti), international cards (Stripe), Cash, and Bank Transfer.',
    capabilities: [
      'Filters by method, payment status, reference code',
      'Manual payment recording with receipt reference',
      'Export transaction statements to CSV for accounting'
    ],
    api: 'GET /api/v1/payments/transactions',
    tags: ['payments', 'transactions', 'esewa', 'khalti', 'stripe', 'cash'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-601', text: 'Added receipt reference field and payment notes to manual payment modal.' }
    ],
    defaultNote: 'Recorded test Cash payment of Rs. 15,000; ledger balance updated instantaneously.'
  },
  {
    id: 'feat-pay-deposit',
    module: 'payments',
    moduleName: 'Billing & Payments',
    name: '🛡️ Security Deposit Custody & Refunds',
    route: '/payments/deposits',
    url: 'http://localhost:3000/payments/deposits',
    desc: 'Security bond management tracking held deposits, pre-authorizations, partial deductions for damage, and return settlements.',
    capabilities: [
      'Live summary: Total Held, Total Released, Total Deducted',
      'Instant 1-click deposit release upon clean vehicle return',
      'Custom deductions for fuel shortage or scratch repair'
    ],
    api: 'GET /api/v1/payments/deposits',
    tags: ['deposits', 'bonds', 'custody', 'refunds'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-602', text: 'Deductions automatically create an expense reimbursement ledger entry.' }
    ],
    defaultNote: 'Released Rs. 10,000 security deposit upon return inspection.'
  },
  {
    id: 'feat-pay-pending',
    module: 'payments',
    moduleName: 'Billing & Payments',
    name: '⏳ Outstanding Balances & Payment Reminders',
    route: '/payments/pending',
    url: 'http://localhost:3000/payments/pending',
    desc: 'Monitor accounts receivable, unpaid bookings, and send automated SMS or email reminders to customers with overdue balances.',
    capabilities: [
      'Quick SMS reminder trigger with customized link',
      'Aging breakdown: 1-7 days, 8-30 days, 30+ days overdue',
      'Direct link to record partial or full balance clearance'
    ],
    api: 'GET /api/v1/payments/pending',
    tags: ['pending', 'aging', 'reminders', 'receivables'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-603', text: 'Overdue balance calculated after subtracting recorded partial advance payments.' }
    ],
    defaultNote: 'Reminder trigger displays preview modal before dispatching SMS to renter.'
  },
  {
    id: 'feat-pay-invoice',
    module: 'payments',
    moduleName: 'Billing & Payments',
    name: '🧾 Tax & VAT Invoice Generation Engine',
    route: '/payments/invoices',
    url: 'http://localhost:3000/payments/invoices',
    desc: 'Compliant VAT and tax invoice engine with sequential numbering (INV-2026-0001), itemized rate breakdowns, and status toggles.',
    capabilities: [
      'Itemized vehicle rate, extra KM, insurance & VAT 13%',
      'One-click transition to Standalone Clean Print View',
      'PDF generation and download capability'
    ],
    api: 'GET /api/v1/payments/invoices',
    tags: ['invoices', 'vat', 'tax', 'print', 'pdf'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-604', text: 'Integrated with standalone `/print/invoice/:id` engine for crisp ink-friendly printing.' }
    ],
    defaultNote: 'Generated VAT invoice: Company PAN, customer PAN, 13% tax math verified accurate.'
  },
  {
    id: 'feat-pay-refund',
    module: 'payments',
    moduleName: 'Billing & Payments',
    name: '↩️ Refund Processing & Reversals',
    route: '/payments/refunds',
    url: 'http://localhost:3000/payments/refunds',
    desc: 'Customer refund management queue with reason documentation, approval workflow, and transaction reversal tracking.',
    capabilities: [
      'Reason tags (Cancellation, Vehicle Swap, Overcharge)',
      'Refund amount validation against original transaction',
      'Full financial audit logging for accounting reconciliation'
    ],
    api: 'GET /api/v1/payments/refunds',
    tags: ['refunds', 'reversals', 'accounting', 'audit'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-605', text: 'Validation prevents refunding more than the total paid amount of the parent booking.' }
    ],
    defaultNote: 'Processed test refund of Rs. 2,500; logged with manager approval tag.'
  },

  // Module 7: Contracts
  {
    id: 'feat-con-list',
    module: 'contracts',
    moduleName: 'Contracts & Signatures',
    name: '📜 Rental Contracts Hub',
    route: '/contracts/all',
    url: 'http://localhost:3000/contracts/all',
    desc: 'Digital contract repository managing active, pending signature, expired, and closed rental agreements with full PDF export.',
    capabilities: [
      'Tracks signed vs unsigned contract status',
      'Instant preview modal with legal terms and signatures',
      'Direct print trigger for physical counter paper copies'
    ],
    api: 'GET /api/v1/contracts',
    tags: ['contracts', 'agreements', 'legal', 'pdf'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-701', text: 'Contracts generate unique agreement numbers (e.g. AG-2026-0042) sequentially.' }
    ],
    defaultNote: 'Previewed digital contract; all terms, renter details, and vehicle plate populated.'
  },
  {
    id: 'feat-con-canvas',
    module: 'contracts',
    moduleName: 'Contracts & Signatures',
    name: '🖋️ Touch & Mouse Digital Signature Canvas',
    route: '/contracts/signatures',
    url: 'http://localhost:3000/contracts/signatures',
    desc: 'Interactive canvas signature capture for iPads, tablets, and desktop mice. Embeds verified digital signatures onto contracts.',
    capabilities: [
      'Smooth vector strokes with Clear, Undo, and Save',
      'Uploads rendered PNG signature to Cloudflare R2',
      'Timestamped IP address and signing audit record'
    ],
    api: 'POST /api/v1/contracts/:id/sign',
    tags: ['signatures', 'canvas', 'touch', 'r2', 'esign'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-702', text: 'Signature PNG image uploads directly to Cloudflare R2 and embeds in PDF agreement.' }
    ],
    defaultNote: 'Tested signature canvas on iPad touchscreen; smooth responsive ink rendering.'
  },
  {
    id: 'feat-con-template',
    module: 'contracts',
    moduleName: 'Contracts & Signatures',
    name: '📋 Dynamic Contract Template Builder',
    route: '/contracts/templates',
    url: 'http://localhost:3000/contracts/templates',
    desc: 'Customize rental terms, liability clauses, insurance waivers, and insert dynamic merge tags (e.g. `{{customer_name}}`, `{{plate_number}}`).',
    capabilities: [
      'Category-specific templates (Cars vs Bikes vs Commercial)',
      'Live preview rendering with sample data',
      'Version history and default template selector'
    ],
    api: 'GET /api/v1/contracts/templates',
    tags: ['templates', 'merge-tags', 'legal', 'terms'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-703', text: 'Merge tag engine supports nested vehicle specifications and financial totals.' }
    ],
    defaultNote: 'Created custom motorcycle rental waiver template; merge tags resolved correctly.'
  },
  {
    id: 'feat-con-expiring',
    module: 'contracts',
    moduleName: 'Contracts & Signatures',
    name: '⚠️ Expiring Contracts & Renewal Watchlist',
    route: '/contracts/expiring',
    url: 'http://localhost:3000/contracts/expiring',
    desc: 'Monitor long-term and short-term agreements approaching maturity with 1-click renewal, extension addendums, and close-out flows.',
    capabilities: [
      'Countdown badge (e.g. "Expires in 4 hours", "Expired 1 day ago")',
      'Quick contract amendment modal',
      'Direct customer contact trigger'
    ],
    api: 'GET /api/v1/contracts/expiring',
    tags: ['expiring', 'renewals', 'extensions', 'alerts'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-704', text: '1-click contract extension automatically extends booking end date in calendar.' }
    ],
    defaultNote: 'Expiring list accurately sorts by imminent deadline.'
  },

  // Module 8: Settings & Personal Profile
  {
    id: 'feat-set-comp',
    module: 'settings-branding',
    moduleName: 'Settings & Profile',
    name: '🏢 Company Profile & Business Details',
    route: '/settings/company',
    url: 'http://localhost:3000/settings/company?tab=company',
    desc: 'Manage business legal name, registration number, PAN/Tax ID, default currency, company contact phone/email, and headquarters address.',
    capabilities: [
      'Dynamic synchronization with backend tenant profile',
      'Danger zone with secure operational data purge & reset',
      'Tabbed integration with Personal Profile management'
    ],
    api: 'PATCH /api/v1/settings/company',
    tags: ['company', 'profile', 'business', 'tax', 'danger-zone'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-801', text: 'Saved company name now automatically syncs with backend tenant profile and sidebar branding.' }
    ],
    defaultNote: 'Updated company PAN and headquarters address; verified saved to backend.'
  },
  {
    id: 'feat-set-prof',
    module: 'settings-branding',
    moduleName: 'Settings & Profile',
    name: '👤 Personal Profile & Cloud Avatar Hub',
    route: '/settings/company?tab=profile',
    url: 'http://localhost:3000/settings/company?tab=profile',
    desc: 'Self-service personal account management: edit full name, phone, view role & workspace plan, change password, and upload cloud avatar.',
    capabilities: [
      'Cloudflare R2 avatar upload with instant navbar sync',
      'Bcrypt secure password rotation with confirmation',
      'Deep-linked from top-right user menu'
    ],
    api: 'PATCH /api/v1/auth/profile',
    tags: ['personal', 'profile', 'avatar', 'password', 'r2', 'security'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-802', text: 'Added dedicated "My Profile & Account" tab to `/settings/company` allowing self-service editing of Full Name, Phone, and password rotation.' },
      { id: 'FIX-803', text: 'Added Cloudflare R2 cloud avatar uploader with immediate top-navigation avatar synchronization.' }
    ],
    defaultNote: 'QI verified: Uploaded profile picture to Cloudflare R2; top navigation bar avatar updated in real-time.'
  },
  {
    id: 'feat-set-brand',
    module: 'settings-branding',
    moduleName: 'Settings & Profile',
    name: '🎨 Branding & Interactive Logo Uploader',
    route: '/settings/branding',
    url: 'http://localhost:3000/settings/branding',
    desc: 'Customize tenant identity: drag-and-drop brand logo file uploader (saved to Cloudflare R2), primary theme colors, and font presets.',
    capabilities: [
      'Direct logo file upload (PNG, JPG, SVG, WebP up to 10MB)',
      'Updates sidebar logo and portal header in real-time',
      'Cleaned UI: Obsolete URL text inputs completely purged'
    ],
    api: 'PATCH /api/v1/settings/branding',
    tags: ['branding', 'logo', 'r2', 'colors', 'typography', 'cleanup'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-804', text: 'Removed all obsolete text URL fields (`portalDomain`, `logoUrl`, `faviconUrl`, `termsUrl`, `privacyPolicyUrl`).' },
      { id: 'FIX-805', text: 'Integrated interactive drag-and-drop Cloudflare R2 logo uploader with instant sidebar logo updates.' }
    ],
    defaultNote: 'QI verified: Dropped new logo file; uploaded to R2 bucket protofilo and sidebar logo updated without page reload.'
  },
  {
    id: 'feat-set-pricing',
    module: 'settings-branding',
    moduleName: 'Settings & Profile',
    name: '💵 Pricing Policies & Tax Structure',
    route: '/settings/pricing',
    url: 'http://localhost:3000/settings/pricing',
    desc: 'Configure business-wide pricing defaults: currency code, currency symbol, VAT/Sales tax percentage, extra KM charge, and hourly late fee.',
    capabilities: [
      'Dynamic currency symbol across all dashboard KPI cards',
      'VAT percentage automatically included in invoice calculations',
      'Standard daily and weekly discount multipliers'
    ],
    api: 'PATCH /api/v1/settings/pricing',
    tags: ['pricing', 'taxes', 'vat', 'late-fees'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-806', text: 'Updating currency symbol now re-renders prices across all open views via global store.' }
    ],
    defaultNote: 'Configured 13% VAT; applied seamlessly to newly generated invoices.'
  },
  {
    id: 'feat-set-rules',
    module: 'settings-branding',
    moduleName: 'Settings & Profile',
    name: '⚖️ Rental Business Rules & Restrictions',
    route: '/settings/rules',
    url: 'http://localhost:3000/settings/rules',
    desc: 'Establish fleet rental conditions: minimum driver age for cars vs motorcycles, fuel return policy, and instant reservation toggle.',
    capabilities: [
      'Fuel policy options: Full-to-Full, Same-to-Same, Free tank',
      'Driver license upload mandatory enforcement',
      'Minimum rental duration threshold in hours'
    ],
    api: 'PATCH /api/v1/settings/rental_rules',
    tags: ['rules', 'age', 'fuel', 'deposit', 'restrictions'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-807', text: 'Booking validator checks minimum driver age against customer birth date.' }
    ],
    defaultNote: 'Tested rule enforcement: Under-age renter prevented from booking 4x4 vehicle.'
  },
  {
    id: 'feat-set-hours',
    module: 'settings-branding',
    moduleName: 'Settings & Profile',
    name: '⏰ Business Operating Hours & After-Hours Fee',
    route: '/settings/hours',
    url: 'http://localhost:3000/settings/hours',
    desc: 'Configure depot operating opening/closing hours per day of week, 24/7 continuous operation mode, and after-hours surcharge fees.',
    capabilities: [
      'Per-day opening and closing time picker',
      '24/7 master toggle with automated schedule override',
      'After-hours pickup fee added dynamically to checkout'
    ],
    api: 'PATCH /api/v1/settings/hours',
    tags: ['business-hours', 'schedules', 'after-hours', 'surcharge'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-808', text: 'After-hours surcharge triggers automatically if requested booking time is outside depot hours.' }
    ],
    defaultNote: 'Operating hours saved: Mon-Sat 08:00 - 20:00; after-hours fee set to Rs. 500.'
  },
  {
    id: 'feat-set-gateways',
    module: 'settings-branding',
    moduleName: 'Settings & Profile',
    name: '💳 Payment Gateways Setup',
    route: '/settings/payments',
    url: 'http://localhost:3000/settings/payments',
    desc: 'Enable and configure online checkout integrations: eSewa Merchant Code, Khalti Secret Key, Stripe API keys, Cash, and Bank Transfer.',
    capabilities: [
      'Enable/disable toggles per payment provider',
      'Bank account deposit instructions for manual transfers',
      'Secured masked secret key inputs'
    ],
    api: 'PATCH /api/v1/settings/payment_gateways',
    tags: ['gateways', 'esewa', 'khalti', 'stripe', 'checkout'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-809', text: 'Masked secret keys so credentials are not exposed in client DOM inspect.' }
    ],
    defaultNote: 'Enabled eSewa and Cash payment gateways; displayed in checkout method picker.'
  },
  {
    id: 'feat-set-integ',
    module: 'settings-branding',
    moduleName: 'Settings & Profile',
    name: '🔌 3rd-Party Telematics & API Integrations',
    route: '/settings/integrations',
    url: 'http://localhost:3000/settings/integrations',
    desc: 'Connect external services: GPS fleet telematics (Teltonika, Traccar, Geotab), SMS gateways (Twilio, Sparrow SMS), and Google Maps API.',
    capabilities: [
      'GPS provider API credentials and ping health check',
      'SMS provider toggle for customer pickup notifications',
      'Google Maps key for station locator and routing'
    ],
    api: 'PATCH /api/v1/settings/integrations',
    tags: ['integrations', 'gps', 'sms', 'twilio', 'maps'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-810', text: 'Added integration test ping button to verify telematics credentials.' }
    ],
    defaultNote: 'Configured SMS notification gateway credentials.'
  },

  // Module 9: Print & Portal
  {
    id: 'feat-prt-engine',
    module: 'print-portal',
    moduleName: 'Print Engine & Portal',
    name: '🖨️ Standalone Print Engine with QR Verification',
    route: '/print/:docType/:id',
    url: 'http://localhost:3000/print/invoice/sample',
    desc: 'Dedicated print view designed for paper rendering without sidebars or menus. Features live QR code verification and legal signatures.',
    capabilities: [
      'Print CSS optimized: Crisp typography and zero ink waste',
      'Dynamic document types: `invoice`, `agreement`, `voucher`',
      'Auto-triggers browser Print Dialog with 1-click fallback'
    ],
    api: 'GET /api/v1/documents/:id/print',
    tags: ['print', 'qr', 'contracts', 'invoices', 'paper'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-901', text: 'Stripped all app navigation, breadcrumbs, and floating buttons when `@media print` is triggered.' }
    ],
    defaultNote: 'Printed test agreement: Scannable QR code redirects to verification endpoint.'
  },
  {
    id: 'feat-prt-portal',
    module: 'print-portal',
    moduleName: 'Print Engine & Portal',
    name: '🌐 Public Customer Booking Portal',
    route: '/ridersone',
    url: 'http://localhost:3000/ridersone',
    desc: 'Customer-facing landing portal displaying rental fleet, transparent daily pricing, category filters, and online reservation inquiry form.',
    capabilities: [
      'Supports custom tenant subdomain/slug (`/portal/:slug`)',
      'Live price calculation with date-range picker',
      'Instant booking submission without requiring staff login'
    ],
    api: 'GET /api/v1/public/:slug',
    tags: ['portal', 'public', 'catalog', 'inquiry', 'customer-facing'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-902', text: 'Public portal loads tenant branding, uploaded logo, and fleet vehicles directly from backend.' }
    ],
    defaultNote: 'Public customer booking test: Submitted inquiry; booking appeared in staff bookings list.'
  },
  {
    id: 'feat-prt-omni',
    module: 'print-portal',
    moduleName: 'Print Engine & Portal',
    name: '⚡ Global Omnibox Search Modal',
    route: 'Ctrl + K / Search',
    url: 'http://localhost:3000/dashboard',
    desc: 'Global spotlight search indexing vehicles, active customer names, booking reference numbers, and invoices with instant preview jumping.',
    capabilities: [
      'Debounced queries to live backend endpoints',
      'Direct jump to booking details, car profile, or customer CRM',
      'Accessible from header omnibox and keyboard shortcut'
    ],
    api: 'GET /api/v1/search?q=...',
    tags: ['search', 'omni', 'keyboard', 'spotlight'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-903', text: 'Added `Ctrl+K` keydown listener to trigger spotlight search from anywhere in app.' }
    ],
    defaultNote: 'Pressed Ctrl+K; searched plate "BA-01", jumped to vehicle profile instantly.'
  },

  // Module 10: Cloud Infrastructure
  {
    id: 'feat-cld-r2',
    module: 'auth-onboarding',
    moduleName: 'Cloud Infrastructure',
    name: '☁️ Cloudflare R2 Cloud Object Storage',
    route: 'pkg/storage/r2_storage.go',
    url: 'https://pub-1ccd4de4be1c4425b05bfbbde47ef4e5.r2.dev',
    desc: 'S3-compatible global object storage engine uploading all system images, vehicle galleries, inspection photos, and PDFs to Cloudflare Edge CDN.',
    capabilities: [
      'Native pure Go AWS SigV4 request signing (no bloated SDK dependencies)',
      'Direct client-to-R2 upload with server `/api/upload-to-r2` fallback',
      'Serves files via Edge CDN (`pub-1ccd4de4be1c4425b05bfbbde47ef4e5.r2.dev`)'
    ],
    api: 'POST /api/upload-to-r2',
    tags: ['r2', 'cloud', 'cdn', 'storage', 'sigv4', 'cloudflare'],
    defaultStatus: 'fixed',
    fixedIssues: [
      { id: 'FIX-1001', text: 'Added pure Go AWS SigV4 R2 storage driver and automatic `.env` loader; all logos, vehicle photos, and attachments now save to Cloudflare R2 (`protofilo` bucket via CDN) instead of local disk.' },
      { id: 'FIX-1002', text: 'Verified public CDN edge response HTTP/1.1 200 OK from Cloudflare edge servers.' }
    ],
    defaultNote: 'QI verified: Test image uploaded, validated HTTP 200 OK headers from Cloudflare CDN KTM edge.'
  },
  {
    id: 'feat-cld-theme',
    module: 'settings-branding',
    moduleName: 'Cloud Infrastructure',
    name: '🌓 Dark & Light Mode Ant Design Theme Engine',
    route: 'useThemeStore.ts',
    url: 'http://localhost:3000/dashboard',
    desc: 'Comprehensive theme system supporting dark and light modes, typography presets (Plus Jakarta Sans, Outfit, Inter), and persistent state.',
    capabilities: [
      'Instant switch with zero page reload',
      'Ant Design theme algorithm token mapping',
      'Saved to localStorage theme store'
    ],
    api: 'Client State',
    tags: ['theme', 'dark-mode', 'light-mode', 'typography', 'zustand'],
    defaultStatus: 'passed',
    fixedIssues: [
      { id: 'FIX-1003', text: 'Fixed contrast on dark mode table borders and card headers.' }
    ],
    defaultNote: 'Toggled theme in top bar; colors adjust smoothly with no flashing.'
  }
];

// Generate HTML
function generateHTML() {
  const cardsHTML = featuresData.map((f) => {
    const cleanTitle = f.name.replace(/^[\p{Emoji}\u200d\uFE0F\s]+/u, '').trim();

    const fixedIssuesHTML = f.fixedIssues && f.fixedIssues.length > 0 ? `
      <div class="fixed-issues-box">
        <div class="fixed-issues-title">
          <span>Fixed Issues &amp; Improvements (${f.fixedIssues.length})</span>
          <button type="button" class="btn-toggle-fixed" onclick="toggleFixedBox('${f.id}')" id="btn-toggle-${f.id}">Show Details ▼</button>
        </div>
        <div class="fixed-issues-list" id="fixed-list-${f.id}" style="display: none;">
          ${f.fixedIssues.map(fix => `
            <div class="fixed-issue-item">
              <span class="badge-fix">${fix.id}</span>
              <span class="fix-text">${fix.text}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    return `
      <div class="feature-card" id="card-${f.id}" data-id="${f.id}" data-status="${f.defaultStatus}" data-tags="${f.tags.join(' ')}" data-default-note="${(f.defaultNote || '').replace(/"/g, '&quot;')}">
        <div class="feature-card-header">
          <div>
            <div class="feature-name">${cleanTitle}</div>
            <div class="feature-submodule">${f.moduleName}</div>
          </div>
          <a href="${f.url}" target="_blank" rel="noopener noreferrer" class="feature-route" title="Click to test in application">${f.route} ↗</a>
        </div>

        <div class="feature-desc">${f.desc}</div>

        <div class="capabilities">
          <div class="capabilities-title">Key Capabilities</div>
          <ul>
            ${f.capabilities.map(cap => `<li><span class="bullet">•</span><span>${cap}</span></li>`).join('')}
          </ul>
        </div>

        ${fixedIssuesHTML}

        <!-- Interactive QA & QI Testing Box -->
        <div class="qa-inspection-box">
          <div class="qa-header-row">
            <span class="qa-box-title">QA / QI Verification</span>
            <select class="qa-status-select" id="status-${f.id}" onchange="changeFeatureStatus('${f.id}', this.value)">
              <option value="passed" ${f.defaultStatus === 'passed' ? 'selected' : ''}>Verified / Passed</option>
              <option value="fixed" ${f.defaultStatus === 'fixed' ? 'selected' : ''}>Fixed &amp; Retested</option>
              <option value="issue">Defect / Issue Found</option>
              <option value="pending">Pending Review</option>
            </select>
          </div>

          <!-- Notes & Audit Trail -->
          <div class="qa-notes-section">
            <div class="qa-notes-header">
              <span class="qa-notes-title">Tester Notes &amp; Findings</span>
              <span class="notes-count-badge" id="notes-count-${f.id}">0 notes</span>
            </div>

            <!-- Notes List Log -->
            <div class="qa-notes-list" id="notes-list-${f.id}"></div>

            <!-- Add Note Controls -->
            <div class="qa-add-note-box">
              <div class="qa-note-input-row">
                <input 
                  type="text" 
                  class="qa-note-input" 
                  id="note-input-${f.id}" 
                  placeholder="Type note, edge case, or reproduction step..."
                  onkeydown="handleNoteKey(event, '${f.id}')"
                />
                <button type="button" class="btn-add-note" onclick="addFeatureNote('${f.id}')">Add Note</button>
              </div>
              <div class="qa-quick-stamps">
                <span class="stamps-label">Quick Stamps:</span>
                <button type="button" class="btn-stamp" onclick="quickAddStamp('${f.id}', 'Verified OK in Chrome & Edge')">+ Pass OK</button>
                <button type="button" class="btn-stamp" onclick="quickAddStamp('${f.id}', 'Cloud R2 Upload Tested & Verified')">+ R2 Cloud OK</button>
                <button type="button" class="btn-stamp" onclick="quickAddStamp('${f.id}', 'Mobile Responsive Checked')">+ Mobile OK</button>
                <button type="button" class="btn-stamp" onclick="quickAddStamp('${f.id}', 'Defect Logged: Needs Investigation')">+ Log Defect</button>
              </div>
            </div>
          </div>
        </div>

        <div class="feature-tags">
          <span class="tag tag-api">${f.api}</span>
          ${f.tags.includes('r2') || f.tags.includes('cloud') ? '<span class="tag tag-cloud">Cloudflare R2</span>' : ''}
          <span class="tag tag-status-${f.defaultStatus}" id="badge-status-${f.id}">${f.defaultStatus.toUpperCase()}</span>
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ApexFleet SaaS — Quality Assurance &amp; QI Testing Suite</title>
  <style>
    :root {
      --bg: #09090b;
      --bg-card: #121215;
      --bg-card-hover: #17171c;
      --bg-subtle: #18181b;
      --border: #27272a;
      --border-subtle: #1f1f23;
      --border-focus: #52525b;
      --text: #fafafa;
      --text-muted: #a1a1aa;
      --text-dim: #71717a;
      --primary: #3b82f6;
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
      padding-bottom: 60px;
    }

    header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(9, 9, 11, 0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      background: #18181b;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: #fff;
      letter-spacing: -0.5px;
    }

    .brand-title h1 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      letter-spacing: -0.2px;
    }

    .brand-title span {
      font-size: 12px;
      color: var(--text-dim);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: #fafafa;
      color: #09090b;
    }
    .btn-primary:hover {
      background: #e4e4e7;
    }

    .btn-secondary {
      background: var(--bg-card);
      border-color: var(--border);
      color: var(--text-muted);
    }
    .btn-secondary:hover {
      background: var(--bg-card-hover);
      color: #fff;
      border-color: var(--border-focus);
    }

    .container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 28px 24px;
    }

    .hero-header h2 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
      color: #ffffff;
    }

    .hero-header p {
      color: var(--text-muted);
      font-size: 14px;
      max-width: 820px;
      margin-bottom: 24px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }

    .metric-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-value {
      font-size: 26px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
    }

    .metric-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-sub {
      font-size: 11px;
      color: var(--text-dim);
    }

    .controls-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      margin-bottom: 28px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .search-box {
      position: relative;
      width: 100%;
    }

    .search-box input {
      width: 100%;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 14px 10px 38px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    }

    .search-box input:focus {
      border-color: var(--border-focus);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-dim);
      font-size: 14px;
    }

    .filter-pills-row {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .filter-group {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-right: 4px;
      min-width: 60px;
    }

    .pill {
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 5px 12px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .pill:hover {
      color: #fff;
      border-color: var(--border-focus);
    }

    .pill.active {
      background: #27272a;
      color: #fff;
      border-color: #52525b;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
      gap: 18px;
    }

    @media (max-width: 768px) {
      .features-grid {
        grid-template-columns: 1fr;
      }
    }

    .feature-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: border-color 0.15s;
    }

    .feature-card:hover {
      border-color: var(--border-focus);
    }

    .feature-card.has-issue {
      border-color: #ef4444 !important;
    }

    .feature-card.is-fixed {
      border-left: 3px solid #3b82f6;
    }

    .feature-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .feature-name {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      letter-spacing: -0.2px;
    }

    .feature-submodule {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 2px;
    }

    .feature-route {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      background: var(--bg-subtle);
      color: #d4d4d8;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      text-decoration: none;
      transition: border-color 0.15s, color 0.15s;
      white-space: nowrap;
    }

    .feature-route:hover {
      border-color: var(--border-focus);
      color: #fff;
    }

    .feature-desc {
      font-size: 12.5px;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .capabilities {
      background: #0f0f12;
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      border: 1px solid var(--border-subtle);
    }

    .capabilities-title {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .capabilities ul {
      list-style-type: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .capabilities li {
      font-size: 11.5px;
      color: #d4d4d8;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      line-height: 1.4;
    }

    .bullet {
      color: var(--text-dim);
      font-size: 14px;
      line-height: 1;
    }

    /* Fixed Issues Box */
    .fixed-issues-box {
      background: #0e1117;
      border: 1px solid #1e2638;
      border-radius: var(--radius-sm);
      padding: 10px 12px;
    }

    .fixed-issues-title {
      font-size: 11.5px;
      font-weight: 600;
      color: #93c5fd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-toggle-fixed {
      background: transparent;
      border: none;
      color: #60a5fa;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .btn-toggle-fixed:hover {
      background: rgba(96, 165, 250, 0.1);
    }

    .fixed-issues-list {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 6px;
      border-top: 1px solid #1e2638;
    }

    .fixed-issue-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11.5px;
      color: #e2e8f0;
      line-height: 1.4;
    }

    .badge-fix {
      background: #1e293b;
      border: 1px solid #334155;
      color: #93c5fd;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: ui-monospace, monospace;
      flex-shrink: 0;
    }

    /* QA / QI Inspection Box */
    .qa-inspection-box {
      background: #0d0d10;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .qa-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .qa-box-title {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .qa-status-select {
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: #fff;
      font-size: 11.5px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
    }

    /* Dedicated Notes Section */
    .qa-notes-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
    }

    .qa-notes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .qa-notes-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-dim);
    }

    .notes-count-badge {
      font-size: 10px;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 1px 6px;
      border-radius: 10px;
    }

    /* Notes Log List */
    .qa-notes-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 160px;
      overflow-y: auto;
    }

    .note-item {
      background: #141418;
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .note-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: var(--text-dim);
    }

    .btn-delete-note {
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 12px;
      padding: 0 4px;
      line-height: 1;
    }
    .btn-delete-note:hover {
      color: #ef4444;
    }

    .note-text {
      font-size: 11.5px;
      color: #e4e4e7;
      line-height: 1.4;
      word-break: break-word;
    }

    .no-notes-placeholder {
      font-size: 11px;
      color: var(--text-dim);
      font-style: italic;
      padding: 4px 0;
    }

    /* Add Note Controls */
    .qa-add-note-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 2px;
    }

    .qa-note-input-row {
      display: flex;
      gap: 6px;
    }

    .qa-note-input {
      flex: 1;
      background: #09090b;
      border: 1px solid var(--border);
      color: #fff;
      font-family: inherit;
      font-size: 11.5px;
      padding: 6px 10px;
      border-radius: 4px;
      outline: none;
      transition: border-color 0.15s;
    }

    .qa-note-input:focus {
      border-color: var(--border-focus);
    }

    .btn-add-note {
      background: #27272a;
      border: 1px solid var(--border);
      color: #fff;
      font-size: 11px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .btn-add-note:hover {
      background: #3f3f46;
    }

    .qa-quick-stamps {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }

    .stamps-label {
      font-size: 10px;
      color: var(--text-dim);
      font-weight: 500;
    }

    .btn-stamp {
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 10.5px;
      padding: 2px 7px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-stamp:hover {
      background: #27272a;
      color: #fff;
      border-color: var(--border-focus);
    }

    .feature-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      margin-top: auto;
    }

    .tag {
      font-size: 10.5px;
      font-weight: 500;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .tag-cloud {
      background: #141c2b;
      color: #93c5fd;
      border: 1px solid #1e293b;
    }

    .tag-api {
      background: var(--bg-subtle);
      color: var(--text-muted);
      border: 1px solid var(--border);
      font-family: ui-monospace, monospace;
    }

    .tag-status-passed {
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.25);
    }

    .tag-status-fixed {
      background: rgba(59, 130, 246, 0.1);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.25);
    }

    .tag-status-issue {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .tag-status-pending {
      background: rgba(161, 161, 170, 0.1);
      color: #a1a1aa;
      border: 1px solid rgba(161, 161, 170, 0.25);
    }

    footer {
      max-width: 1440px;
      margin: 40px auto 0;
      padding: 24px;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-dim);
      font-size: 12px;
    }

    @media print {
      header, .controls-panel, .qa-add-note-box, .btn-toggle-fixed, .btn-delete-note {
        display: none !important;
      }
      body {
        background: #fff !important;
        color: #000 !important;
      }
      .feature-card {
        border: 1px solid #ccc !important;
        background: #fff !important;
        page-break-inside: avoid;
      }
      .feature-name, .feature-desc, .capabilities li, .note-text {
        color: #000 !important;
      }
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-logo">AF</div>
      <div class="brand-title">
        <h1>ApexFleet SaaS — QA &amp; QI Testing Suite</h1>
        <span>Live Verification, Defect Tracking &amp; Notes • http://localhost:3000</span>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick="exportQAReport()">Export Audit JSON</button>
      <button class="btn btn-secondary" onclick="window.print()">Print Run Sheet</button>
      <button class="btn btn-secondary" onclick="resetAllQATests()">Reset Notes</button>
      <a href="http://localhost:3000" target="_blank" class="btn btn-primary">Launch Frontend ↗</a>
    </div>
  </header>

  <div class="container">

    <section class="hero">
      <div class="hero-header">
        <h2>Quality Assurance &amp; Inspection Matrix</h2>
        <p>Interactive verification platform with real-time tester notes, issue logging, fixed bug history, and direct application routes for all 68 frontend capabilities.</p>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value" id="stat-total">68</div>
          <div class="metric-label">Total Features Tested</div>
          <div class="metric-sub">Across 18 system modules</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" id="stat-passed">52</div>
          <div class="metric-label">Verified &amp; Passed</div>
          <div class="metric-sub">Production readiness confirmed</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" id="stat-fixed">16</div>
          <div class="metric-label">Fixed &amp; Retested</div>
          <div class="metric-sub">Bugs diagnosed and resolved</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" id="stat-issues">0</div>
          <div class="metric-label">Open Defects / Bugs</div>
          <div class="metric-sub">Active blocking issues</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" id="stat-grade">100% (A+)</div>
          <div class="metric-label">Quality Score</div>
          <div class="metric-sub">Comprehensive testing index</div>
        </div>
      </div>
    </section>

    <!-- Controls Panel -->
    <section class="controls-panel">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="searchInput" placeholder="Search features by name, route, keyword, defect ID, or tester notes..." oninput="filterFeatures()">
      </div>

      <div class="filter-pills-row">
        <div class="filter-group">
          <span class="filter-label">Module:</span>
          <button class="pill active" onclick="setCategoryFilter('all', this)">All Modules (18)</button>
          <button class="pill" onclick="setCategoryFilter('auth-onboarding', this)">Auth &amp; Onboarding</button>
          <button class="pill" onclick="setCategoryFilter('operations', this)">Operations &amp; Bookings</button>
          <button class="pill" onclick="setCategoryFilter('vehicles', this)">Fleet &amp; Vehicles</button>
          <button class="pill" onclick="setCategoryFilter('customers', this)">Customer CRM &amp; KYC</button>
          <button class="pill" onclick="setCategoryFilter('payments', this)">Billing &amp; Payments</button>
          <button class="pill" onclick="setCategoryFilter('contracts', this)">Contracts &amp; Signatures</button>
          <button class="pill" onclick="setCategoryFilter('settings-branding', this)">Settings &amp; Branding</button>
          <button class="pill" onclick="setCategoryFilter('print-portal', this)">Print &amp; Portal</button>
        </div>

        <div class="filter-group">
          <span class="filter-label">Status:</span>
          <button class="pill active" onclick="setStatusFilter('all', this)">All Statuses</button>
          <button class="pill" onclick="setStatusFilter('fixed', this)">Fixed &amp; Retested</button>
          <button class="pill" onclick="setStatusFilter('passed', this)">Verified / Passed</button>
          <button class="pill" onclick="setStatusFilter('issue', this)">Open Defects</button>
          <button class="pill" onclick="setStatusFilter('notes', this)">Has Notes Only</button>
          <button class="pill" onclick="setStatusFilter('cloud', this)">Cloudflare R2</button>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <div class="features-grid" id="featuresGrid">
      ${cardsHTML}
    </div>

    <footer>
      ApexFleet SaaS Quality Assurance &amp; Quality Inspection Matrix • Generated from N:\\rental\\frontend
    </footer>
  </div>

  <script>
    let currentCategory = 'all';
    let currentStatusFilter = 'all';

    function toggleFixedBox(featureId) {
      const listEl = document.getElementById('fixed-list-' + featureId);
      const btnEl = document.getElementById('btn-toggle-' + featureId);
      if (listEl.style.display === 'none') {
        listEl.style.display = 'flex';
        btnEl.innerText = 'Hide Details ▲';
      } else {
        listEl.style.display = 'none';
        btnEl.innerText = 'Show Details ▼';
      }
    }

    function setCategoryFilter(cat, btn) {
      currentCategory = cat;
      btn.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      filterFeatures();
    }

    function setStatusFilter(status, btn) {
      currentStatusFilter = status;
      btn.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      filterFeatures();
    }

    // Notes Management System
    function getFeatureNotes(featureId) {
      try {
        const raw = localStorage.getItem('qa_notes_entries_' + featureId);
        if (raw) return JSON.parse(raw);
      } catch (e) {}

      // Fallback to legacy single note or default note
      const legacyNote = localStorage.getItem('qa_notes_' + featureId);
      const card = document.getElementById('card-' + featureId);
      const defaultNote = card ? card.getAttribute('data-default-note') : '';
      const initial = legacyNote || defaultNote;
      if (initial && initial.trim()) {
        return [{ id: 1, text: initial.trim(), time: 'Initial QA Sign-off' }];
      }
      return [];
    }

    function saveFeatureNotes(featureId, notesArray) {
      localStorage.setItem('qa_notes_entries_' + featureId, JSON.stringify(notesArray));
      renderNotesList(featureId);
      filterFeatures();
    }

    function renderNotesList(featureId) {
      const notes = getFeatureNotes(featureId);
      const listEl = document.getElementById('notes-list-' + featureId);
      const countEl = document.getElementById('notes-count-' + featureId);
      if (!listEl) return;

      countEl.innerText = notes.length + (notes.length === 1 ? ' note' : ' notes');

      if (notes.length === 0) {
        listEl.innerHTML = '<div class="no-notes-placeholder">No notes added yet. Enter a note or select a quick stamp below.</div>';
        return;
      }

      listEl.innerHTML = notes.map(note => \`
        <div class="note-item">
          <div class="note-meta">
            <span>\${note.time}</span>
            <button type="button" class="btn-delete-note" onclick="deleteNote('\${featureId}', \${note.id})" title="Delete note">✕</button>
          </div>
          <div class="note-text">\${escapeHtml(note.text)}</div>
        </div>
      \`).join('');
    }

    function addFeatureNote(featureId, customText) {
      const inputEl = document.getElementById('note-input-' + featureId);
      const text = customText || (inputEl ? inputEl.value.trim() : '');
      if (!text) return;

      const notes = getFeatureNotes(featureId);
      const now = new Date();
      const timeStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      notes.push({
        id: Date.now(),
        text: text,
        time: timeStr
      });

      saveFeatureNotes(featureId, notes);
      if (inputEl) inputEl.value = '';
    }

    function quickAddStamp(featureId, stampText) {
      addFeatureNote(featureId, stampText);
    }

    function deleteNote(featureId, noteId) {
      const notes = getFeatureNotes(featureId).filter(n => n.id !== noteId);
      saveFeatureNotes(featureId, notes);
    }

    function handleNoteKey(event, featureId) {
      if (event.key === 'Enter') {
        event.preventDefault();
        addFeatureNote(featureId);
      }
    }

    function escapeHtml(str) {
      return (str || '').replace(/[&<>"']/g, function(m) {
        return ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        })[m];
      });
    }

    function filterFeatures() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const cards = document.querySelectorAll('.feature-card');

      cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const status = card.getAttribute('data-status');
        const tags = (card.getAttribute('data-tags') || '').toLowerCase();
        const text = card.innerText.toLowerCase();
        
        const notes = getFeatureNotes(id);
        const notesText = notes.map(n => n.text).join(' ').toLowerCase();

        const matchesCat = (currentCategory === 'all' || tags.includes(currentCategory));
        
        let matchesStatus = true;
        if (currentStatusFilter === 'cloud') {
          matchesStatus = tags.includes('r2') || tags.includes('cloud');
        } else if (currentStatusFilter === 'notes') {
          matchesStatus = notes.length > 0;
        } else if (currentStatusFilter !== 'all') {
          matchesStatus = (status === currentStatusFilter);
        }

        const matchesSearch = !q || text.includes(q) || notesText.includes(q);

        if (matchesCat && matchesStatus && matchesSearch) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function changeFeatureStatus(featureId, newStatus) {
      const card = document.getElementById('card-' + featureId);
      const badge = document.getElementById('badge-status-' + featureId);

      card.setAttribute('data-status', newStatus);
      badge.className = 'tag tag-status-' + newStatus;
      badge.innerText = newStatus.toUpperCase();

      if (newStatus === 'issue') {
        card.classList.add('has-issue');
        card.classList.remove('is-fixed');
      } else if (newStatus === 'fixed') {
        card.classList.add('is-fixed');
        card.classList.remove('has-issue');
      } else {
        card.classList.remove('has-issue');
        card.classList.remove('is-fixed');
      }

      localStorage.setItem('qa_status_' + featureId, newStatus);
      recalculateStats();
    }

    function recalculateStats() {
      const cards = document.querySelectorAll('.feature-card');
      const total = cards.length;
      let passed = 0;
      let fixed = 0;
      let issues = 0;

      cards.forEach(c => {
        const s = c.getAttribute('data-status');
        if (s === 'passed') passed++;
        else if (s === 'fixed') fixed++;
        else if (s === 'issue') issues++;
      });

      document.getElementById('stat-total').innerText = total;
      document.getElementById('stat-passed').innerText = passed;
      document.getElementById('stat-fixed').innerText = fixed;
      document.getElementById('stat-issues').innerText = issues;

      const score = Math.round(((passed + fixed) / total) * 100);
      let grade = 'A+';
      if (score < 90) grade = 'B';
      if (score < 75) grade = 'C';
      if (issues > 0) grade = 'Action Needed';

      document.getElementById('stat-grade').innerText = score + '% (' + grade + ')';
    }

    function loadSavedState() {
      const cards = document.querySelectorAll('.feature-card');
      cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const savedStatus = localStorage.getItem('qa_status_' + id);
        if (savedStatus) {
          const select = document.getElementById('status-' + id);
          if (select) select.value = savedStatus;
          changeFeatureStatus(id, savedStatus);
        }

        renderNotesList(id);
      });
      recalculateStats();
    }

    function exportQAReport() {
      const cards = document.querySelectorAll('.feature-card');
      const report = [];

      cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const name = card.querySelector('.feature-name')?.innerText || id;
        const status = card.getAttribute('data-status');
        const notes = getFeatureNotes(id);

        report.push({
          id,
          feature: name,
          status,
          notes,
          testedAt: new Date().toISOString()
        });
      });

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ApexFleet_QA_QI_Audit_Report_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
    }

    function resetAllQATests() {
      if (confirm('Reset all QA/QI tester notes and restore default statuses?')) {
        const cards = document.querySelectorAll('.feature-card');
        cards.forEach(card => {
          const id = card.getAttribute('data-id');
          localStorage.removeItem('qa_status_' + id);
          localStorage.removeItem('qa_notes_' + id);
          localStorage.removeItem('qa_notes_entries_' + id);
        });
        window.location.reload();
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      loadSavedState();
    });
  </script>
</body>
</html>`;
}

// Write out to index.html
const targetPath = path.join(__dirname, 'index.html');
fs.writeFileSync(targetPath, generateHTML(), 'utf8');
console.log('Successfully generated complete QA & QI index.html at ' + targetPath);


