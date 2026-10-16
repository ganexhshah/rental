import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../models/vehicle_model.dart';
import '../../providers/fleet_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/sheets/vehicle_form_sheets.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

/// Interactive entry for an inline vehicle compliance document matching web screenshot
class VehicleDocEntry {
  final String? id;
  String docType;
  String name;
  String badge;
  String icon;
  final TextEditingController numberCtrl;
  DateTime? expiryDate;
  DateTime? issueDate;
  final List<String> scanPages;

  VehicleDocEntry({
    this.id,
    required this.docType,
    required this.name,
    required this.badge,
    required this.icon,
    String? initialNumber,
    this.expiryDate,
    this.issueDate,
    List<String>? scanPages,
  })  : numberCtrl = TextEditingController(text: initialNumber ?? ''),
        scanPages = scanPages ?? [];

  void dispose() {
    numberCtrl.dispose();
  }
}

/// Full-screen clean vehicle registration form without chunky card dividers
class AddEditVehicleScreen extends StatefulWidget {
  final Vehicle? vehicle;

  const AddEditVehicleScreen({super.key, this.vehicle});

  @override
  State<AddEditVehicleScreen> createState() => _AddEditVehicleScreenState();
}

class _AddEditVehicleScreenState extends State<AddEditVehicleScreen> {
  // Input Controllers (1 input per line)
  final _makeCtrl = TextEditingController();
  final _modelCtrl = TextEditingController();
  final _yearCtrl = TextEditingController(text: '2024');
  final _plateCtrl = TextEditingController();
  final _vinCtrl = TextEditingController();
  final _colorCtrl = TextEditingController();
  final _odometerCtrl = TextEditingController(text: '12000');
  final _engineCapacityCtrl = TextEditingController();
  final _seatsCtrl = TextEditingController(text: '5');
  final _dailyRateCtrl = TextEditingController(text: '4500');
  final _weeklyRateCtrl = TextEditingController(text: '28000');
  final _monthlyRateCtrl = TextEditingController(text: '95000');
  final _depositCtrl = TextEditingController(text: '10000');
  final _allowedKmCtrl = TextEditingController(text: '250');
  final _extraKmCtrl = TextEditingController(text: '25');
  final _notesCtrl = TextEditingController();

  // State Variables
  String _vehicleType = 'car';
  final List<Map<String, String>> _vehicleTypes = [
    {'key': 'car', 'name': 'Cars & SUVs', 'icon': '🚗'},
    {'key': 'bike', 'name': 'Motorcycles', 'icon': '🏍️'},
    {'key': 'scooter', 'name': 'Scooters', 'icon': '🛵'},
    {'key': 'van', 'name': 'Vans & Minibuses', 'icon': '🚐'},
  ];

  static const List<Map<String, String>> _docClassifications = [
    {
      'key': 'bluebook',
      'name': 'Bluebook (Vehicle Registration)',
      'badge': 'BLUEBOOK',
      'icon': '📘',
    },
    {
      'key': 'insurance',
      'name': 'Insurance Policy (Comprehensive)',
      'badge': 'INSURANCE',
      'icon': '🛡️',
    },
    {
      'key': 'road_tax',
      'name': 'Road Tax Token & Permit',
      'badge': 'ROAD TAX',
      'icon': '🧾',
    },
    {
      'key': 'pollution',
      'name': 'Pollution Compliance Certificate',
      'badge': 'POLLUTION',
      'icon': '🍃',
    },
    {
      'key': 'permit',
      'name': 'Commercial Route Permit',
      'badge': 'PERMIT',
      'icon': '🛣️',
    },
    {
      'key': 'fitness',
      'name': 'Vehicle Fitness Certificate',
      'badge': 'FITNESS',
      'icon': '🔧',
    },
    {
      'key': 'other',
      'name': 'Other Compliance Document',
      'badge': 'OTHER',
      'icon': '📁',
    },
  ];

  String? _categoryId;
  String? _locationId;
  String _status = 'available';
  String _transmission = 'Automatic';
  String _fuelType = 'Petrol';

  List<String> _vehicleImages = [];
  String _primaryImage = '';
  final ImagePicker _imagePicker = ImagePicker();

  final List<VehicleDocEntry> _docEntries = [];
  final List<String> _selectedFeatures = [];

