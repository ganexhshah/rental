# Himalayan Rides - Mobile Fleet & Rental Operations App

Flutter mobile client application for the Vehicle Rental SaaS platform. Designed for staff, drivers, and rental fleet managers to manage bookings, fleet inspections, payments, contracts, and customer verification on Android, iOS, Windows, and Web.

---

## 📱 How to Run on a Physical Android Phone

Follow these steps to run the app directly on your connected Android phone with live backend connectivity:

### 1. Enable USB Debugging on Your Phone
1. Open phone **Settings** > **About Phone / About Device**.
2. Tap **Build Number** 7 times until you see *"You are now a developer!"*.
3. Go back to **Settings** > **System / Additional Settings** > **Developer Options**.
4. Enable **USB Debugging** (toggle to **ON**).
5. Plug your phone into the computer with a USB cable.
6. When prompted on your phone screen with *"Allow USB debugging?"*, tap **Allow** (and select *"Always allow from this computer"*).

---

### 2. Start the Backend API Server
The mobile app communicates with the Go backend running on port `8080`.

Open a terminal and start the server:
```powershell
cd N:\rental\backend
go run cmd/api/main.go
```
*Ensure the server outputs: `http server listening address=:8080`.*

---

### 3. Forward Port 8080 to Your Phone
Because the app on your phone calls `http://localhost:8080/api/v1`, forward the port so your phone connects directly to your PC backend:

```powershell
adb reverse tcp:8080 tcp:8080
```
> **Tip:** You only need to run this command once per USB plug-in session.

---

### 4. Verify Connected Devices
Check that ADB and Flutter detect your device:

```powershell
# Verify ADB connection
adb devices

# Verify Flutter device detection
flutter devices
```
*You should see your phone listed (e.g., `CPH2285 (mobile) • WKNJEMS8JNGEZ5MN • android-arm64`).*

---

### 5. Launch the App
In your terminal, navigate to the app directory and run:

```powershell
cd N:\rental\app
flutter run
```

If multiple devices are connected (e.g. Chrome, Windows Desktop), specify your phone:
```powershell
flutter run -d CPH2285
```
*(Or specify the device ID: `flutter run -d WKNJEMS8JNGEZ5MN`)*

---

## ⚡ Quick 1-Click Runner Script
You can also run the app with the included script `run-on-phone.bat` from `N:\rental\app`:

```powershell
.\run-on-phone.bat
```

---

## ⌨️ Interactive Developer Shortcuts

While `flutter run` is active in your terminal, use these keyboard shortcuts:

| Key | Action | Description |
|:---:|---|---|
| <kbd>r</kbd> | **Hot Reload** | Sub-second reload of UI and code changes without resetting app state. |
| <kbd>R</kbd> | **Hot Restart** | Resets application state and re-runs `main.dart`. |
| <kbd>h</kbd> | **Help** | Displays all available interactive commands. |
| <kbd>d</kbd> | **Detach** | Disconnects the debugger while keeping the app running on your phone. |
| <kbd>c</kbd> | **Clear** | Clears the terminal output screen. |
| <kbd>q</kbd> | **Quit** | Terminates debugging and exits the app on the device. |

---

## 🛠️ Project Structure

```
lib/
├── core/
│   ├── api/          # API client, HTTP interceptors, endpoints
│   ├── constants/    # App constants, tenant defaults, storage keys
│   ├── theme/        # Color schemes, typography, component styles
│   └── utils/        # Date formatting, currency formatters, validators
├── models/           # Data models (Vehicle, Booking, Customer, Payment, etc.)
├── providers/        # State management via ChangeNotifier / Provider
├── screens/
│   ├── auth/         # Login, tenant selection, password reset
│   ├── dashboard/    # Fleet metrics, daily dispatch, quick stats
│   ├── bookings/     # Booking list, new reservation, pickup & return
│   ├── vehicles/     # Fleet inventory, vehicle profile, status toggles
│   ├── customers/    # Customer directory, ID verification, KYC
│   ├── payments/     # Transactions, receipts, invoices
│   ├── reports/      # Revenue, fleet utilization, P&L
│   └── settings/     # App config, tenant preferences, offline cache
└── widgets/          # Reusable UI cards, buttons, badges, bottom sheets
```

---

## ⚙️ Build Requirements
- **Flutter SDK**: `>= 3.13.3`
- **Dart SDK**: `>= 3.1.0`
- **JDK**: Java 17 LTS (`JavaVersion.VERSION_17`)
- **Android Target**: Android 13+ (API 33+)
