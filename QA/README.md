# ApexFleet SaaS - QA & Feature Verification Hub

This directory contains the standalone Quality Assurance and Feature Matrix for the entire ApexFleet Vehicle Rental SaaS platform.

## Viewing the QA Dashboard

You can open the dashboard directly in any web browser:

1. Double-click [index.html](file:///N:/rental/QA/index.html) to open in your default browser.
2. Or open via PowerShell / Terminal:
   ```powershell
   Start-Process "N:\rental\QA\index.html"
   ```

## What is Included in the QA Showcase

The dashboard catalog showcases every frontend feature and backend integration:

1. **Authentication & Session**: Login, Company Signup, Tenant Switching, Role-Based Access Control
2. **Onboarding Wizard**: 4-Step wizard with Cloudflare R2 logo upload, fleet seed option, and branch setup
3. **Executive Dashboard**: Real-time KPIs, Revenue Analytics Chart, Category Breakdown, Operations table
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
    - **Branding**: Cloud logo upload with drag-and-drop, theme colors, font presets
    - **Rules, Hours & Pricing**: Min driver age, fuel policies, operating hours & after-hours surcharge, payment gateways, GPS telematics
15. **Modern Print Engine**: Standalone clean printable invoices, contracts, and booking slips with verification QR code
16. **Public Booking Portal**: `/ridersone` customer self-service vehicle catalog and booking submission

## Live Links
- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: [http://localhost:8080](http://localhost:8080)
- **QA Feature Dashboard**: [N:\rental\QA\index.html](file:///N:/rental/QA/index.html)
