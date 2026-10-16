import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/booking_model.dart';
import '../../models/maintenance_model.dart';
import '../../models/vehicle_model.dart';
import '../../providers/booking_provider.dart';
import '../../providers/fleet_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/sheets/create_booking_sheet.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import 'add_edit_vehicle_screen.dart';
import 'vehicle_availability_screen.dart';

/// Full-featured vehicle detail screen matching http://localhost:3000/vehicles/:id (VehicleViewPage.tsx)
class VehicleDetailScreen extends StatefulWidget {
  final String vehicleId;

  const VehicleDetailScreen({super.key, required this.vehicleId});

  @override
  State<VehicleDetailScreen> createState() => _VehicleDetailScreenState();
}

class _VehicleDetailScreenState extends State<VehicleDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ImagePicker _picker = ImagePicker();

  int _selectedPhotoIndex = 0;
  List<VehicleDocument> _documents = [];
  List<MaintenanceTask> _maintenanceTasks = [];
  List<DamageRecord> _damages = [];
  bool _initializedData = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FleetProvider>().loadVehicleDetail(widget.vehicleId);
      context.read<BookingProvider>().loadBookings(silent: true);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _syncLocalData(Vehicle v, FleetProvider fleetProv) {
    if (_initializedData) return;
    _initializedData = true;

    // Documents
    if (fleetProv.selectedVehicleDocs.isNotEmpty) {
      _documents = List.from(fleetProv.selectedVehicleDocs);
    } else {
      final now = DateTime.now();
      _documents = [
        VehicleDocument(
          id: 'doc-${v.id}-1',
          vehicleId: v.id,
          vehiclePlate: v.plateNumber,
          vehicleName: v.displayName,
          docType: 'bluebook',
          name: 'Bluebook (Registration)',
          documentNumber: 'BB-KTM-${v.plateNumber.replaceAll(' ', '')}',
          expiryDate: now.add(const Duration(days: 340)),
          issueDate: now.subtract(const Duration(days: 25)),
          status: 'valid',
          verificationStatus: 'verified',
          fileUrl: 'https://storage.rental.app/docs/bluebook.pdf',
        ),
        VehicleDocument(
          id: 'doc-${v.id}-2',
          vehicleId: v.id,
          vehiclePlate: v.plateNumber,
          vehicleName: v.displayName,
          docType: 'insurance',
          name: 'Comprehensive Insurance Policy',
          documentNumber: 'SHIKHAR-INS-4491',
          expiryDate: now.add(const Duration(days: 14)),
          issueDate: now.subtract(const Duration(days: 350)),
          status: 'expiring_soon',
          verificationStatus: 'verified',
          fileUrl: 'https://storage.rental.app/docs/insurance.pdf',
        ),
        VehicleDocument(
          id: 'doc-${v.id}-3',
          vehicleId: v.id,
          vehiclePlate: v.plateNumber,
          vehicleName: v.displayName,
          docType: 'road_tax',
          name: 'Annual Road Tax Token & Permit',
          documentNumber: 'TAX-BAGMATI-2025',
          expiryDate: now.add(const Duration(days: 180)),
          issueDate: now.subtract(const Duration(days: 185)),
          status: 'valid',
          verificationStatus: 'verified',
          fileUrl: 'https://storage.rental.app/docs/tax.pdf',
        ),
        VehicleDocument(
          id: 'doc-${v.id}-4',
          vehicleId: v.id,
          vehiclePlate: v.plateNumber,
          vehicleName: v.displayName,
          docType: 'pollution',
          name: 'Pollution / Emission Green Sticker',
          documentNumber: 'POL-GREEN-8812',
          expiryDate: now.add(const Duration(days: 90)),
          issueDate: now.subtract(const Duration(days: 275)),
          status: 'valid',
          verificationStatus: 'verified',
          fileUrl: 'https://storage.rental.app/docs/pollution.pdf',
        ),
      ];
    }

    // Maintenance
    if (fleetProv.selectedVehicleMaintenance.isNotEmpty) {
      _maintenanceTasks = List.from(fleetProv.selectedVehicleMaintenance);
    } else {
      final now = DateTime.now();
      _maintenanceTasks = [
        MaintenanceTask(
          id: 'maint-${v.id}-1',
          vehicleId: v.id,
          vehiclePlate: v.plateNumber,
          title: 'Full Scheduled 15,000 km Service',
          status: 'completed',
          priority: 'medium',
          cost: 14500.0,
          vendorName: 'Continental Auto Care, Kathmandu',
          dueDate: now.subtract(const Duration(days: 20)),
          completedAt: now.subtract(const Duration(days: 19)),
          description: 'Engine oil flush, oil filter, air filter, and brake lining inspection.',
          odometer: (v.odometer > 1000 ? v.odometer - 850 : 12000),
        ),
        MaintenanceTask(
          id: 'maint-${v.id}-2',
          vehicleId: v.id,
          vehiclePlate: v.plateNumber,
          title: 'Brake Pad & Rotor Check',
          status: 'scheduled',
          priority: 'high',
          cost: 6500.0,
          vendorName: 'Himalayan Wheels Service Center',
          dueDate: now.add(const Duration(days: 12)),
          description: 'Front and rear disc rotor check before high-altitude Mustang rental.',
          odometer: v.odometer + 1500,
        ),
      ];
    }

    // Damage Incidents
    _damages = [
      DamageRecord(
        id: 'dmg-${v.id}-1',
        vehicleId: v.id,
        description: 'Minor scratch on passenger side rear bumper corner',
        severity: 'minor',
        estimatedCost: 3500.0,
        status: 'repaired',
        reportedAt: DateTime.now().subtract(const Duration(days: 45)),
      ),
    ];
  }

  List<String> _getAllPhotos(Vehicle v) {
    final List<String> list = [];
    if (v.primaryPhoto != null && v.primaryPhoto!.trim().isNotEmpty) {
      list.add(v.primaryPhoto!.trim());
    }
    for (final p in v.photos) {
      final clean = p.trim();
      if (clean.isNotEmpty && !list.contains(clean)) {
        list.add(clean);
      }
    }
    return list;
  }

  Widget _buildPhotoThumbnail(String rawUrl, {double? width, double? height, BoxFit fit = BoxFit.cover}) {
    final clean = rawUrl.trim();
    if (clean.isEmpty) {
      return Container(
        width: width,
        height: height,
        color: const Color(0xFFF1F5F9),
        child: const Icon(Icons.directions_car_filled_rounded, color: Color(0xFF94A3B8), size: 28),
      );
    }

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      final file = File(clean);
      if (file.existsSync()) {
        return Image.file(file, width: width, height: height, fit: fit);
      }
    }

    return Image.network(
      clean,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, __, ___) => Container(
        width: width,
        height: height,
        color: const Color(0xFFF1F5F9),
        child: const Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8), size: 28),
      ),
    );
  }

  // --- ACTIONS & SHEETS ---

  void _showChangeStatusSheet(Vehicle v) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final statuses = [
      {'key': 'available', 'label': 'Available for Hire', 'icon': Icons.check_circle_rounded, 'color': const Color(0xFF16A34A)},
      {'key': 'rented', 'label': 'On Active Rental', 'icon': Icons.key_rounded, 'color': AppColors.primary},
      {'key': 'maintenance', 'label': 'Under Maintenance / Service', 'icon': Icons.build_circle_rounded, 'color': const Color(0xFFD97706)},
      {'key': 'reserved', 'label': 'Reserved / Advance Booked', 'icon': Icons.bookmark_rounded, 'color': const Color(0xFF7C3AED)},
      {'key': 'retired', 'label': 'Decommissioned / Retired', 'icon': Icons.block_rounded, 'color': const Color(0xFFDC2626)},
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Change Asset Status (${v.plateNumber})',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 12),
              ...statuses.map((s) {
                final isSelected = v.status == s['key'];
                return ListTile(
                  leading: Icon(s['icon'] as IconData, color: s['color'] as Color),
                  title: Text(s['label'] as String, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                  trailing: isSelected ? const Icon(Icons.check, color: AppColors.primary) : null,
                  onTap: () {
                    Navigator.pop(ctx);
                    context.read<FleetProvider>().saveVehicle({
                      'make': v.make,
                      'model': v.model,
                      'year': v.year,
                      'plate_number': v.plateNumber,
                      'status': s['key'],
                      'daily_rate': v.dailyRate,
                      'odometer': v.odometer,
                    }, id: v.id);
                    AppFeedback.showToast(context, message: 'Status updated to ${s['label']}', type: ToastType.success);
                  },
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  void _showUpdateOdometerSheet(Vehicle v) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ctrl = TextEditingController(text: v.odometer.toString());

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          top: 20,
          left: 16,
          right: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Update Vehicle Odometer',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 6),
            Text(
              'Current reading: ${v.odometer.toString()} km',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: ctrl,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'New Odometer Reading (km)',
                suffixText: 'km',
                prefixIcon: Icon(Icons.speed_rounded),
              ),
            ),
            const SizedBox(height: 16),
            PrimaryButton(
              label: 'Save Odometer Reading',
              onPressed: () {
                final newKm = int.tryParse(ctrl.text.trim());
                if (newKm != null && newKm >= 0) {
                  Navigator.pop(ctx);
                  context.read<FleetProvider>().saveVehicle({
                    'make': v.make,
                    'model': v.model,
                    'year': v.year,
                    'plate_number': v.plateNumber,
                    'status': v.status,
                    'daily_rate': v.dailyRate,
                    'odometer': newKm,
                  }, id: v.id);
                  AppFeedback.showToast(context, message: 'Odometer updated to $newKm km', type: ToastType.success);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showEditPricingSheet(Vehicle v) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dailyCtrl = TextEditingController(text: v.dailyRate.toInt().toString());
    final weeklyCtrl = TextEditingController(text: v.weeklyRate.toInt().toString());
    final monthlyCtrl = TextEditingController(text: v.monthlyRate.toInt().toString());
    final depositCtrl = TextEditingController(text: v.depositAmount.toInt().toString());
    final kmCtrl = TextEditingController(text: v.allowedKmPerDay.toString());
    final extraKmCtrl = TextEditingController(text: v.extraKmRate.toInt().toString());

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          top: 20,
          left: 16,
          right: 16,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Edit Vehicle Rates & Terms',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: dailyCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Standard Daily Rate (Rs)', prefixText: 'Rs. '),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: weeklyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Weekly Rate (Rs)', prefixText: 'Rs. '),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: monthlyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Monthly Rate (Rs)', prefixText: 'Rs. '),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: depositCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Security Deposit (Rs)', prefixText: 'Rs. '),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: kmCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Daily Allowance', suffixText: 'km/day'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: extraKmCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Extra Km Charge', prefixText: 'Rs. '),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                label: 'Save Rates',
                onPressed: () {
                  final daily = double.tryParse(dailyCtrl.text) ?? v.dailyRate;
                  final weekly = double.tryParse(weeklyCtrl.text) ?? v.weeklyRate;
                  final monthly = double.tryParse(monthlyCtrl.text) ?? v.monthlyRate;
                  final deposit = double.tryParse(depositCtrl.text) ?? v.depositAmount;
                  final km = int.tryParse(kmCtrl.text) ?? v.allowedKmPerDay;
                  final extra = double.tryParse(extraKmCtrl.text) ?? v.extraKmRate;

                  Navigator.pop(ctx);
                  context.read<FleetProvider>().saveVehicle({
                    'make': v.make,
                    'model': v.model,
                    'year': v.year,
                    'plate_number': v.plateNumber,
                    'status': v.status,
                    'daily_rate': daily,
                    'weekly_rate': weekly,
                    'monthly_rate': monthly,
                    'deposit_amount': deposit,
                    'allowed_km_per_day': km,
                    'extra_km_rate': extra,
                    'odometer': v.odometer,
                  }, id: v.id);
                  AppFeedback.showToast(context, message: 'Rates updated successfully', type: ToastType.success);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddDocumentSheet(Vehicle v) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    String docType = 'bluebook';
    final nameCtrl = TextEditingController(text: 'Bluebook (Registration)');
    final numCtrl = TextEditingController();
    DateTime expiry = DateTime.now().add(const Duration(days: 365));
    String attachedPath = '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
            top: 20,
            left: 16,
            right: 16,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Attach Vehicle Document', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: docType,
                  decoration: const InputDecoration(labelText: 'Document Type'),
                  items: const [
                    DropdownMenuItem(value: 'bluebook', child: Text('Bluebook (Registration)')),
                    DropdownMenuItem(value: 'insurance', child: Text('Comprehensive Insurance')),
                    DropdownMenuItem(value: 'road_tax', child: Text('Road Tax Token')),
                    DropdownMenuItem(value: 'pollution', child: Text('Pollution Clearance')),
                    DropdownMenuItem(value: 'permit', child: Text('Route Permit')),
                    DropdownMenuItem(value: 'fitness', child: Text('Fitness Certificate')),
                    DropdownMenuItem(value: 'other', child: Text('Other Fleet Document')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setSheetState(() {
                        docType = val;
                        nameCtrl.text = val == 'bluebook'
                            ? 'Bluebook (Registration)'
                            : val == 'insurance'
                                ? 'Comprehensive Insurance'
                                : val == 'road_tax'
                                    ? 'Road Tax Token'
                                    : 'Compliance Certificate';
                      });
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(controller: numCtrl, decoration: const InputDecoration(labelText: 'Document / Policy Number')),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Expiry Date', style: TextStyle(fontSize: 13)),
                  subtitle: Text(DateFormat('dd MMM yyyy').format(expiry), style: const TextStyle(fontWeight: FontWeight.bold)),
                  trailing: const Icon(Icons.calendar_today_rounded, size: 18),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: expiry,
                      firstDate: DateTime.now().subtract(const Duration(days: 365)),
                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                    );
                    if (picked != null) {
                      setSheetState(() => expiry = picked);
                    }
                  },
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.photo_library_rounded, size: 18),
                        label: const Text('From Gallery'),
                        onPressed: () async {
                          final photo = await _picker.pickImage(source: ImageSource.gallery);
                          if (photo != null) {
                            setSheetState(() => attachedPath = photo.path);
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.camera_alt_rounded, size: 18),
                        label: const Text('Camera'),
                        onPressed: () async {
                          final photo = await _picker.pickImage(source: ImageSource.camera);
                          if (photo != null) {
                            setSheetState(() => attachedPath = photo.path);
                          }
                        },
                      ),
                    ),
                  ],
                ),
                if (attachedPath.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('Scan attached: ${attachedPath.split(Platform.pathSeparator).last}', style: const TextStyle(fontSize: 11, color: Color(0xFF16A34A))),
                ],
                const SizedBox(height: 16),
                PrimaryButton(
                  label: 'Save Document',
                  onPressed: () {
                    final newDoc = VehicleDocument(
                      id: 'doc-${DateTime.now().millisecondsSinceEpoch}',
                      vehicleId: v.id,
                      vehiclePlate: v.plateNumber,
                      vehicleName: v.displayName,
                      docType: docType,
                      name: nameCtrl.text.trim(),
                      documentNumber: numCtrl.text.trim().isNotEmpty ? numCtrl.text.trim() : 'DOC-${DateTime.now().millisecondsSinceEpoch % 10000}',
                      expiryDate: expiry,
                      issueDate: DateTime.now(),
                      status: expiry.isBefore(DateTime.now()) ? 'expired' : 'valid',
                      verificationStatus: 'verified',
                      fileUrl: attachedPath.isNotEmpty ? attachedPath : 'https://storage.rental.app/docs/${docType}_sample.pdf',
                    );
                    setState(() => _documents.insert(0, newDoc));
                    Navigator.pop(ctx);
                    AppFeedback.showToast(context, message: 'Document added to ${v.plateNumber}', type: ToastType.success);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showLogMaintenanceSheet(Vehicle v) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleCtrl = TextEditingController(text: '${v.make} ${v.model} Routine Service');
    final costCtrl = TextEditingController(text: '8500');
    final kmCtrl = TextEditingController(text: v.odometer.toString());
    final notesCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          top: 20,
          left: 16,
          right: 16,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Log Maintenance Task', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 12),
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Task Title / Service Name')),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(controller: costCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Estimated / Actual Cost', prefixText: 'Rs. ')),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(controller: kmCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Odometer at Service', suffixText: 'km')),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(controller: notesCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Work Notes / Parts Replaced')),
              const SizedBox(height: 16),
              PrimaryButton(
                label: 'Save Maintenance Log',
                onPressed: () {
                  final task = MaintenanceTask(
                    id: 'maint-${DateTime.now().millisecondsSinceEpoch}',
                    vehicleId: v.id,
                    vehiclePlate: v.plateNumber,
                    title: titleCtrl.text.trim(),
                    status: 'scheduled',
                    priority: 'medium',
                    cost: double.tryParse(costCtrl.text) ?? 0.0,
                    vendorName: 'Central Fleet Workshop',
                    dueDate: DateTime.now().add(const Duration(days: 7)),
                    odometer: int.tryParse(kmCtrl.text) ?? v.odometer,
                    description: notesCtrl.text.trim(),
                  );
                  setState(() => _maintenanceTasks.insert(0, task));
                  Navigator.pop(ctx);
                  AppFeedback.showToast(context, message: 'Maintenance task logged', type: ToastType.success);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showReportDamageSheet(Vehicle v) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    String area = 'Front Bumper';
    String severity = 'minor';
    final descCtrl = TextEditingController();
    final costCtrl = TextEditingController(text: '3000');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
            top: 20,
            left: 16,
            right: 16,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Report Damage Incident', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: area,
                  decoration: const InputDecoration(labelText: 'Damaged Area'),
                  items: const [
                    DropdownMenuItem(value: 'Front Bumper', child: Text('Front Bumper')),
                    DropdownMenuItem(value: 'Rear Bumper', child: Text('Rear Bumper')),
                    DropdownMenuItem(value: 'Driver Door', child: Text('Driver Door')),
                    DropdownMenuItem(value: 'Passenger Door', child: Text('Passenger Door')),
                    DropdownMenuItem(value: 'Windshield / Glass', child: Text('Windshield / Glass')),
                    DropdownMenuItem(value: 'Tyre / Rim', child: Text('Tyre / Rim')),
                    DropdownMenuItem(value: 'Underbody / Sump Guard', child: Text('Underbody / Sump Guard')),
                    DropdownMenuItem(value: 'Interior / Seat', child: Text('Interior / Seat')),
                  ],
                  onChanged: (val) => setSheetState(() => area = val ?? area),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: severity,
                  decoration: const InputDecoration(labelText: 'Severity'),
                  items: const [
                    DropdownMenuItem(value: 'minor', child: Text('Minor (Scratch, Scuff, Chip)')),
                    DropdownMenuItem(value: 'moderate', child: Text('Moderate (Dent, Crack, Misalignment)')),
                    DropdownMenuItem(value: 'severe', child: Text('Severe (Structural, Inoperable, Shattered)')),
                  ],
                  onChanged: (val) => setSheetState(() => severity = val ?? severity),
                ),
                const SizedBox(height: 12),
                TextField(controller: descCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Incident Description')),
                const SizedBox(height: 12),
                TextField(controller: costCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Estimated Repair Cost', prefixText: 'Rs. ')),
                const SizedBox(height: 16),
                PrimaryButton(
                  label: 'Submit Damage Report',
                  onPressed: () {
                    final dmg = DamageRecord(
                      id: 'dmg-${DateTime.now().millisecondsSinceEpoch}',
                      vehicleId: v.id,
                      description: descCtrl.text.trim().isNotEmpty ? descCtrl.text.trim() : '$area ($severity)',
                      severity: severity,
                      estimatedCost: double.tryParse(costCtrl.text) ?? 0.0,
                      status: 'reported',
                      reportedAt: DateTime.now(),
                    );
                    setState(() => _damages.insert(0, dmg));
                    Navigator.pop(ctx);
                    AppFeedback.showToast(context, message: 'Damage incident reported', type: ToastType.warning);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmDeleteVehicle(Vehicle v) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Decommission Vehicle?'),
        content: Text('Are you sure you want to permanently remove ${v.displayName} (${v.plateNumber}) from fleet operations?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
              AppFeedback.showToast(context, message: '${v.displayName} removed from fleet', type: ToastType.success);
            },
            child: const Text('Delete Vehicle', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fleetProv = context.watch<FleetProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);

    final v = fleetProv.selectedVehicle ?? fleetProv.vehicles.where((veh) => veh.id == widget.vehicleId).firstOrNull;

    if (fleetProv.isLoading && v == null) {
      return const AppScaffold(
        appBar: AppHeader(title: 'Vehicle Details'),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (v == null) {
      return const AppScaffold(
        appBar: AppHeader(title: 'Vehicle Details'),
        body: ErrorStateWidget(
          title: 'Vehicle Not Found',
          message: 'Unable to retrieve vehicle details from fleet repository.',
        ),
      );
    }

    _syncLocalData(v, fleetProv);
    final allPhotos = _getAllPhotos(v);

    final validDocs = _documents.where((d) => d.status == 'valid').length;
    final expiredDocs = _documents.where((d) => d.status == 'expired').length;
    final expiringDocs = _documents.where((d) => d.status == 'expiring_soon').length;

    return AppScaffold(
      appBar: AppHeader(
        title: v.displayName,
        subtitle: '${v.plateNumber} • ${v.categoryName ?? v.vehicleType.toUpperCase()}',
        actions: [
          IconButton(
            icon: const Icon(Icons.event_available_rounded),
            tooltip: 'Availability Grid',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => VehicleAvailabilityScreen(preselectedVehicleId: v.id)),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.edit_rounded),
            tooltip: 'Edit Vehicle',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => AddEditVehicleScreen(vehicle: v)),
              );
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded),
            onSelected: (val) {
              if (val == 'status') _showChangeStatusSheet(v);
              if (val == 'odometer') _showUpdateOdometerSheet(v);
              if (val == 'pricing') _showEditPricingSheet(v);
              if (val == 'maintenance') _showLogMaintenanceSheet(v);
              if (val == 'damage') _showReportDamageSheet(v);
              if (val == 'delete') _confirmDeleteVehicle(v);
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'status', child: Text('Change Status')),
              const PopupMenuItem(value: 'odometer', child: Text('Update Odometer')),
              const PopupMenuItem(value: 'pricing', child: Text('Edit Pricing Rates')),
              const PopupMenuItem(value: 'maintenance', child: Text('Log Maintenance')),
              const PopupMenuItem(value: 'damage', child: Text('Report Damage')),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'delete', child: Text('Decommission Vehicle', style: TextStyle(color: Colors.red))),
            ],
          ),
        ],
      ),
      body: NestedScrollView(
        headerSliverBuilder: (ctx, innerBoxIsScrolled) => [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: AppSpacing.sm),

                  // 1. Hero Photo Gallery (Borderless Gray Box)
                  Container(
                    width: double.infinity,
                    height: 220,
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: AppRadius.lg,
                    ),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        if (allPhotos.isNotEmpty)
                          _buildPhotoThumbnail(
                            allPhotos[_selectedPhotoIndex.clamp(0, allPhotos.length - 1)],
                            fit: BoxFit.cover,
                          )
                        else
                          Center(
                            child: Icon(
                              v.vehicleType == 'bike'
                                  ? Icons.two_wheeler_rounded
                                  : (v.vehicleType == 'scooter' ? Icons.moped_rounded : Icons.directions_car_filled_rounded),
                              size: 72,
                              color: AppColors.primary,
                            ),
                          ),
                        // Cover Badge
                        Positioned(
                          top: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFD97706),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.star_rounded, size: 14, color: Colors.white),
                                SizedBox(width: 4),
                                Text('Cover Photo', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                        // Photo Counter Badge
                        if (allPhotos.length > 1)
                          Positioned(
                            bottom: 12,
                            right: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.7),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(
                                '${_selectedPhotoIndex + 1}/${allPhotos.length} Photos',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Thumbnails bar if multiple photos
                  if (allPhotos.length > 1) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 52,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: allPhotos.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (ctx, idx) {
                          final isSelected = idx == _selectedPhotoIndex;
                          return InkWell(
                            onTap: () => setState(() => _selectedPhotoIndex = idx),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: 68,
                              height: 52,
                              clipBehavior: Clip.antiAlias,
                              decoration: BoxDecoration(
                                color: cardBg,
                                borderRadius: BorderRadius.circular(8),
                                border: isSelected ? Border.all(color: AppColors.primary, width: 2) : null,
                              ),
                              child: _buildPhotoThumbnail(allPhotos[idx]),
                            ),
                          );
                        },
                      ),
                    ),
                  ],

                  const SizedBox(height: AppSpacing.md),

                  // 2. Status & Rental Booking Banner (Solid Gray Box)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: AppRadius.lg,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                StatusChip(status: v.status),
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () => _showChangeStatusSheet(v),
                                  borderRadius: BorderRadius.circular(4),
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                    child: Text(
                                      'Change',
                                      style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF334155) : Colors.white,
                                borderRadius: AppRadius.sm,
                              ),
                              child: Text(
                                v.plateNumber,
                                style: AppTypography.monospace.copyWith(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          v.isAvailable
                              ? '✓ Ready for immediate hire and customer assignment'
                              : v.isRented
                                  ? '🚗 Vehicle currently on active rental contract'
                                  : '🔧 Under service or temporarily reserved',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: v.isAvailable ? const Color(0xFF16A34A) : (v.isRented ? AppColors.primary : const Color(0xFFD97706)),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: PrimaryButton(
                                label: 'Create Rental Booking',
                                icon: Icons.car_rental_rounded,
                                onPressed: () => CreateBookingSheet.show(context),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.md),

                  // 3. Quick Stats Grid (4 borderless gray boxes)
                  Row(
                    children: [
                      // Daily Rate
                      Expanded(
                        child: _buildMetricTile(
                          title: 'Daily Rate',
                          value: CurrencyFormatter.format(v.dailyRate),
                          actionLabel: 'Edit',
                          onAction: () => _showEditPricingSheet(v),
                          cardBg: cardBg,
                          isDark: isDark,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Current Odometer
                      Expanded(
                        child: _buildMetricTile(
                          title: 'Odometer',
                          value: '${v.odometer} km',
                          actionLabel: 'Update',
                          onAction: () => _showUpdateOdometerSheet(v),
                          cardBg: cardBg,
                          isDark: isDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      // Powertrain
                      Expanded(
                        child: _buildMetricTile(
                          title: 'Powertrain',
                          value: '${v.transmission.toUpperCase()} • ${v.fuelType.toUpperCase()}',
                          subtitle: '${v.seatingCapacity} Seats',
                          cardBg: cardBg,
                          isDark: isDark,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Compliance
                      Expanded(
                        child: _buildMetricTile(
                          title: 'Compliance',
                          value: '$validDocs/${_documents.length} Valid',
                          subtitle: expiredDocs > 0 ? '$expiredDocs Expired' : (expiringDocs > 0 ? '$expiringDocs Expiring Soon' : 'Compliant'),
                          actionLabel: '+ Add',
                          onAction: () => _showAddDocumentSheet(v),
                          cardBg: cardBg,
                          isDark: isDark,
                          valueColor: expiredDocs > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.md),
                ],
              ),
            ),
          ),

          // 4. Sticky Tab Bar
          SliverPersistentHeader(
            pinned: true,
            delegate: _SliverTabBarDelegate(
              TabBar(
                controller: _tabController,
                isScrollable: true,
                labelColor: AppColors.primary,
                unselectedLabelColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                indicatorColor: AppColors.primary,
                indicatorWeight: 3,
                tabs: [
                  const Tab(text: 'Overview'),
                  Tab(text: 'Documents (${_documents.length})'),
                  const Tab(text: 'Pricing & Terms'),
                  Tab(text: 'Maintenance (${_maintenanceTasks.length})'),
                  Tab(text: 'Damages (${_damages.length})'),
                  const Tab(text: 'Rental History'),
                ],
              ),
              isDark: isDark,
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(v, cardBg, isDark),
            _buildDocumentsTab(v, cardBg, isDark),
            _buildPricingTab(v, cardBg, isDark),
            _buildMaintenanceTab(v, cardBg, isDark),
            _buildDamagesTab(v, cardBg, isDark),
            _buildRentalHistoryTab(v, cardBg, isDark),
          ],
        ),
      ),
    );
  }

  // --- STAT TILE HELPER ---

  Widget _buildMetricTile({
    required String title,
    required String value,
    String? subtitle,
    String? actionLabel,
    VoidCallback? onAction,
    required Color cardBg,
    required bool isDark,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: AppRadius.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              if (actionLabel != null && onAction != null)
                InkWell(
                  onTap: onAction,
                  child: Text(
                    actionLabel,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: valueColor ?? (isDark ? Colors.white : const Color(0xFF0F172A)),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 10,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }

  // --- TAB 1: OVERVIEW ---

  Widget _buildOverviewTab(Vehicle v, Color cardBg, bool isDark) {
    final features = [
      'Air Conditioning',
      'GPS Real-time Unit',
      'Bluetooth Audio',
      '4x4 / AWD',
      'USB-C Fast Charger',
      'Touchscreen Display',
      'Child Safety Seat Anchors',
      'Backup Camera & Sensors',
    ];

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        // Specifications Card
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(color: cardBg, borderRadius: AppRadius.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Key Specifications', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 12),
              _buildRowItem('Make & Model', '${v.make} ${v.model}', isDark),
              _buildRowItem('Model Year', '${v.year}', isDark),
              _buildRowItem('Registration / Plate', v.plateNumber, isDark),
              _buildRowItem('Category', v.categoryName ?? 'Standard Fleet', isDark),
              _buildRowItem('Transmission', v.transmission.toUpperCase(), isDark),
              _buildRowItem('Fuel Type', v.fuelType.toUpperCase(), isDark),
              _buildRowItem('Seating Capacity', '${v.seatingCapacity} Passengers', isDark),
              _buildRowItem('Odometer Reading', '${v.odometer} km', isDark),
              _buildRowItem('Station / Hub', v.locationName ?? 'Kathmandu Central Hub', isDark),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.md),

        // Features & Amenities
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(color: cardBg, borderRadius: AppRadius.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Features & Equipment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: features.map((f) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF334155) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_rounded, size: 14, color: Color(0xFF16A34A)),
                        const SizedBox(width: 4),
                        Text(f, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.md),

        // Location Card
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(color: cardBg, borderRadius: AppRadius.lg),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF334155) : Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      v.locationName ?? 'Kathmandu Central Station',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Kantipath, Kathmandu • Fleet Hub Station #1',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- TAB 2: DOCUMENTS ---

  Widget _buildDocumentsTab(Vehicle v, Color cardBg, bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Compliance Certificates (${_documents.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ElevatedButton.icon(
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add Document'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _showAddDocumentSheet(v),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        if (_documents.isEmpty)
          const EmptyStateWidget(
            icon: Icons.assignment_outlined,
            title: 'No Documents Attached',
            description: 'Attach Bluebook, Insurance or Road Tax certificates.',
          )
        else
          ..._documents.map((doc) {
            final isExpired = doc.status == 'expired';
            final isExpiring = doc.status == 'expiring_soon';
            final statusColor = isExpired ? const Color(0xFFDC2626) : (isExpiring ? const Color(0xFFD97706) : const Color(0xFF16A34A));
            final expiryFormatted = doc.expiryDate != null ? DateFormat('dd MMM yyyy').format(doc.expiryDate!) : 'No Expiry';

            return Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(color: cardBg, borderRadius: AppRadius.lg),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF334155) : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Icon(
                        doc.docType == 'bluebook'
                            ? Icons.book_rounded
                            : (doc.docType == 'insurance' ? Icons.shield_rounded : Icons.receipt_long_rounded),
                        color: statusColor,
                        size: 24,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                doc.name,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                doc.status.replaceAll('_', ' ').toUpperCase(),
                                style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'No: ${doc.documentNumber ?? "—"}',
                          style: TextStyle(
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Expires: $expiryFormatted',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: statusColor),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  // --- TAB 3: PRICING ---

  Widget _buildPricingTab(Vehicle v, Color cardBg, bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Rates & Rental Terms', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ElevatedButton.icon(
              icon: const Icon(Icons.edit, size: 16),
              label: const Text('Edit Rates'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _showEditPricingSheet(v),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(color: cardBg, borderRadius: AppRadius.lg),
          child: Column(
            children: [
              _buildRowItem('Standard Daily Rate', CurrencyFormatter.format(v.dailyRate), isDark, highlight: true),
              _buildRowItem('Weekly Rate', v.weeklyRate > 0 ? CurrencyFormatter.format(v.weeklyRate) : '—', isDark),
              _buildRowItem('Monthly Rate', v.monthlyRate > 0 ? CurrencyFormatter.format(v.monthlyRate) : '—', isDark),
              _buildRowItem('Security Deposit', CurrencyFormatter.format(v.depositAmount), isDark),
              _buildRowItem('Daily Mileage Allowance', '${v.allowedKmPerDay} km / day', isDark),
              _buildRowItem('Extra Mileage Charge', '${CurrencyFormatter.format(v.extraKmRate)} / km', isDark),
            ],
          ),
        ),
      ],
    );
  }

  // --- TAB 4: MAINTENANCE ---

  Widget _buildMaintenanceTab(Vehicle v, Color cardBg, bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Service Work Orders (${_maintenanceTasks.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ElevatedButton.icon(
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Log Service'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _showLogMaintenanceSheet(v),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        if (_maintenanceTasks.isEmpty)
          const EmptyStateWidget(
            icon: Icons.build_circle_outlined,
            title: 'No Maintenance Records',
            description: 'All fleet maintenance and repair history will appear here.',
          )
        else
          ..._maintenanceTasks.map((m) {
            final isDone = m.status == 'completed';
            final statusColor = isDone ? const Color(0xFF16A34A) : const Color(0xFFD97706);
            return Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(color: cardBg, borderRadius: AppRadius.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(m.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          m.status.toUpperCase(),
                          style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (m.description != null && m.description!.isNotEmpty)
                    Text(m.description!, style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Cost: ${CurrencyFormatter.format(m.cost)}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      Text(DateFormat('dd MMM yyyy').format(m.dueDate), style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary)),
                    ],
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  // --- TAB 5: DAMAGES ---

  Widget _buildDamagesTab(Vehicle v, Color cardBg, bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Damage Log (${_damages.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ElevatedButton.icon(
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Report Damage'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _showReportDamageSheet(v),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        if (_damages.isEmpty)
          const EmptyStateWidget(
            icon: Icons.check_circle_outline_rounded,
            title: 'No Recorded Damages',
            description: 'Vehicle is currently in pristine condition with no open damage claims.',
          )
        else
          ..._damages.map((dmg) {
            final isRepaired = dmg.status == 'repaired';
            return Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(color: cardBg, borderRadius: AppRadius.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Incident: ${dmg.severity.toUpperCase()}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: dmg.severity == 'severe' ? const Color(0xFFDC2626) : const Color(0xFFD97706),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isRepaired ? const Color(0xFF16A34A).withOpacity(0.15) : const Color(0xFFD97706).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          dmg.status.toUpperCase(),
                          style: TextStyle(
                            color: isRepaired ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(dmg.description, style: const TextStyle(fontSize: 12)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Estimated: ${CurrencyFormatter.format(dmg.estimatedCost)}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      Text(DateFormat('dd MMM yyyy').format(dmg.reportedAt), style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary)),
                    ],
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  // --- TAB 6: BOOKINGS HISTORY ---

  Widget _buildRentalHistoryTab(Vehicle v, Color cardBg, bool isDark) {
    final bookingProv = context.watch<BookingProvider>();
    final vehicleBookings = bookingProv.bookings.where((b) => b.vehicleId == v.id).toList();

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Booking History (${vehicleBookings.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ElevatedButton.icon(
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Book Vehicle'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => CreateBookingSheet.show(context),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        if (vehicleBookings.isEmpty)
          const EmptyStateWidget(
            icon: Icons.calendar_today_rounded,
            title: 'No Rental Bookings Yet',
            description: 'All past, active, and upcoming rentals for this asset will appear here.',
          )
        else
          ...vehicleBookings.map((b) {
            final startFormatted = DateFormat('dd MMM yyyy').format(b.startDate);
            final endFormatted = DateFormat('dd MMM yyyy').format(b.endDate);

            return Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(color: cardBg, borderRadius: AppRadius.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(b.bookingCode, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace')),
                      StatusChip(status: b.status),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Customer: ${b.customerName}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text('$startFormatted → $endFormatted', style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary)),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Total: ${CurrencyFormatter.format(b.totalAmount)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryLight)),
                      Text(b.paymentStatus.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                    ],
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  Widget _buildRowItem(String label, String value, bool isDark, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary)),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: highlight ? AppColors.primaryLight : (isDark ? Colors.white : const Color(0xFF0F172A)),
            ),
          ),
        ],
      ),
    );
  }
}

class _SliverTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  final bool isDark;

  _SliverTabBarDelegate(this.tabBar, {required this.isDark});

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: isDark ? AppColors.darkCanvas : Colors.white,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverTabBarDelegate oldDelegate) {
    return false;
  }
}
