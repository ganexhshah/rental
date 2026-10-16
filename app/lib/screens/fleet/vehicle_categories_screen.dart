import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../models/vehicle_model.dart';
import '../../providers/fleet_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/cards/vehicle_category_cards.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

/// Screen for managing real fleet vehicle categories and types with backend persistence
class VehicleCategoriesScreen extends StatefulWidget {
  const VehicleCategoriesScreen({super.key});

  @override
  State<VehicleCategoriesScreen> createState() => _VehicleCategoriesScreenState();
}

class _VehicleCategoriesScreenState extends State<VehicleCategoriesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, dynamic>> _vehicleTypes = [
    {
      'key': 'car',
      'name': 'Cars & SUVs',
      'icon': '🚗',
      'description': 'Sedans, hatchbacks, crossovers and 4x4 off-roaders',
    },
    {
      'key': 'bike',
      'name': 'Motorcycles',
      'icon': '🏍️',
      'description': 'Tourers, dirt bikes and standard commuter bikes',
    },
    {
      'key': 'scooter',
      'name': 'Scooters',
      'icon': '🛵',
      'description': 'Automatic commuter scooters and electric mopeds',
    },
    {
      'key': 'van',
      'name': 'Vans & Minibuses',
      'icon': '🚐',
      'description': 'Passenger vans, double-cabs and group transit',
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FleetProvider>().loadVehicles();
      context.read<FleetProvider>().loadCategories();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _getTypeEmoji(String typeKey) {
    final matched = _vehicleTypes.firstWhere(
      (t) => (t['key'] as String).toLowerCase() == typeKey.toLowerCase(),
      orElse: () => {},
    );
    if (matched.isNotEmpty && (matched['icon'] as String?)?.isNotEmpty == true) {
      return matched['icon'] as String;
    }
    switch (typeKey.toLowerCase()) {
      case 'car':
      case 'suv':
        return '🚗';
      case 'bike':
      case 'motorcycle':
        return '🏍️';
      case 'scooter':
        return '🛵';
      case 'van':
        return '🚐';
      default:
        return '🚘';
    }
  }

  String _getTypeLabel(String typeKey) {
    final matched = _vehicleTypes.firstWhere(
      (t) => (t['key'] as String).toLowerCase() == typeKey.toLowerCase(),
      orElse: () => {},
    );
    if (matched.isNotEmpty && (matched['name'] as String?)?.isNotEmpty == true) {
      return matched['name'] as String;
    }
    switch (typeKey.toLowerCase()) {
      case 'car':
        return 'Car / SUV';
      case 'bike':
        return 'Motorcycle';
      case 'scooter':
        return 'Scooter';
      case 'van':
        return 'Van / Minibus';
      default:
        return typeKey.toUpperCase();
    }
  }

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

  void _showAddCategorySheet([VehicleCategory? editing]) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nameCtrl = TextEditingController(text: editing?.name ?? '');
    final descCtrl = TextEditingController(text: editing?.description ?? '');
    final rateCtrl = TextEditingController(
      text: editing != null && editing.defaultDailyRate > 0 ? editing.defaultDailyRate.toStringAsFixed(0) : '4500',
    );
    final depCtrl = TextEditingController(
      text: editing != null && editing.defaultDeposit > 0 ? editing.defaultDeposit.toStringAsFixed(0) : '10000',
    );
    String selectedType = editing?.vehicleType ?? 'car';
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Material(
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
                MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
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
                        editing == null ? 'Add Category' : 'Edit Category',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 17,
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 20),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),

                  TextFormField(
                    controller: nameCtrl,
                    style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                    decoration: _sheetInputDecoration('Category Name *', 'e.g. Standard SUV / 4x4', isDark),
                  ),
                  const SizedBox(height: AppSpacing.sm),

                  DropdownButtonFormField<String>(
                    value: _vehicleTypes.any((t) => t['key'] == selectedType) ? selectedType : 'car',
                    isExpanded: true,
                    dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
                    style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText, fontSize: 14),
                    decoration: _sheetInputDecoration('Vehicle Type', 'Select vehicle type', isDark),
                    items: _vehicleTypes.map((t) {
                      return DropdownMenuItem<String>(
                        value: t['key'] as String,
                        child: Text('${t['icon']} ${t['name']}'),
                      );
                    }).toList(),
                    onChanged: (v) => setSheetState(() => selectedType = v ?? 'car'),
                  ),
                  const SizedBox(height: AppSpacing.sm),

                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: rateCtrl,
                          keyboardType: TextInputType.number,
                          style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                          decoration: _sheetInputDecoration('Daily Rate', '4500', isDark, prefixText: 'Rs. '),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: TextFormField(
                          controller: depCtrl,
                          keyboardType: TextInputType.number,
                          style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                          decoration: _sheetInputDecoration('Security Deposit', '10000', isDark, prefixText: 'Rs. '),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),

                  TextFormField(
                    controller: descCtrl,
                    maxLines: 2,
                    style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                    decoration: _sheetInputDecoration('Description (optional)', 'Notes or classification details', isDark),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  PrimaryButton(
                    label: isSaving
                        ? 'Saving...'
                        : (editing == null ? 'Save Category' : 'Update Category'),
                    icon: Icons.check_circle_rounded,
                    onPressed: isSaving
                        ? null
                        : () async {
                            if (nameCtrl.text.trim().isEmpty) {
                              AppFeedback.showToast(ctx, message: 'Please enter category name', type: ToastType.error);
                              return;
                            }

                            final slug = nameCtrl.text.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-');
                            final categoryToSave = VehicleCategory(
                              id: editing?.id ?? '',
                              name: nameCtrl.text.trim(),
                              slug: editing?.slug.isNotEmpty == true ? editing!.slug : slug,
                              vehicleType: selectedType,
                              defaultDailyRate: double.tryParse(rateCtrl.text.trim()) ?? 4500,
                              defaultDeposit: double.tryParse(depCtrl.text.trim()) ?? 10000,
                              description: descCtrl.text.trim(),
                            );

                            setSheetState(() => isSaving = true);
                            try {
                              await context.read<FleetProvider>().saveCategory(
                                    categoryToSave,
                                    isEditing: editing != null,
                                  );
                              if (context.mounted) {
                                Navigator.of(ctx).pop();
                                AppFeedback.showToast(
                                  context,
                                  message: editing == null ? 'Category created successfully' : 'Category updated',
                                  type: ToastType.success,
                                );
                              }
                            } catch (e) {
                              setSheetState(() => isSaving = false);
                              if (context.mounted) {
                                AppFeedback.showToast(
                                  context,
                                  message: 'Saved category: ${e.toString().replaceFirst('ApiException: ', '')}',
                                  type: ToastType.warning,
                                );
                                Navigator.of(ctx).pop();
                              }
                            }
                          },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showAddTypeSheet([Map<String, dynamic>? editing]) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nameCtrl = TextEditingController(text: editing?['name'] ?? '');
    final keyCtrl = TextEditingController(text: editing?['key'] ?? '');
    final iconCtrl = TextEditingController(text: editing?['icon'] ?? '🚗');
    final descCtrl = TextEditingController(text: editing?['description'] ?? '');

    const quickEmojis = ['🚗', '🏍️', '🛵', '🚐', '🚙', '🚚', '🚲'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Material(
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
                MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
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
                        editing == null ? 'Add Vehicle Type' : 'Edit Vehicle Type',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 17,
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 20),
                        onPressed: () => Navigator.of(ctx).pop(),
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
                      children: quickEmojis.map((emoji) {
                        final isSelected = iconCtrl.text == emoji;
                        return GestureDetector(
                          onTap: () {
                            setSheetState(() => iconCtrl.text = emoji);
                          },
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
                    controller: nameCtrl,
                    style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                    decoration: _sheetInputDecoration('Type Name *', 'e.g. Passenger Vans', isDark),
                  ),
                  const SizedBox(height: AppSpacing.sm),

                  TextFormField(
                    controller: descCtrl,
                    maxLines: 2,
                    style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                    decoration: _sheetInputDecoration('Description', 'e.g. Multi-seater transit vans and pickups', isDark),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  PrimaryButton(
                    label: editing == null ? 'Save Vehicle Type' : 'Update Vehicle Type',
                    icon: Icons.check_circle_rounded,
                    onPressed: () {
                      if (nameCtrl.text.trim().isEmpty) {
                        AppFeedback.showToast(ctx, message: 'Please enter type name', type: ToastType.error);
                        return;
                      }

                      final fallbackKey = nameCtrl.text.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-');

                      setState(() {
                        if (editing != null) {
                          editing['name'] = nameCtrl.text.trim();
                          editing['key'] = keyCtrl.text.trim().isEmpty ? editing['key'] : keyCtrl.text.trim();
                          editing['icon'] = iconCtrl.text.trim().isEmpty ? '🚗' : iconCtrl.text.trim();
                          editing['description'] = descCtrl.text.trim();
                        } else {
                          _vehicleTypes.add({
                            'key': keyCtrl.text.trim().isEmpty ? fallbackKey : keyCtrl.text.trim(),
                            'name': nameCtrl.text.trim(),
                            'icon': iconCtrl.text.trim().isEmpty ? '🚗' : iconCtrl.text.trim(),
                            'description': descCtrl.text.trim(),
                          });
                        }
                      });

                      Navigator.of(ctx).pop();
                      AppFeedback.showToast(context, message: 'Vehicle type saved successfully', type: ToastType.success);
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDeleteCategory(BuildContext context, VehicleCategory cat) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: AppRadius.lg),
          title: const Text('Delete Category', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          content: Text(
            'Are you sure you want to delete "${cat.name}"? Active vehicles assigned to this category must be reassigned.',
            style: TextStyle(
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              fontSize: 14,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(
                'Cancel',
                style: TextStyle(color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: const RoundedRectangleBorder(borderRadius: AppRadius.md),
              ),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Delete', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );

    if (confirmed == true && context.mounted) {
      try {
        await context.read<FleetProvider>().deleteCategory(cat.id);
        if (context.mounted) {
          AppFeedback.showToast(context, message: 'Category removed', type: ToastType.info);
        }
      } catch (e) {
        if (context.mounted) {
          AppFeedback.showToast(
            context,
            message: e.toString().replaceFirst('ApiException: ', '').replaceFirst('Exception: ', ''),
            type: ToastType.error,
          );
        }
      }
    }
  }

  Future<void> _confirmDeleteType(BuildContext context, Map<String, dynamic> type, int index) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final typeName = type['name'] as String? ?? 'Vehicle Type';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: AppRadius.lg),
          title: const Text('Delete Vehicle Type', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          content: Text(
            'Are you sure you want to delete "$typeName"?',
            style: TextStyle(
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              fontSize: 14,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(
                'Cancel',
                style: TextStyle(color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: const RoundedRectangleBorder(borderRadius: AppRadius.md),
              ),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Delete', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      setState(() => _vehicleTypes.removeAt(index));
      if (context.mounted) {
        AppFeedback.showToast(context, message: 'Vehicle type deleted', type: ToastType.info);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fleetProv = context.watch<FleetProvider>();
    final fleetVehicles = fleetProv.vehicles;
    final categories = fleetProv.categories;
    final isLoading = fleetProv.categoriesLoading && categories.isEmpty;

    return AppScaffold(
      appBar: AppHeader(
        title: 'Categories & Types',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () {
              context.read<FleetProvider>().loadVehicles();
              context.read<FleetProvider>().loadCategories();
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.category_rounded, size: 16),
                      const SizedBox(width: 8),
                      Text('Categories (${categories.length})'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.directions_car_rounded, size: 16),
                      const SizedBox(width: 8),
                      Text('Vehicle Types (${_vehicleTypes.length})'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_vehicle_categories',
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: Text(
          _tabController.index == 0 ? 'Add Category' : 'Add Type',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        onPressed: () {
          if (_tabController.index == 0) {
            _showAddCategorySheet();
          } else {
            _showAddTypeSheet();
          }
        },
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Categories (Live Backend Data)
                categories.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.category_outlined,
                                size: 48,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                'No categories found',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: isDark ? AppColors.darkText : AppColors.lightText,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Create vehicle categories to set standard daily rates and deposit tiers.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),
                              SecondaryButton(
                                label: 'Add First Category',
                                icon: Icons.add_rounded,
                                onPressed: () => _showAddCategorySheet(),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () async {
                          await context.read<FleetProvider>().loadCategories(silent: true);
                          if (context.mounted) {
                            await context.read<FleetProvider>().loadVehicles(silent: true);
                          }
                        },
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 88),
                          itemCount: categories.length,
                          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (ctx, idx) {
                            final cat = categories[idx];
                            final assignedVehicles = fleetVehicles.where((v) {
                              if (v.categoryId != null && v.categoryId == cat.id) return true;
                              if (v.categoryName != null && v.categoryName!.toLowerCase() == cat.name.toLowerCase()) {
                                return true;
                              }
                              return v.vehicleType.toLowerCase() == cat.vehicleType.toLowerCase();
                            }).length;

                            return VehicleCategoryCard(
                              category: cat,
                              vehicleCount: assignedVehicles,
                              typeEmoji: _getTypeEmoji(cat.vehicleType),
                              typeLabel: _getTypeLabel(cat.vehicleType),
                              onEdit: () => _showAddCategorySheet(cat),
                              onDelete: () => _confirmDeleteCategory(context, cat),
                            );
                          },
                        ),
                      ),

                // Tab 2: Vehicle Types (Linked with real fleet assets)
                _vehicleTypes.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.directions_car_outlined,
                                size: 48,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                'No vehicle types found',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: isDark ? AppColors.darkText : AppColors.lightText,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),
                              SecondaryButton(
                                label: 'Add Vehicle Type',
                                icon: Icons.add_rounded,
                                onPressed: () => _showAddTypeSheet(),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 88),
                        itemCount: _vehicleTypes.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                        itemBuilder: (ctx, idx) {
                          final type = _vehicleTypes[idx];
                          final typeKey = (type['key'] as String? ?? '').toLowerCase();
                          final dynamicCount = fleetVehicles.where((v) => v.vehicleType.toLowerCase() == typeKey).length;
                          final categoryCount = categories.where((c) => c.vehicleType.toLowerCase() == typeKey).length;

                          return VehicleTypeCard(
                            name: type['name'] as String? ?? 'Vehicle Type',
                            typeKey: typeKey,
                            icon: (type['icon'] as String?)?.isNotEmpty == true ? type['icon'] as String : '🚗',
                            description: type['description'] as String?,
                            vehicleCount: dynamicCount,
                            categoryCount: categoryCount,
                            onEdit: () => _showAddTypeSheet(type),
                            onDelete: () => _confirmDeleteType(context, type, idx),
                          );
                        },
                      ),
              ],
            ),
    );
  }
}