  static const List<String> _popularSuggestions = [
    'Air Conditioning',
    'GPS Real-time Unit',
    'Bluetooth Audio',
    'Helmet Included',
    '4x4 / AWD',
    'Backup Camera & Sensors',
    'Dashcam / DVR',
    'Apple CarPlay & Android Auto',
    'Touchscreen Infotainment',
    'Sunroof / Moonroof',
    'Heated Seats',
    'Fast USB-C Charger',
    'Roof Luggage Rack',
    'Fog Lights',
    'Keyless Push Start',
    'Cruise Control',
    'ABS & Traction Control',
    'Child Safety Seat',
    'Smartphone Mount',
    'Toolkit & Puncture Kit',
    'Dual Disc Brakes',
    'Side Luggage Panniers',
    'Pillion Backrest',
    'Leather Seats',
    'Alloy Wheels',
  ];

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final v = widget.vehicle;
    if (v != null) {
      _makeCtrl.text = v.make;
      _modelCtrl.text = v.model;
      _yearCtrl.text = v.year.toString();
      _plateCtrl.text = v.plateNumber;
      _odometerCtrl.text = v.odometer.toString();
      _seatsCtrl.text = v.seatingCapacity.toString();
      _dailyRateCtrl.text = v.dailyRate.toStringAsFixed(0);
      _weeklyRateCtrl.text = v.weeklyRate > 0 ? v.weeklyRate.toStringAsFixed(0) : '';
      _monthlyRateCtrl.text = v.monthlyRate > 0 ? v.monthlyRate.toStringAsFixed(0) : '';
      _depositCtrl.text = v.depositAmount.toStringAsFixed(0);
      _allowedKmCtrl.text = v.allowedKmPerDay.toString();
      _extraKmCtrl.text = v.extraKmRate.toStringAsFixed(0);
      _vehicleType = v.vehicleType;
      _categoryId = v.categoryId;
      _locationId = v.locationId;
      _status = v.status;
      _transmission = v.transmission.isNotEmpty
          ? (v.transmission[0].toUpperCase() + v.transmission.substring(1))
          : 'Automatic';
      _fuelType = v.fuelType.isNotEmpty
          ? (v.fuelType[0].toUpperCase() + v.fuelType.substring(1))
          : 'Petrol';
      _primaryImage = v.primaryPhoto ?? '';
      _vehicleImages = List.from(v.photos);
      if (_primaryImage.isNotEmpty && !_vehicleImages.contains(_primaryImage)) {
        _vehicleImages.insert(0, _primaryImage);
      }
      if (v.notes != null) _notesCtrl.text = v.notes!;
      if (v.specs != null) {
        if (v.specs!['vin'] != null) _vinCtrl.text = v.specs!['vin'].toString();
        if (v.specs!['color'] != null) _colorCtrl.text = v.specs!['color'].toString();
        if (v.specs!['engine_capacity'] != null) _engineCapacityCtrl.text = v.specs!['engine_capacity'].toString();
        if (v.specs!['features'] is List) {
          _selectedFeatures.addAll(List<String>.from(v.specs!['features']));
        }
      }
    } else {
      // Initialize with default #1 • Bluebook (Registration) matching web screenshot
      _docEntries.add(
        VehicleDocEntry(
          docType: 'bluebook',
          name: 'Bluebook (Vehicle Registration)',
          badge: 'BLUEBOOK',
          icon: '📘',
          expiryDate: DateTime.now().add(const Duration(days: 365)),
        ),
      );
    }

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final fleet = context.read<FleetProvider>();
      await fleet.loadCategories();
      await fleet.loadLocations();
      if (_categoryId == null && fleet.categories.isNotEmpty) {
        setState(() => _categoryId = fleet.categories.first.id);
      }
      if (_locationId == null && fleet.locations.isNotEmpty) {
        setState(() => _locationId = fleet.locations.first.id);
      }

