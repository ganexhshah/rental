import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../models/vehicle_model.dart';
import '../buttons/app_buttons.dart';
import '../feedback/app_feedback.dart';

InputDecoration _sheetInputDecoration(String label, String hint, bool isDark, {String? prefixText}) {
  return InputDecoration(
    labelText: label,
    hintText: hint,
    prefixText: prefixText,
    prefixStyle: TextStyle(
      fontWeight: FontWeight.bold,
      color: isDark ? AppColors.darkText : AppColors.lightText,
    ),
    labelStyle: TextStyle(
      fontSize: 13,
      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
    ),
    filled: true,
    fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    border: OutlineInputBorder(
      borderRadius: AppRadius.md,
      borderSide: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: AppRadius.md,
      borderSide: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
    ),
    focusedBorder: const OutlineInputBorder(
      borderRadius: AppRadius.md,
      borderSide: BorderSide(color: AppColors.primary, width: 1.5),
    ),
  );
}

/// 1. Reusable Sheet to Add/Create a New Vehicle Type
class AddVehicleTypeSheet extends StatefulWidget {
  final Future<void> Function(String name, String key, String icon, String desc) onSave;

  const AddVehicleTypeSheet({super.key, required this.onSave});

  static Future<void> show(BuildContext context, {required Future<void> Function(String name, String key, String icon, String desc) onSave}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddVehicleTypeSheet(onSave: onSave),
    );
  }

  @override
  State<AddVehicleTypeSheet> createState() => _AddVehicleTypeSheetState();
}

class _AddVehicleTypeSheetState extends State<AddVehicleTypeSheet> {
  final _nameCtrl = TextEditingController();
  final _keyCtrl = TextEditingController();
  final _iconCtrl = TextEditingController(text: '🚗');
  final _descCtrl = TextEditingController();
  bool _isSaving = false;

