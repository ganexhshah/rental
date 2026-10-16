# Vehicle Rental SaaS Platform

A multi-tenant vehicle rental platform for car, bike, and scooter rental operations with real-time operations tracking, document management, automated invoicing, analytics, and cross-platform mobile apps.

---

## 📁 Repository Overview

| Directory | Type | Description | How to Run |
|---|---|---|---|
| [`/backend`](file:///n:/rental/backend) | Go / Chi API | Core REST API server, PostgreSQL + Redis storage, PDF documents, multi-tenant billing & reports. | `go run cmd/api/main.go` |
| [`/frontend`](file:///n:/rental/frontend) | React + Vite + AntD | Desktop admin & dispatch portal for fleet operations, calendar, reservations, customer verification, settings, and reports. | `npm run dev` |
| [`/app`](file:///n:/rental/app) | Flutter Mobile | Cross-platform mobile app for staff, drivers, and fleet dispatch on Android, iOS, Windows, and Web. | `flutter run -d android` or `.\run-on-phone.bat` |
| [`/invoice-app`](file:///n:/rental/invoice-app) | React + Vite | Dedicated print template renderer and invoice document generator. | `npm run dev` |

---

## 🚀 Quick Start Guide

### 1. Start the Go Backend Server
```powershell
cd N:\rental\backend
go run cmd/api/main.go
```
The server listens on `http://localhost:8080` with API routes at `http://localhost:8080/api/v1`.

---

### 2. Start the Web Admin Portal (Frontend)
```powershell
cd N:\rental\frontend
npm run dev
```
Open `http://localhost:3000` or `http://localhost:5173` in your browser.

---

### 3. Run the Mobile App on Your Android Phone
1. Connect your phone via USB with **USB Debugging** enabled in Developer Options.
2. In PowerShell, forward the backend port and run:
```powershell
cd N:\rental\app
adb reverse tcp:8080 tcp:8080
flutter run -d android
```
*(Or double-click [`N:\rental\app\run-on-phone.bat`](file:///n:/rental/app/run-on-phone.bat))*

---

## 📱 Mobile App Key Controls
When the app is running in the terminal:
- <kbd>r</kbd> - **Hot Reload** (instant UI refresh)
- <kbd>R</kbd> - **Hot Restart** (full app restart)
- <kbd>d</kbd> - **Detach** (leaves app running on phone)
- <kbd>q</kbd> - **Quit** (stops session)

