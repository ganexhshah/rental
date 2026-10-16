# ApexFleet SaaS - QA & QI Testing Hub (Notes, Defect Log & Fixed Issues)

This directory contains the Quality Assurance (QA) and Quality Inspection (QI) Testing Suite for the entire ApexFleet Vehicle Rental SaaS platform.

## How to Open the QA Hub

You can open the dashboard directly in any modern browser without needing a web server:

1. Double-click [index.html](file:///N:/rental/QA/index.html) to open in your default browser.
2. Or launch via PowerShell:
   ```powershell
   Start-Process "N:\rental\QA\index.html"
   ```

---

## QA & QI Interactive Testing Features

Every feature card in the QA Matrix includes built-in tester tooling:

1. **Test Status Selector**:
   - `Passed (Verified)`: Feature passes functional, visual, and integration standards.
   - `Fixed & Retested`: Past reported issue has been resolved and verified in testing.
   - `Issue Logged / Bug`: Flags the feature with high-contrast red warning border and tracks it in the top metrics bar.
   - `Pending Review`: Marked for follow-up testing.
2. **Fixed Issues & Quality Improvements Log**:
   - Collapsible panel on every feature detailing real resolved issues, root cause fixes, and backend/cloud integrations (e.g. Cloudflare R2 persistence, signup scrollability, logo upload URL removal, mock data purging, personal profile management).
3. **Interactive Tester Notes with Auto-Save**:
   - Write notes, reproduction steps, or QA sign-offs directly inside each feature card.
   - Automatically saved to `localStorage` across page reloads.
4. **Quick-Stamp Tags**:
   - 1-click test badges that stamp time and result into the notes:
     - `+ Chrome OK`
     - `+ Cloud R2 OK`
     - `+ Mobile OK`
     - `+ Edge Case OK`
5. **Real-Time Quality Metrics & Grade**:
   - Live banner showing: **Total Tested**, **Passed**, **Fixed Issues**, **Open Bugs**, and overall **Quality Score % & Grade** (e.g. `100% (A+)`).
6. **1-Click Audit Report Export**:
   - Download the full testing checklist, status, and tester notes as a formatted JSON report for CI/CD or audit logging.
7. **Print / PDF Ready**:
   - Built-in print media queries format the QA dashboard cleanly for PDF generation or physical inspection sign-offs.

---

## Complete Feature Matrix (68 Capabilities Across 18 Modules)

1. **Authentication & Session**: Login, Company Signup (scrollable modal fix), Tenant Switching, Role-Based Access Control
2. **Onboarding Wizard**: 4-Step wizard with Cloudflare R2 logo upload, fleet seed option, and branch setup
3. **Executive Dashboard**: Real-time KPIs, Revenue Analytics Chart, Category Breakdown, Operations table, dynamic sidebar logo
4. **Operations & Bookings**: Bookings Directory, Create Booking with rate calculator, 360 Booking Inspection, Operations Visual Calendar, Vehicle Handover/Return flow with damage inspection, Active Rentals Countdown, Availability Matrix
5. **Vehicles & Fleet**: Fleet Directory (grid & table), Vehicle Editor with Cloudflare R2 photo gallery uploader, 360 Vehicle Profile, Category setup, Compliance Hub (Bluebook, Insurance, Tax, Pollution), Depot Locations
6. **Customer CRM & KYC**: Customer Registry, Add Customer modal, Customer 360, KYC License Verification queue, Authorized Drivers, Rental Ledger, Fraud Blacklist
7. **Billing & Payments**: Multi-Gateway Ledger (eSewa, Khalti, Stripe, Cash, Bank Transfer), Security Deposit Custody & Refunds, Outstanding Balance Reminders, VAT/Tax Invoices, Refund Reversals
8. **Contracts & Signatures**: Digital Agreement Hub, Contract Template Builder with merge tags, HTML5 Touch/Mouse E-Signature Canvas, Expiring Contracts monitor
9. **Fleet Maintenance & Expenses**: Service Work Order Queue, Preventative Mileage-based Schedules, Vendor Directory, Fleet Expense Ledger with Cloudflare R2 receipts
10. **Reports & BI**: Revenue Analytics by vehicle/station, Fleet Utilization %, Profit & Loss (P&L) Reports
11. **Marketing**: Discount Coupons engine, Campaigns, Referral Rewards
12. **Staff & Audit**: Staff Directory, RBAC Permissions Matrix, System Activity Audit Logs
13. **Notifications**: Real-time Notification Center, SMS/Email Templates, Automation Rules
14. **Settings & Profile**:
    - **Company Profile**: Business details, PAN/Tax ID, address, danger zone
    - **Personal Profile**: Cloud avatar upload with Cloudflare R2, name & phone edit, bcrypt password rotation
    - **Branding**: Direct file dropzone for Cloudflare R2 cloud logo upload (URL field removed), theme colors, font presets
    - **Rules, Hours & Pricing**: Min driver age, fuel policies, operating hours & after-hours surcharge, payment gateways, GPS telematics
15. **Modern Print Engine**: Standalone clean printable invoices, contracts, and booking slips with verification QR code
16. **Public Booking Portal**: `/ridersone` customer self-service vehicle catalog and booking submission

---

## Live Links
- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: [http://localhost:8080](http://localhost:8080)
- **QA Feature Dashboard**: [N:\rental\QA\index.html](file:///N:/rental/QA/index.html)