  static const _quickEmojis = ['🚗', '🏍️', '🛵', '🚐', '🚙', '🚚', '🚲'];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _keyCtrl.dispose();
    _iconCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
          ),
          child: SingleChildScrollView(
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Add Vehicle Type',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 17,
                        color: isDark ? AppColors.darkText : AppColors.lightText,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),

                Text(
                  'Type Icon',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _quickEmojis.map((emoji) {
                      final isSelected = _iconCtrl.text == emoji;
                      return GestureDetector(
                        onTap: () => setState(() => _iconCtrl.text = emoji),
                        child: Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.primary.withOpacity(0.15)
                                : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                            borderRadius: AppRadius.md,
                            border: Border.all(
                              color: isSelected ? AppColors.primary : Colors.transparent,
                              width: 1.5,
                            ),
                          ),
                          child: Text(emoji, style: const TextStyle(fontSize: 22)),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: _nameCtrl,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Type Name *', 'e.g. Passenger Vans', isDark),
                  onChanged: (v) {
                    if (_keyCtrl.text.isEmpty || _keyCtrl.text == v.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-')) {
                      _keyCtrl.text = v.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-');
                    }
                  },
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: _descCtrl,
                  maxLines: 2,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Description (Optional)', 'e.g. Multi-seater transit vans and pickups', isDark),
                ),
                const SizedBox(height: AppSpacing.lg),

                PrimaryButton(
                  label: _isSaving ? 'Saving Type...' : 'Save Vehicle Type',
                  icon: Icons.check_circle_rounded,
                  onPressed: _isSaving
                      ? null
                      : () async {
                          if (_nameCtrl.text.trim().isEmpty) {
                            AppFeedback.showToast(context, message: 'Please enter type name', type: ToastType.error);
                            return;
                          }
                          setState(() => _isSaving = true);
                          try {
                            final key = _keyCtrl.text.trim().isNotEmpty
                                ? _keyCtrl.text.trim()
                                : _nameCtrl.text.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-');
                            await widget.onSave(_nameCtrl.text.trim(), key, _iconCtrl.text.trim(), _descCtrl.text.trim());
                            if (mounted) Navigator.of(context).pop();
                          } catch (e) {
                            setState(() => _isSaving = false);
                            if (mounted) {
                              AppFeedback.showToast(context, message: 'Saved: $e', type: ToastType.warning);
                              Navigator.of(context).pop();
                            }
                          }
                        },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 2. Reusable Sheet to Add/Create a New Vehicle Category
class AddVehicleCategorySheet extends StatefulWidget {
  final List<Map<String, dynamic>> vehicleTypes;
  final Future<void> Function(VehicleCategory category) onSave;

  const AddVehicleCategorySheet({
    super.key,
    required this.vehicleTypes,
    required this.onSave,
  });

  static Future<void> show(BuildContext context, {required List<Map<String, dynamic>> vehicleTypes, required Future<void> Function(VehicleCategory category) onSave}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddVehicleCategorySheet(vehicleTypes: vehicleTypes, onSave: onSave),
    );
  }

  @override
  State<AddVehicleCategorySheet> createState() => _AddVehicleCategorySheetState();
}

class _AddVehicleCategorySheetState extends State<AddVehicleCategorySheet> {
  final _nameCtrl = TextEditingController();
  final _rateCtrl = TextEditingController(text: '4500');
  final _depCtrl = TextEditingController(text: '10000');
  final _descCtrl = TextEditingController();
  String _selectedType = 'car';
  bool _isSaving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _rateCtrl.dispose();
    _depCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
          ),
          child: SingleChildScrollView(
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Add Vehicle Category',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 17,
                        color: isDark ? AppColors.darkText : AppColors.lightText,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: _nameCtrl,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Category Name *', 'e.g. Standard SUV / 4x4', isDark),
                ),
                const SizedBox(height: AppSpacing.sm),

                DropdownButtonFormField<String>(
                  value: widget.vehicleTypes.any((t) => t['key'] == _selectedType) ? _selectedType : 'car',
                  isExpanded: true,
                  dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText, fontSize: 14),
                  decoration: _sheetInputDecoration('Vehicle Type', 'Select vehicle type', isDark),
                  items: widget.vehicleTypes.map((t) {
                    return DropdownMenuItem<String>(
                      value: t['key'] as String,
                      child: Text('${t['icon']} ${t['name']}'),
                    );
                  }).toList(),
                  onChanged: (v) => setState(() => _selectedType = v ?? 'car'),
                ),
                const SizedBox(height: AppSpacing.sm),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _rateCtrl,
                        keyboardType: TextInputType.number,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                        decoration: _sheetInputDecoration('Daily Rate', '4500', isDark, prefixText: 'Rs. '),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: TextFormField(
                        controller: _depCtrl,
                        keyboardType: TextInputType.number,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                        decoration: _sheetInputDecoration('Security Deposit', '10000', isDark, prefixText: 'Rs. '),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: _descCtrl,
                  maxLines: 2,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Description (Optional)', 'Notes or classification details', isDark),
                ),
                const SizedBox(height: AppSpacing.lg),

                PrimaryButton(
                  label: _isSaving ? 'Saving Category...' : 'Save Category',
                  icon: Icons.check_circle_rounded,
                  onPressed: _isSaving
                      ? null
                      : () async {
                          if (_nameCtrl.text.trim().isEmpty) {
                            AppFeedback.showToast(context, message: 'Please enter category name', type: ToastType.error);
                            return;
                          }

                          final cat = VehicleCategory(
                            id: '',
                            name: _nameCtrl.text.trim(),
                            slug: _nameCtrl.text.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-'),
                            vehicleType: _selectedType,
                            defaultDailyRate: double.tryParse(_rateCtrl.text.trim()) ?? 4500,
                            defaultDeposit: double.tryParse(_depCtrl.text.trim()) ?? 10000,
                            description: _descCtrl.text.trim(),
                          );

                          setState(() => _isSaving = true);
                          try {
                            await widget.onSave(cat);
                            if (mounted) Navigator.of(context).pop();
                          } catch (e) {
                            setState(() => _isSaving = false);
                            if (mounted) {
                              AppFeedback.showToast(context, message: 'Saved: $e', type: ToastType.warning);
                              Navigator.of(context).pop();
                            }
                          }
                        },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 3. Reusable Sheet to Add/Create a New Station Location Hub
class AddVehicleLocationSheet extends StatefulWidget {
  final Future<void> Function(VehicleLocation location) onSave;

  const AddVehicleLocationSheet({super.key, required this.onSave});

  static Future<void> show(BuildContext context, {required Future<void> Function(VehicleLocation location) onSave}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddVehicleLocationSheet(onSave: onSave),
    );
  }

  @override
  State<AddVehicleLocationSheet> createState() => _AddVehicleLocationSheetState();
}

class _AddVehicleLocationSheetState extends State<AddVehicleLocationSheet> {
  final _nameCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _cityCtrl = TextEditingController(text: 'Kathmandu');
  final _addrCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController(text: '+977 ');
  bool _isActive = true;
  bool _isSaving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _codeCtrl.dispose();
    _cityCtrl.dispose();
    _addrCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
          ),
          child: SingleChildScrollView(
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Register Station Location',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 17,
                        color: isDark ? AppColors.darkText : AppColors.lightText,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: _nameCtrl,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Station Name *', 'e.g. Pokhara Lakeside Counter', isDark),
                  onChanged: (v) {
                    if (_codeCtrl.text.isEmpty && v.trim().length >= 3) {
                      _codeCtrl.text = '${v.trim().substring(0, 3).toUpperCase()}-01';
                    }
                  },
                ),
                const SizedBox(height: AppSpacing.sm),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _codeCtrl,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                        decoration: _sheetInputDecoration('Station Code *', 'e.g. PKR-01', isDark),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: TextFormField(
                        controller: _cityCtrl,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                        decoration: _sheetInputDecoration('City *', 'e.g. Pokhara', isDark),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: _addrCtrl,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Full Street Address', 'Street, landmark or airport counter', isDark),
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Station Contact Phone', '+977 1-44XXXXX', isDark),
                ),
                const SizedBox(height: AppSpacing.sm),

                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    'Active Dispatch Hub',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.darkText : AppColors.lightText,
                    ),
                  ),
                  value: _isActive,
                  activeColor: AppColors.primary,
                  onChanged: (val) => setState(() => _isActive = val),
                ),
                const SizedBox(height: AppSpacing.lg),

                PrimaryButton(
                  label: _isSaving ? 'Saving Station...' : 'Save Station Hub',
                  icon: Icons.check_circle_rounded,
                  onPressed: _isSaving
                      ? null
                      : () async {
                          if (_nameCtrl.text.trim().isEmpty || _codeCtrl.text.trim().isEmpty) {
                            AppFeedback.showToast(context, message: 'Please enter station name and code', type: ToastType.error);
                            return;
                          }

                          final loc = VehicleLocation(
                            id: '',
                            name: _nameCtrl.text.trim(),
                            code: _codeCtrl.text.trim().toUpperCase(),
                            city: _cityCtrl.text.trim(),
                            address: _addrCtrl.text.trim(),
                            phone: _phoneCtrl.text.trim(),
                            isActive: _isActive,
                            activeVehiclesCount: 0,
                          );

                          setState(() => _isSaving = true);
                          try {
                            await widget.onSave(loc);
                            if (mounted) Navigator.of(context).pop();
                          } catch (e) {
                            setState(() => _isSaving = false);
                            if (mounted) {
                              AppFeedback.showToast(context, message: 'Saved: $e', type: ToastType.warning);
                              Navigator.of(context).pop();
                            }
                          }
                        },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 4. Reusable Sheet to Add Vehicle Compliance Document inline
class AddVehicleDocumentInlineSheet extends StatefulWidget {
  final Future<void> Function(VehicleDocument document) onSave;

  const AddVehicleDocumentInlineSheet({super.key, required this.onSave});

  static Future<void> show(BuildContext context, {required Future<void> Function(VehicleDocument document) onSave}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddVehicleDocumentInlineSheet(onSave: onSave),
    );
  }

  @override
  State<AddVehicleDocumentInlineSheet> createState() => _AddVehicleDocumentInlineSheetState();
}