      if (v != null) {
        final docs = await fleet.getVehicleDocuments(v.id);
        if (mounted && docs.isNotEmpty) {
          setState(() {
            _docEntries.clear();
            for (final d in docs) {
              final preset = _docClassifications.firstWhere(
                (c) => c['key'] == d.docType,
                orElse: () => {
                  'key': d.docType,
                  'name': d.name,
                  'badge': d.docType.toUpperCase(),
                  'icon': '📄',
                },
              );
              _docEntries.add(
                VehicleDocEntry(
                  id: d.id,
                  docType: d.docType,
                  name: d.name,
                  badge: preset['badge'] ?? d.docType.toUpperCase(),
                  icon: preset['icon'] ?? '📄',
                  initialNumber: d.documentNumber,
                  expiryDate: d.expiryDate,
                  issueDate: d.issueDate,
                  scanPages: d.fileUrl.isNotEmpty ? [d.fileUrl] : [],
                ),
              );
            }
          });
        }
      }
    });
  }

  @override
  void dispose() {
    _makeCtrl.dispose();
    _modelCtrl.dispose();
    _yearCtrl.dispose();
    _plateCtrl.dispose();
    _vinCtrl.dispose();
    _colorCtrl.dispose();
    _odometerCtrl.dispose();
    _engineCapacityCtrl.dispose();
    _seatsCtrl.dispose();
    _dailyRateCtrl.dispose();
    _weeklyRateCtrl.dispose();
    _monthlyRateCtrl.dispose();
    _depositCtrl.dispose();
    _allowedKmCtrl.dispose();
    _extraKmCtrl.dispose();
    _notesCtrl.dispose();
    for (final doc in _docEntries) {
      doc.dispose();
    }
    super.dispose();
  }

  // Bottom Sheet Handlers
  void _openSelectVehicleTypeSheet() {
    SelectVehicleTypeSheet.show(
      context,
      selectedKey: _vehicleType,
      vehicleTypes: _vehicleTypes,
      onSelected: (key) => setState(() => _vehicleType = key),
      onAddNew: () {
        AddVehicleTypeSheet.show(
          context,
          onSave: (name, key, icon, desc) async {
            setState(() {
              if (!_vehicleTypes.any((x) => x['key'] == key)) {
                _vehicleTypes.add({'key': key, 'name': name, 'icon': icon});
              }
              _vehicleType = key;
            });
            AppFeedback.showToast(context, message: 'Type "$name" created', type: ToastType.success);
          },
        );
      },
    );
  }

  void _openSelectCategorySheet() {
    final fleet = context.read<FleetProvider>();
    SelectCategorySheet.show(
      context,
      selectedId: _categoryId,
      categories: fleet.categories,
      onSelected: (cat) {
        setState(() {
          _categoryId = cat.id;
          if (cat.defaultDailyRate > 0) {
            _dailyRateCtrl.text = cat.defaultDailyRate.toStringAsFixed(0);
            _depositCtrl.text = cat.defaultDeposit.toStringAsFixed(0);
          }
        });
      },
      onAddNew: () {
        AddVehicleCategorySheet.show(
          context,
          vehicleTypes: _vehicleTypes,
          onSave: (cat) async {
            final saved = await context.read<FleetProvider>().saveCategory(cat);
            setState(() {
              _categoryId = saved.id;
              _dailyRateCtrl.text = saved.defaultDailyRate.toStringAsFixed(0);
              _depositCtrl.text = saved.defaultDeposit.toStringAsFixed(0);
            });
            if (mounted) {
              AppFeedback.showToast(context, message: 'Category "${saved.name}" created', type: ToastType.success);
            }
          },
        );
      },
    );
  }

  void _openSelectLocationSheet() {
    final fleet = context.read<FleetProvider>();
    SelectLocationSheet.show(
      context,
      selectedId: _locationId,
      locations: fleet.locations,
      onSelected: (loc) => setState(() => _locationId = loc.id),
      onAddNew: () {
        AddVehicleLocationSheet.show(
          context,
          onSave: (loc) async {
            final saved = await context.read<FleetProvider>().saveLocation(loc);
            setState(() => _locationId = saved.id);
            if (mounted) {
              AppFeedback.showToast(context, message: 'Station "${saved.name}" registered', type: ToastType.success);
            }
          },
        );
      },
    );
  }

  void _openAddCustomFeatureSheet() {
    AddCustomFeatureSheet.show(
      context,
      onAdd: (feat) {
        if (!_selectedFeatures.contains(feat)) {
          setState(() => _selectedFeatures.add(feat));
          AppFeedback.showToast(context, message: 'Feature "$feat" added', type: ToastType.success);
        }
      },
    );
  }

  Future<void> _pickVehicleImage(ImageSource source) async {
    try {
      if (source == ImageSource.gallery) {
        final pickedList = await _imagePicker.pickMultiImage();
        if (pickedList.isNotEmpty) {
          setState(() {
            for (final img in pickedList) {
              if (!_vehicleImages.contains(img.path)) {
                _vehicleImages.add(img.path);
              }
            }
            if (_primaryImage.isEmpty && _vehicleImages.isNotEmpty) {
              _primaryImage = _vehicleImages.first;
            }
          });
          if (mounted) {
            AppFeedback.showToast(
              context,
              message: '${pickedList.length} photos selected from gallery',
              type: ToastType.success,
            );
          }
          return;
        }
      } else {
        final photo = await _imagePicker.pickImage(source: source);
        if (photo != null) {
          setState(() {
            if (!_vehicleImages.contains(photo.path)) {
              _vehicleImages.add(photo.path);
            }
            if (_primaryImage.isEmpty) {
              _primaryImage = photo.path;
            }
          });
          if (mounted) {
            AppFeedback.showToast(context, message: 'Photo captured from camera', type: ToastType.success);
          }
        }
      }
    } catch (e) {
      if (mounted) {
        AppFeedback.showToast(context, message: 'Could not access picker: $e', type: ToastType.error);
      }
    }
  }

  void _showPhotoSourceOptions() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
                'Add Vehicle Photos',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: isDark ? AppColors.darkText : AppColors.lightText,
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: AppColors.primary),
                ),
                title: const Text('Choose from Gallery'),
                subtitle: const Text('Select one or multiple photos from device'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickVehicleImage(ImageSource.gallery);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF16A34A)),
                ),
                title: const Text('Take with Camera'),
                subtitle: const Text('Capture photo directly with camera'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickVehicleImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDF4FF),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.link_rounded, color: Color(0xFFA855F7)),
                ),
                title: const Text('Enter Image URL'),
                subtitle: const Text('Paste direct image link or web address'),
                onTap: () {
                  Navigator.pop(ctx);
                  _promptAddPhotoUrl();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _promptAddPhotoUrl() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Vehicle Photo URL', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            hintText: 'https://...',
            prefixIcon: Icon(Icons.link_rounded),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final text = ctrl.text.trim();
              if (text.isNotEmpty) {
                setState(() {
                  _vehicleImages.add(text);
                  if (_primaryImage.isEmpty) _primaryImage = text;
                });
                Navigator.pop(ctx);
                AppFeedback.showToast(context, message: 'Photo added', type: ToastType.success);
              }
            },
            child: const Text('Add Photo'),
          ),
        ],
      ),
    );
  }

  void _addAnotherDocument() {
    final count = _docEntries.length;
    Map<String, String> preset;
    if (count == 0) {
      preset = _docClassifications[0];
    } else if (count == 1) {
      preset = _docClassifications[1];
    } else if (count == 2) {
      preset = _docClassifications[2];
    } else if (count == 3) {
      preset = _docClassifications[3];
    } else {
      preset = _docClassifications[count % _docClassifications.length];
    }

    setState(() {
      _docEntries.add(
        VehicleDocEntry(
          docType: preset['key']!,
          name: preset['name']!,
          badge: preset['badge']!,
          icon: preset['icon']!,
          expiryDate: DateTime.now().add(const Duration(days: 365)),
        ),
      );
    });
  }

  String _getNextDocumentButtonLabel() {
    final count = _docEntries.length;
    if (count == 0) return 'Add Document (Bluebook Registration)';
    if (count == 1) return 'Add Another Document (Insurance Policy)';
    if (count == 2) return 'Add Another Document (Road Tax Token)';
    if (count == 3) return 'Add Another Document (Pollution Certificate)';
    return 'Add Another Document';
  }

  void _openChangeClassificationSheet(VehicleDocEntry doc) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return Material(
          color: isDark ? AppColors.darkSurface : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(top: 6, bottom: 12),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white24 : Colors.black12,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Text(
                    'Select Document Classification',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: isDark ? AppColors.darkText : AppColors.lightText,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ..._docClassifications.map((item) {
                    final isSel = item['key'] == doc.docType;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Text(item['icon']!, style: const TextStyle(fontSize: 20)),
                      title: Text(
                        item['name']!,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                          color: isSel ? AppColors.primary : (isDark ? AppColors.darkText : AppColors.lightText),
                        ),
                      ),
                      trailing: isSel ? const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20) : null,
                      onTap: () {
                        setState(() {
                          doc.docType = item['key']!;
                          doc.name = item['name']!;
                          doc.badge = item['badge']!;
                          doc.icon = item['icon']!;
                        });
                        Navigator.of(ctx).pop();
                      },
                    );
                  }),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _submitVehicle() async {
    if (_makeCtrl.text.trim().isEmpty || _modelCtrl.text.trim().isEmpty || _plateCtrl.text.trim().isEmpty) {
      AppFeedback.showToast(context, message: 'Please enter make, model, and license plate number', type: ToastType.error);
      return;
    }

    final fleet = context.read<FleetProvider>();
    final matchedCat = fleet.categories.where((c) => c.id == _categoryId).firstOrNull;
    final matchedLoc = fleet.locations.where((l) => l.id == _locationId).firstOrNull;

    final resolvedCatId = _categoryId ?? (fleet.categories.isNotEmpty ? fleet.categories.first.id : null);
    final resolvedLocId = _locationId ?? (fleet.locations.isNotEmpty ? fleet.locations.first.id : null);

    final payload = <String, dynamic>{
      if (resolvedCatId != null && !resolvedCatId.startsWith('cat-local')) 'category_id': resolvedCatId,
      if (resolvedLocId != null && !resolvedLocId.startsWith('loc-')) 'location_id': resolvedLocId,
      'make': _makeCtrl.text.trim(),
      'model': _modelCtrl.text.trim(),
      'year': int.tryParse(_yearCtrl.text.trim()) ?? 2024,
      'plate_number': _plateCtrl.text.trim().toUpperCase(),
      'vehicle_type': _vehicleType,
      'status': _status,
      'odometer': int.tryParse(_odometerCtrl.text.trim()) ?? 12000,
      'fuel_type': _fuelType.toLowerCase(),
      'transmission': _transmission.toLowerCase(),
      'seating_capacity': int.tryParse(_seatsCtrl.text.trim()) ?? 5,
      'daily_rate': double.tryParse(_dailyRateCtrl.text.trim()) ?? 4500.0,
      'weekly_rate': double.tryParse(_weeklyRateCtrl.text.trim()) ?? 0.0,
      'monthly_rate': double.tryParse(_monthlyRateCtrl.text.trim()) ?? 0.0,
      'deposit_amount': double.tryParse(_depositCtrl.text.trim()) ?? 10000.0,
      'allowed_km_per_day': int.tryParse(_allowedKmCtrl.text.trim()) ?? 250,
      'extra_km_rate': double.tryParse(_extraKmCtrl.text.trim()) ?? 25.0,
      'primary_image': _primaryImage.isNotEmpty ? _primaryImage : (_vehicleImages.isNotEmpty ? _vehicleImages.first : ''),
      'specs': {
        if (_vinCtrl.text.trim().isNotEmpty) 'vin': _vinCtrl.text.trim(),
        if (_colorCtrl.text.trim().isNotEmpty) 'color': _colorCtrl.text.trim(),
        if (_engineCapacityCtrl.text.trim().isNotEmpty) 'engine_capacity': _engineCapacityCtrl.text.trim(),
        'features': _selectedFeatures,
        'category_name': matchedCat?.name ?? '',
        'location_name': matchedLoc?.name ?? '',
      },
      'notes': _notesCtrl.text.trim(),
    };

    setState(() => _isSaving = true);
    try {
      final saved = await fleet.saveVehicle(payload, id: widget.vehicle?.id);

      if (_docEntries.isNotEmpty) {
        for (final doc in _docEntries) {
          final toSave = VehicleDocument(
            id: doc.id ?? '',
            vehicleId: saved.id,
            vehiclePlate: saved.plateNumber,
            vehicleName: '${saved.make} ${saved.model}',
            docType: doc.docType,
            name: doc.name,
            documentNumber: doc.numberCtrl.text.trim(),
            issuingAuthority: 'Department of Transport Management',
            fileUrl: doc.scanPages.isNotEmpty ? doc.scanPages.first : 'https://storage.rental.app/docs/${doc.docType}.pdf',
            issueDate: doc.issueDate,
            expiryDate: doc.expiryDate,
            status: doc.expiryDate != null && doc.expiryDate!.isBefore(DateTime.now())
                ? 'expired'
                : 'valid',
            verificationStatus: 'verified',
            notes: 'Onboarded via Fleet Asset Registration',
          );
          await fleet.saveVehicleDocument(toSave, isEditing: doc.id != null && doc.id!.isNotEmpty);
        }
      }

      await fleet.loadVehicles();
      await fleet.loadAllDocuments(forceRefresh: true);

      if (mounted) {
        Navigator.of(context).pop();
        AppFeedback.showToast(
          context,
          message: widget.vehicle == null ? 'Vehicle added to fleet successfully!' : 'Vehicle updated!',
          type: ToastType.success,
        );
      }
    } catch (e) {
      setState(() => _isSaving = false);
      if (mounted) {
        AppFeedback.showToast(context, message: 'Saved: ${e.toString().replaceFirst("ApiException: ", "")}', type: ToastType.warning);
        Navigator.of(context).pop();
      }
    }
  }

  Future<void> _pickDocumentScan(VehicleDocEntry doc, ImageSource source) async {
    try {
      final scan = await _imagePicker.pickImage(source: source);
      if (scan != null) {
        setState(() {
          doc.scanPages.add(scan.path);
        });
        if (mounted) {
          AppFeedback.showToast(
            context,
            message: 'Scan attached to ${doc.name}',
            type: ToastType.success,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        AppFeedback.showToast(context, message: 'Could not access picker: $e', type: ToastType.error);
      }
    }
  }

  void _showDocumentAttachmentOptions(VehicleDocEntry doc) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
                'Attach Document Scan (${doc.name})',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: isDark ? AppColors.darkText : AppColors.lightText,
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: AppColors.primary),
                ),
                title: const Text('Choose from Gallery'),
                subtitle: const Text('Select certificate photo from device gallery'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickDocumentScan(doc, ImageSource.gallery);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF16A34A)),
                ),
                title: const Text('Take with Camera'),
                subtitle: const Text('Snap a photo of the document'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickDocumentScan(doc, ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.document_scanner_outlined, color: Color(0xFFD97706)),
                ),
                title: const Text('Attach Official Scan / PDF'),
                subtitle: const Text('Attach high-resolution digital certificate copy'),
                onTap: () {
                  Navigator.pop(ctx);
                  setState(() {
                    doc.scanPages.add('https://storage.rental.app/docs/${doc.docType}_scan_${doc.scanPages.length + 1}.pdf');
                  });
                  AppFeedback.showToast(context, message: 'Scan attached to ${doc.name}', type: ToastType.success);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDF4FF),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.link_rounded, color: Color(0xFFA855F7)),
                ),
                title: const Text('Enter Public URL'),
                subtitle: const Text('Provide direct link to cloud file or image'),
                onTap: () {
                  Navigator.pop(ctx);
                  _promptDocumentUrl(doc);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _promptDocumentUrl(VehicleDocEntry doc) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Enter Document URL', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            hintText: 'https://...',
            prefixIcon: Icon(Icons.link),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final text = ctrl.text.trim();
              if (text.isNotEmpty) {
                setState(() => doc.scanPages.add(text));
                Navigator.pop(ctx);
                AppFeedback.showToast(context, message: 'URL attached', type: ToastType.success);
              }
            },
            child: const Text('Attach'),
          ),
        ],
      ),
    );
  }

  // Section Header (No background card div)
  Widget _buildSectionHeader({
    required String title,
    required IconData icon,
    required bool isDark,
    Widget? trailingAction,
  }) {
    final hardGray = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 12),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: hardGray,
              borderRadius: AppRadius.sm,
            ),
            child: Icon(icon, color: AppColors.primary, size: 16),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: isDark ? AppColors.darkText : AppColors.lightText,
              ),
            ),
          ),
          if (trailingAction != null) ...[
            const SizedBox(width: 8),
            trailingAction,
          ],
        ],
      ),
    );
  }

  Widget _buildSelectableField({
    required String label,
    required String value,
    required String placeholder,
    required VoidCallback onTap,
    required bool isDark,
    Widget? leading,
  }) {
    final hasValue = value.isNotEmpty;
    final inputBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.4,
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 6),
        InkWell(
          borderRadius: AppRadius.md,
          onTap: onTap,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: inputBg,
              borderRadius: AppRadius.md,
            ),
            child: Row(
              children: [
                if (leading != null) ...[
                  leading,
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    hasValue ? value : placeholder,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: hasValue ? FontWeight.w600 : FontWeight.normal,
                      color: hasValue
                          ? (isDark ? AppColors.darkText : AppColors.lightText)
                          : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                    ),
                  ),
                ),
                Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required String hint,
    required bool isDark,
    TextInputType keyboardType = TextInputType.text,
    TextCapitalization textCapitalization = TextCapitalization.none,
    String? prefixText,
    String? suffixText,
    int maxLines = 1,
  }) {
    final inputBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.4,
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          maxLines: maxLines,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.darkText : AppColors.lightText,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.normal,
              color: (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary).withOpacity(0.7),
            ),
            prefixText: prefixText,
            prefixStyle: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.darkText : AppColors.lightText,
            ),
            suffixText: suffixText,
            suffixStyle: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
            filled: true,
            fillColor: inputBg,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            border: OutlineInputBorder(borderRadius: AppRadius.md, borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: AppRadius.md, borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(borderRadius: AppRadius.md, borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
          ),
        ),
      ],
    );
  }

  Widget _buildSegmentedPills({
    required String label,
    required List<String> options,
    required String selected,
    required ValueChanged<String> onSelected,
    required bool isDark,
  }) {
    final inputBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.4,
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: inputBg,
            borderRadius: AppRadius.md,
          ),
          child: Row(
            children: options.map((opt) {
              final isCurrent = opt.toLowerCase() == selected.toLowerCase();
              return Expanded(
                child: GestureDetector(
                  onTap: () => onSelected(opt),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isCurrent ? AppColors.primary : Colors.transparent,
                      borderRadius: AppRadius.sm,
                    ),
                    child: Text(
                      opt,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                        color: isCurrent
                            ? Colors.white
                            : (isDark ? AppColors.darkText : AppColors.lightText),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildSafeThumbnail(String rawUrl, {double? width, double? height}) {
    final clean = rawUrl.trim();
    if (clean.isEmpty) {
      return Container(
        width: width,
        height: height,
        color: const Color(0xFFF1F5F9),
        child: const Center(
          child: Icon(Icons.image_not_supported_outlined, color: Color(0xFF94A3B8), size: 22),
        ),
      );
    }

    if (clean.toLowerCase().endsWith('.pdf')) {
      return Container(
        width: width,
        height: height,
        color: const Color(0xFFFEF2F2),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFDC2626), size: 24),
              SizedBox(height: 2),
              Text(
                'PDF Scan',
                style: TextStyle(color: Color(0xFFDC2626), fontSize: 8, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      );
    }

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      final file = File(clean);
      if (file.existsSync()) {
        return Image.file(
          file,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return Container(
              width: width,
              height: height,
              color: const Color(0xFFF1F5F9),
              child: const Center(
                child: Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8), size: 22),
              ),
            );
          },
        );
      }
      return Container(
        width: width,
        height: height,
        color: const Color(0xFFF1F5F9),
        child: const Center(
          child: Icon(Icons.insert_drive_file_outlined, color: Color(0xFF94A3B8), size: 22),
        ),
      );
    }

    return Image.network(
      clean,
      width: width,
      height: height,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) {
        return Container(
          width: width,
          height: height,
          color: const Color(0xFFF1F5F9),
          child: const Center(
            child: Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8), size: 22),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hardGray = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final inputBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
    final isEditing = widget.vehicle != null;
    final fleet = context.watch<FleetProvider>();

    final currentCat = fleet.categories.where((c) => c.id == _categoryId).firstOrNull;
    final currentLoc = fleet.locations.where((l) => l.id == _locationId).firstOrNull;
    final currentTypeObj = _vehicleTypes.where((t) => t['key'] == _vehicleType).firstOrNull;

    final typeDisplay = currentTypeObj != null
        ? '${currentTypeObj['icon']} ${currentTypeObj['name']}'
        : _vehicleType.toUpperCase();

    final catDisplay = currentCat != null
        ? '${currentCat.name} (Rs. ${currentCat.defaultDailyRate.toStringAsFixed(0)}/day)'
        : '';

    final locDisplay = currentLoc != null
        ? '${currentLoc.code} • ${currentLoc.name}'
        : '';

    return AppScaffold(
      appBar: AppHeader(
        title: isEditing ? 'Edit Vehicle Asset' : 'Add Vehicle to Fleet',
        showBackButton: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Vehicle Specifications
            _buildSectionHeader(
              title: 'Vehicle Specifications',
              icon: Icons.directions_car_rounded,
              isDark: isDark,
            ),

            _buildSelectableField(
              label: 'Vehicle Type *',
              value: typeDisplay,
              placeholder: 'Select vehicle type',
              onTap: _openSelectVehicleTypeSheet,
              isDark: isDark,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildSelectableField(
              label: 'Category *',
              value: catDisplay,
              placeholder: 'Select category',
              onTap: _openSelectCategorySheet,
              isDark: isDark,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Make / Manufacturer *',
              controller: _makeCtrl,
              hint: 'e.g. Mahindra, Toyota, Hyundai',
              isDark: isDark,
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Model *',
              controller: _modelCtrl,
              hint: 'e.g. Scorpio Classic, Hilux',
              isDark: isDark,
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Model Year *',
              controller: _yearCtrl,
              hint: '2024',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'License Plate Number *',
              controller: _plateCtrl,
              hint: 'e.g. BA 2 CHA 4492',
              isDark: isDark,
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'VIN or Chassis Number (Optional)',
              controller: _vinCtrl,
              hint: '17-character VIN code',
              isDark: isDark,
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Exterior Color (Optional)',
              controller: _colorCtrl,
              hint: 'e.g. Pearl White, Silver, Black',
              isDark: isDark,
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Current Odometer (km) *',
              controller: _odometerCtrl,
              hint: '12000',
              suffixText: 'km',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildSegmentedPills(
              label: 'Transmission',
              options: const ['Automatic', 'Manual'],
              selected: _transmission,
              onSelected: (v) => setState(() => _transmission = v),
              isDark: isDark,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildSegmentedPills(
              label: 'Fuel / Powertrain',
              options: const ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
              selected: _fuelType,
              onSelected: (v) => setState(() => _fuelType = v),
              isDark: isDark,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Engine Capacity (CC) (Optional)',
              controller: _engineCapacityCtrl,
              hint: 'e.g. 2184',
              suffixText: 'cc',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Seating Capacity *',
              controller: _seatsCtrl,
              hint: '5',
              suffixText: 'Seats',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),

            // 2. Installed Amenities & Features
            _buildSectionHeader(
              title: 'Installed Amenities & Features',
              icon: Icons.stars_rounded,
              trailingAction: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _selectedFeatures.isNotEmpty ? AppColors.primary.withOpacity(0.12) : hardGray,
                  borderRadius: AppRadius.sm,
                ),
                child: Text(
                  '${_selectedFeatures.length} Selected',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: _selectedFeatures.isNotEmpty ? AppColors.primary : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                  ),
                ),
              ),
              isDark: isDark,
            ),

            if (_selectedFeatures.isNotEmpty) ...[
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _selectedFeatures.map((feat) {
                  return GestureDetector(
                    onTap: () => setState(() => _selectedFeatures.remove(feat)),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: AppRadius.md,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.check_rounded, color: Colors.white, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            feat,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.close_rounded, color: Colors.white70, size: 12),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: _popularSuggestions.map((tag) {
                final isSelected = _selectedFeatures.contains(tag);
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      if (isSelected) {
                        _selectedFeatures.remove(tag);
                      } else {
                        _selectedFeatures.add(tag);
                      }
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : inputBg,
                      borderRadius: AppRadius.md,
                    ),
                    child: Text(
                      isSelected ? '✓ $tag' : '+ $tag',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                        color: isSelected
                            ? Colors.white
                            : (isDark ? AppColors.darkText : AppColors.lightText),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.sm),

            SizedBox(
              width: double.infinity,
              child: SecondaryButton(
                label: 'Add Custom Feature',
                icon: Icons.add_rounded,
                onPressed: _openAddCustomFeatureSheet,
              ),
            ),

            // 3. Rental Rates & Security Deposit
            _buildSectionHeader(
              title: 'Rental Rates & Security Deposit (NPR)',
              icon: Icons.payments_rounded,
              isDark: isDark,
            ),

            _buildInputField(
              label: 'Daily Rate (Rs.) *',
              controller: _dailyRateCtrl,
              hint: '4500',
              prefixText: 'Rs. ',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Weekly Rate (Rs.) (Optional)',
              controller: _weeklyRateCtrl,
              hint: '28000',
              prefixText: 'Rs. ',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Monthly Rate (Rs.) (Optional)',
              controller: _monthlyRateCtrl,
              hint: '95000',
              prefixText: 'Rs. ',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Security Deposit (Rs.) (Optional)',
              controller: _depositCtrl,
              hint: '10000',
              prefixText: 'Rs. ',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Allowed Distance Per Day (Optional)',
              controller: _allowedKmCtrl,
              hint: '250',
              suffixText: 'km / day',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Extra Distance Fee (Optional)',
              controller: _extraKmCtrl,
              hint: '25',
              prefixText: 'Rs. ',
              suffixText: '/ km',
              isDark: isDark,
              keyboardType: TextInputType.number,
            ),

            // 4. Assigned Location & Guidelines
            _buildSectionHeader(
              title: 'Assigned Location & Guidelines',
              icon: Icons.storefront_rounded,
              isDark: isDark,
            ),

            _buildSelectableField(
              label: 'Assigned Location *',
              value: locDisplay,
              placeholder: 'Select location',
              onTap: _openSelectLocationSheet,
              isDark: isDark,
            ),
            const SizedBox(height: AppSpacing.sm),

            _buildInputField(
              label: 'Internal Notes & Guidelines (Optional)',
              controller: _notesCtrl,
              hint: 'Spare keys stored in Locker B, inspection notes, etc.',
              isDark: isDark,
              maxLines: 3,
            ),

            // 5. Vehicle Photos
            _buildSectionHeader(
              title: 'Vehicle Photos',
              icon: Icons.photo_library_rounded,
              trailingAction: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _vehicleImages.isNotEmpty ? AppColors.primary.withOpacity(0.12) : hardGray,
                  borderRadius: AppRadius.sm,
                ),
                child: Text(
                  '${_vehicleImages.length} Photos',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: _vehicleImages.isNotEmpty ? AppColors.primary : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                  ),
                ),
              ),
              isDark: isDark,
            ),

            InkWell(
              onTap: _showPhotoSourceOptions,
              borderRadius: AppRadius.md,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 18),
                decoration: BoxDecoration(
                  color: inputBg,
                  borderRadius: AppRadius.md,
                ),
                child: Column(
                  children: [
                    const Icon(Icons.cloud_upload_rounded, size: 28, color: AppColors.primary),
                    const SizedBox(height: 4),
                    Text(
                      'Upload Photos',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: isDark ? AppColors.darkText : AppColors.lightText,
                      ),
                    ),
                    Text(
                      'Choose from Gallery, snap with Camera, or enter URL',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (_vehicleImages.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                height: 80,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _vehicleImages.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, idx) {
                    final img = _vehicleImages[idx];
                    final isPrimary = img == _primaryImage;
                    return SizedBox(
                      width: 100,
                      height: 80,
                      child: ClipRRect(
                        borderRadius: AppRadius.md,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            _buildSafeThumbnail(img, width: 100, height: 80),
                            if (isPrimary)
                              Positioned(
                                top: 4,
                                left: 4,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                  decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(4)),
                                  child: const Text('MAIN', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],

            // 5. Vehicle Documents & Fleet Compliance (Matching web screenshot)
            _buildSectionHeader(
              title: '5. Vehicle Documents & Fleet Compliance',
              icon: Icons.assignment_rounded,
              trailingAction: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_docEntries.length} Document${_docEntries.length == 1 ? '' : 's'}',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF15803D),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: _addAnotherDocument,
                    icon: const Icon(Icons.add_rounded, size: 14),
                    label: const Text('Add Document', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
              isDark: isDark,
            ),

            // Inline Editable Document Cards
            ..._docEntries.asMap().entries.map((entry) {
              final idx = entry.key;
              final doc = entry.value;

              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Card Header with Icon, Name, Badge, and Remove
                    Row(
                      children: [
                        const Icon(Icons.article_outlined, size: 18, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 6,
                            children: [
                              Text(
                                '#${idx + 1} • ${doc.name.split('(').first.trim()}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: isDark ? AppColors.darkText : AppColors.lightText,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE0F2FE),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  doc.badge,
                                  style: const TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0284C7),
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        InkWell(
                          onTap: () {
                            setState(() {
                              _docEntries[idx].dispose();
                              _docEntries.removeAt(idx);
                            });
                          },
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.delete_outline_rounded, size: 15, color: Color(0xFFEF4444)),
                              SizedBox(width: 3),
                              Text(
                                'Remove',
                                style: TextStyle(
                                  color: Color(0xFFEF4444),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // 1. Classification Dropdown
                    Text(
                      'Classification *',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    InkWell(
                      onTap: () => _openChangeClassificationSheet(doc),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Text(doc.icon, style: const TextStyle(fontSize: 14)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                doc.name,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.darkText : AppColors.lightText,
                                ),
                              ),
                            ),
                            Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // 2. Expiry Date & Issue Date Row
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Expiry Date *',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              InkWell(
                                onTap: () async {
                                  final picked = await showDatePicker(
                                    context: context,
                                    initialDate: doc.expiryDate ?? DateTime.now().add(const Duration(days: 365)),
                                    firstDate: DateTime(2000),
                                    lastDate: DateTime(2040),
                                  );
                                  if (picked != null) setState(() => doc.expiryDate = picked);
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        doc.expiryDate != null ? DateFormat('yyyy-MM-dd').format(doc.expiryDate!) : 'YYYY-MM-DD',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: doc.expiryDate != null ? FontWeight.w600 : FontWeight.normal,
                                          color: doc.expiryDate != null
                                              ? (isDark ? AppColors.darkText : AppColors.lightText)
                                              : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                                        ),
                                      ),
                                      Icon(Icons.calendar_today_outlined, size: 14, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Issue Date (Optional)',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              InkWell(
                                onTap: () async {
                                  final picked = await showDatePicker(
                                    context: context,
                                    initialDate: doc.issueDate ?? DateTime.now(),
                                    firstDate: DateTime(2000),
                                    lastDate: DateTime(2040),
                                  );
                                  if (picked != null) setState(() => doc.issueDate = picked);
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        doc.issueDate != null ? DateFormat('yyyy-MM-dd').format(doc.issueDate!) : 'YYYY-MM-DD',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: doc.issueDate != null ? FontWeight.w600 : FontWeight.normal,
                                          color: doc.issueDate != null
                                              ? (isDark ? AppColors.darkText : AppColors.lightText)
                                              : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                                        ),
                                      ),
                                      Icon(Icons.calendar_today_outlined, size: 14, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // 3. Document / Policy #
                    Text(
                      'Document / Policy # (Optional)',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextFormField(
                      controller: doc.numberCtrl,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkText : AppColors.lightText,
                      ),
                      decoration: InputDecoration(
                        hintText: 'e.g. POL-9921/BB-442',
                        hintStyle: TextStyle(
                          fontSize: 12,
                          color: (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary).withOpacity(0.7),
                        ),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 4. Document Scans & Photos Sub-section
                    Row(
                      children: [
                        const Icon(Icons.photo_camera_outlined, size: 15, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          'Document Scans & Photos',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: isDark ? AppColors.darkText : AppColors.lightText,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '${doc.scanPages.length} Pages',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Dashed Upload Dropzone
                    InkWell(
                      onTap: () => _showDocumentAttachmentOptions(doc),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 14),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF0F172A).withOpacity(0.5) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              alignment: Alignment.center,
                              decoration: const BoxDecoration(
                                color: Color(0xFFE0F2FE),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.cloud_upload_outlined, size: 20, color: Color(0xFF0284C7)),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Click or drag ${doc.name.split('(').first.trim()} photos / PDF here',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Attached Scans & Pages Previews
                    if (doc.scanPages.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: doc.scanPages.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final pageUrl = entry.value;
                          final isPdf = pageUrl.toLowerCase().endsWith('.pdf');
                          return Stack(
                            children: [
                              Container(
                                width: 68,
                                height: 68,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                                  ),
                                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: isPdf
                                    ? const Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFDC2626), size: 26),
                                            SizedBox(height: 2),
                                            Text(
                                              'PDF',
                                              style: TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.bold,
                                                color: Color(0xFFDC2626),
                                              ),
                                            ),
                                          ],
                                        ),
                                      )
                                    : _buildSafeThumbnail(pageUrl, width: 68, height: 68),
                              ),
                              Positioned(
                                top: 2,
                                right: 2,
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      doc.scanPages.removeAt(idx);
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.all(2),
                                    decoration: const BoxDecoration(
                                      color: Colors.black87,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.close_rounded, size: 12, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              );
            }),

            // Dashed / Outlined Add Another Document Button
            InkWell(
              onTap: _addAnotherDocument,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: const Color(0xFF3B82F6),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_rounded, size: 16, color: Color(0xFF3B82F6)),
                    const SizedBox(width: 6),
                    Text(
                      _getNextDocumentButtonLabel(),
                      style: const TextStyle(
                        color: Color(0xFF3B82F6),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Submit Button
            PrimaryButton(
              label: _isSaving ? 'Registering Asset...' : (isEditing ? 'Update Vehicle' : 'Register Vehicle to Fleet'),
              icon: Icons.check_circle_rounded,
              onPressed: _isSaving ? null : _submitVehicle,
            ),
          ],
        ),
      ),
    );
  }
}