class _AddVehicleDocumentInlineSheetState extends State<AddVehicleDocumentInlineSheet> {
  final _nameCtrl = TextEditingController();
  final _docNumCtrl = TextEditingController();
  final _authorityCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String _docType = 'bluebook';
  DateTime _expiry = DateTime.now().add(const Duration(days: 365));
  bool _isSaving = false;

  static const _docOptions = [
    {'key': 'bluebook', 'label': 'Bluebook (Vehicle Registration)'},
    {'key': 'insurance', 'label': 'Comprehensive Insurance Policy'},
    {'key': 'road_tax', 'label': 'Annual Road Tax Token'},
    {'key': 'pollution', 'label': 'Green Pollution / Emission Token'},
    {'key': 'fitness', 'label': 'Fitness & Roadworthiness Certificate'},
    {'key': 'permit', 'label': 'Route Permit (Tourist / Commercial)'},
    {'key': 'other', 'label': 'Other Official Fleet Document'},
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _docNumCtrl.dispose();
    _authorityCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
          ),
          child: SingleChildScrollView(
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Attach Compliance Document',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 17,
                        color: isDark ? AppColors.darkText : AppColors.lightText,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),

                DropdownButtonFormField<String>(
                  value: _docType,
                  isExpanded: true,
                  dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText, fontSize: 13),
                  decoration: _sheetInputDecoration('Document Classification *', 'Select Document Type', isDark),
                  items: _docOptions.map((d) {
                    return DropdownMenuItem(
                      value: d['key']!,
                      child: Text(d['label']!, overflow: TextOverflow.ellipsis),
                    );
                  }).toList(),
                  onChanged: (v) {
                    setState(() {
                      _docType = v ?? 'bluebook';
                      if (_nameCtrl.text.isEmpty) {
                        _nameCtrl.text = _docOptions.firstWhere((x) => x['key'] == _docType)['label']!;
                      }
                    });
                  },
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: _nameCtrl,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Document Title', 'e.g. Bluebook (Vehicle Registration)', isDark),
                ),
                const SizedBox(height: AppSpacing.sm),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _docNumCtrl,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                        decoration: _sheetInputDecoration('Doc / Policy # *', 'e.g. BB-9921', isDark),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: TextFormField(
                        controller: _authorityCtrl,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                        decoration: _sheetInputDecoration('Issuing Authority', 'e.g. Yatayat Karyalaya', isDark),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),

                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _expiry,
                      firstDate: DateTime.now().subtract(const Duration(days: 365)),
                      lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
                    );
                    if (picked != null) setState(() => _expiry = picked);
                  },
                  borderRadius: AppRadius.md,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      borderRadius: AppRadius.md,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.event_available_rounded, color: AppColors.primary, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              'Expiry: ${_expiry.year}-${_expiry.month.toString().padLeft(2, '0')}-${_expiry.day.toString().padLeft(2, '0')}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: isDark ? AppColors.darkText : AppColors.lightText,
                              ),
                            ),
                          ],
                        ),
                        const Text(
                          'Change',
                          style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: _notesCtrl,
                  maxLines: 2,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Auditor Notes (Optional)', 'Policy details or branch remarks', isDark),
                ),
                const SizedBox(height: AppSpacing.lg),

                PrimaryButton(
                  label: _isSaving ? 'Attaching Document...' : 'Attach Document',
                  icon: Icons.check_circle_rounded,
                  onPressed: _isSaving
                      ? null
                      : () async {
                          if (_docNumCtrl.text.trim().isEmpty) {
                            AppFeedback.showToast(context, message: 'Please enter document number', type: ToastType.error);
                            return;
                          }

                          final title = _nameCtrl.text.trim().isNotEmpty
                              ? _nameCtrl.text.trim()
                              : _docOptions.firstWhere((x) => x['key'] == _docType)['label']!;

                          final doc = VehicleDocument(
                            id: '',
                            vehicleId: '',
                            docType: _docType,
                            name: title,
                            documentNumber: _docNumCtrl.text.trim(),
                            issuingAuthority: _authorityCtrl.text.trim(),
                            fileUrl: 'https://storage.rental.app/docs/sample.pdf',
                            expiryDate: _expiry,
                            status: _expiry.isBefore(DateTime.now())
                                ? 'expired'
                                : (_expiry.difference(DateTime.now()).inDays <= 30 ? 'expiring_soon' : 'valid'),
                            verificationStatus: 'verified',
                            notes: _notesCtrl.text.trim(),
                          );

                          setState(() => _isSaving = true);
                          try {
                            await widget.onSave(doc);
                            if (mounted) Navigator.of(context).pop();
                          } catch (e) {
                            setState(() => _isSaving = false);
                            if (mounted) {
                              AppFeedback.showToast(context, message: 'Saved: $e', type: ToastType.warning);
                              Navigator.of(context).pop();
                            }
                          }
                        },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 5. Reusable Sheet to Pick a Vehicle Type with "+ Add New Type" Action
class SelectVehicleTypeSheet extends StatelessWidget {
  final String selectedKey;
  final List<Map<String, String>> vehicleTypes;
  final ValueChanged<String> onSelected;
  final VoidCallback onAddNew;

  const SelectVehicleTypeSheet({
    super.key,
    required this.selectedKey,
    required this.vehicleTypes,
    required this.onSelected,
    required this.onAddNew,
  });

  static Future<void> show(
    BuildContext context, {
    required String selectedKey,
    required List<Map<String, String>> vehicleTypes,
    required ValueChanged<String> onSelected,
    required VoidCallback onAddNew,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SelectVehicleTypeSheet(
        selectedKey: selectedKey,
        vehicleTypes: vehicleTypes,
        onSelected: onSelected,
        onAddNew: onAddNew,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final softGray = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final hardGray = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Select Vehicle Type',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 17,
                      color: isDark ? AppColors.darkText : AppColors.lightText,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              ...vehicleTypes.map((type) {
                final key = type['key'] ?? '';
                final name = type['name'] ?? key;
                final icon = type['icon'] ?? '🚗';
                final isSelected = key == selectedKey;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: InkWell(
                    borderRadius: AppRadius.md,
                    onTap: () {
                      onSelected(key);
                      Navigator.of(context).pop();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary.withOpacity(0.12) : softGray,
                        borderRadius: AppRadius.md,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.primary : hardGray,
                              borderRadius: AppRadius.sm,
                            ),
                            child: Text(icon, style: const TextStyle(fontSize: 18)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              name,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                color: isSelected ? AppColors.primary : (isDark ? AppColors.darkText : AppColors.lightText),
                              ),
                            ),
                          ),
                          if (isSelected)
                            const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20)
                          else
                            Icon(Icons.chevron_right_rounded, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary, size: 20),
                        ],
                      ),
                    ),
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: SecondaryButton(
                  label: 'Add New Vehicle Type',
                  icon: Icons.add_rounded,
                  onPressed: () {
                    Navigator.of(context).pop();
                    onAddNew();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 6. Reusable Sheet to Pick a Vehicle Category with "+ Add New Category" Action
class SelectCategorySheet extends StatelessWidget {
  final String? selectedId;
  final List<VehicleCategory> categories;
  final ValueChanged<VehicleCategory> onSelected;
  final VoidCallback onAddNew;

  const SelectCategorySheet({
    super.key,
    required this.selectedId,
    required this.categories,
    required this.onSelected,
    required this.onAddNew,
  });

  static Future<void> show(
    BuildContext context, {
    required String? selectedId,
    required List<VehicleCategory> categories,
    required ValueChanged<VehicleCategory> onSelected,
    required VoidCallback onAddNew,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SelectCategorySheet(
        selectedId: selectedId,
        categories: categories,
        onSelected: onSelected,
        onAddNew: onAddNew,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final softGray = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final hardGray = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Select Category',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 17,
                      color: isDark ? AppColors.darkText : AppColors.lightText,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              if (categories.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text(
                      'No categories registered yet.',
                      style: TextStyle(color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                    ),
                  ),
                )
              else
                ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.45),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: categories.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final cat = categories[index];
                      final isSelected = cat.id == selectedId;

                      return InkWell(
                        borderRadius: AppRadius.md,
                        onTap: () {
                          onSelected(cat);
                          Navigator.of(context).pop();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primary.withOpacity(0.12) : softGray,
                            borderRadius: AppRadius.md,
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: hardGray,
                                  borderRadius: AppRadius.sm,
                                ),
                                child: Text(
                                  cat.vehicleType.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      cat.name,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                        color: isSelected ? AppColors.primary : (isDark ? AppColors.darkText : AppColors.lightText),
                                      ),
                                    ),
                                    Text(
                                      'Rs. ${cat.defaultDailyRate.toStringAsFixed(0)} / day  •  Deposit: Rs. ${cat.defaultDeposit.toStringAsFixed(0)}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (isSelected)
                                const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20)
                              else
                                Icon(Icons.chevron_right_rounded, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary, size: 20),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: SecondaryButton(
                  label: 'Add New Category',
                  icon: Icons.add_rounded,
                  onPressed: () {
                    Navigator.of(context).pop();
                    onAddNew();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 7. Reusable Sheet to Pick an Assigned Location with "+ Add New Location" Action
class SelectLocationSheet extends StatelessWidget {
  final String? selectedId;
  final List<VehicleLocation> locations;
  final ValueChanged<VehicleLocation> onSelected;
  final VoidCallback onAddNew;

  const SelectLocationSheet({
    super.key,
    required this.selectedId,
    required this.locations,
    required this.onSelected,
    required this.onAddNew,
  });

  static Future<void> show(
    BuildContext context, {
    required String? selectedId,
    required List<VehicleLocation> locations,
    required ValueChanged<VehicleLocation> onSelected,
    required VoidCallback onAddNew,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SelectLocationSheet(
        selectedId: selectedId,
        locations: locations,
        onSelected: onSelected,
        onAddNew: onAddNew,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final softGray = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final hardGray = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Select Assigned Location',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 17,
                      color: isDark ? AppColors.darkText : AppColors.lightText,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              if (locations.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text(
                      'No station locations registered yet.',
                      style: TextStyle(color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                    ),
                  ),
                )
              else
                ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.45),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: locations.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final loc = locations[index];
                      final isSelected = loc.id == selectedId;

                      return InkWell(
                        borderRadius: AppRadius.md,
                        onTap: () {
                          onSelected(loc);
                          Navigator.of(context).pop();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primary.withOpacity(0.12) : softGray,
                            borderRadius: AppRadius.md,
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: hardGray,
                                  borderRadius: AppRadius.sm,
                                ),
                                child: Text(
                                  loc.code,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppColors.darkText : AppColors.lightText,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      loc.name,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                        color: isSelected ? AppColors.primary : (isDark ? AppColors.darkText : AppColors.lightText),
                                      ),
                                    ),
                                    Text(
                                      '${loc.city} • ${loc.address}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (isSelected)
                                const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20)
                              else
                                Icon(Icons.chevron_right_rounded, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary, size: 20),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: SecondaryButton(
                  label: 'Add New Location',
                  icon: Icons.add_location_alt_outlined,
                  onPressed: () {
                    Navigator.of(context).pop();
                    onAddNew();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 8. Reusable Sheet to Add a Custom Amenity / Feature
class AddCustomFeatureSheet extends StatefulWidget {
  final ValueChanged<String> onAdd;

  const AddCustomFeatureSheet({super.key, required this.onAdd});

  static Future<void> show(BuildContext context, {required ValueChanged<String> onAdd}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddCustomFeatureSheet(onAdd: onAdd),
    );
  }

  @override
  State<AddCustomFeatureSheet> createState() => _AddCustomFeatureSheetState();
}

class _AddCustomFeatureSheetState extends State<AddCustomFeatureSheet> {
  final _ctrl = TextEditingController();

  static const _quickSuggestions = [
    'Roof Tent',
    'Snow Chains',
    'Trailer Hitch',
    'Wireless Charging Pad',
    'Subwoofer Audio',
    'GoPro Mount',
    'Auxiliary Fuel Tank',
    'Solar Panel Setup',
  ];

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _ctrl.text.trim();
    if (text.isEmpty) {
      AppFeedback.showToast(context, message: 'Please enter feature name', type: ToastType.error);
      return;
    }
    widget.onAdd(text);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hardGray = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
          ),
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Add Custom Feature',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 17,
                      color: isDark ? AppColors.darkText : AppColors.lightText,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: _ctrl,
                autofocus: true,
                style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                decoration: _sheetInputDecoration('Feature / Amenity Name', 'e.g., Roof Tent, Solar Panel', isDark),
                onSubmitted: (_) => _submit(),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'QUICK SUGGESTIONS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _quickSuggestions.map((s) {
                  return GestureDetector(
                    onTap: () => setState(() => _ctrl.text = s),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: hardGray,
                        borderRadius: AppRadius.md,
                      ),
                      child: Text(
                        '+ $s',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                label: 'Add Feature',
                icon: Icons.check_circle_rounded,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
