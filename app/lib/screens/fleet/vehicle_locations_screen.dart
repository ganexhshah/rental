import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../models/vehicle_model.dart';
import '../../providers/fleet_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/cards/vehicle_location_card.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

/// Screen for managing fleet branch depots, airport counters and service stations across Nepal
class VehicleLocationsScreen extends StatefulWidget {
  const VehicleLocationsScreen({super.key});

  @override
  State<VehicleLocationsScreen> createState() => _VehicleLocationsScreenState();
}

class _VehicleLocationsScreenState extends State<VehicleLocationsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FleetProvider>().loadLocations();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    super.dispose();
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

  void _showAddEditLocationSheet([VehicleLocation? editing]) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nameCtrl = TextEditingController(text: editing?.name ?? '');
    final codeCtrl = TextEditingController(text: editing?.code ?? '');
    final cityCtrl = TextEditingController(text: editing?.city ?? 'Kathmandu');
    final addrCtrl = TextEditingController(text: editing?.address ?? '');
    final phoneCtrl = TextEditingController(text: editing?.phone ?? '+977 ');
    bool isActive = editing?.isActive ?? true;
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
                          editing == null ? 'Register New Station' : 'Edit Station Hub',
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
                      decoration: _sheetInputDecoration('Station Name *', 'e.g. Pokhara Lakeside Counter', isDark),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: codeCtrl,
                            style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                            decoration: _sheetInputDecoration('Station Code *', 'e.g. PKR-01', isDark),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: TextFormField(
                            controller: cityCtrl,
                            style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                            decoration: _sheetInputDecoration('City *', 'e.g. Pokhara', isDark),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    TextFormField(
                      controller: addrCtrl,
                      style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                      decoration: _sheetInputDecoration('Full Address', 'e.g. Baidam-6, Lakeside Road', isDark),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    TextFormField(
                      controller: phoneCtrl,
                      keyboardType: TextInputType.phone,
                      style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                      decoration: _sheetInputDecoration('Contact Phone', '+977 1-44XXXXX', isDark),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        'Active Station Hub',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                        ),
                      ),
                      subtitle: Text(
                        'Allows vehicle assignments and booking pickups/returns',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                        ),
                      ),
                      value: isActive,
                      activeColor: AppColors.primary,
                      onChanged: (val) => setSheetState(() => isActive = val),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    PrimaryButton(
                      label: isSaving
                          ? 'Saving...'
                          : (editing == null ? 'Save Station' : 'Update Station'),
                      icon: Icons.check_circle_rounded,
                      onPressed: isSaving
                          ? null
                          : () async {
                              if (nameCtrl.text.trim().isEmpty || codeCtrl.text.trim().isEmpty) {
                                AppFeedback.showToast(ctx, message: 'Please enter station name and code', type: ToastType.error);
                                return;
                              }

                              final toSave = VehicleLocation(
                                id: editing?.id ?? '',
                                name: nameCtrl.text.trim(),
                                code: codeCtrl.text.trim().toUpperCase(),
                                city: cityCtrl.text.trim(),
                                address: addrCtrl.text.trim(),
                                phone: phoneCtrl.text.trim(),
                                isActive: isActive,
                                activeVehiclesCount: editing?.activeVehiclesCount ?? 0,
                              );

                              setSheetState(() => isSaving = true);
                              try {
                                await context.read<FleetProvider>().saveLocation(toSave, isEditing: editing != null);
                                if (context.mounted) {
                                  Navigator.of(ctx).pop();
                                  AppFeedback.showToast(
                                    context,
                                    message: editing == null ? 'Station created successfully' : 'Station updated',
                                    type: ToastType.success,
                                  );
                                }
                              } catch (e) {
                                setSheetState(() => isSaving = false);
                                if (context.mounted) {
                                  AppFeedback.showToast(
                                    context,
                                    message: 'Saved station: ${e.toString().replaceFirst('ApiException: ', '')}',
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
      ),
    );
  }

  Future<void> _confirmDeleteLocation(VehicleLocation loc) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final count = loc.activeVehiclesCount;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.lg),
        title: const Text('Delete Station Location', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Are you sure you want to delete ${loc.name} (${loc.code})?'),
            if (count > 0) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: AppRadius.sm,
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 18, color: Color(0xFFD97706)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '$count vehicles are stationed here. Deleting will unlink fleet assignments.',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF92400E)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete Station'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await context.read<FleetProvider>().deleteLocation(loc.id);
      if (mounted) {
        AppFeedback.showToast(context, message: 'Station deleted successfully', type: ToastType.info);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fleetProv = context.watch<FleetProvider>();
    final allLocations = fleetProv.locations;

    // Filter by search query
    final queryFiltered = allLocations.where((l) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final match = l.name.toLowerCase().contains(q) ||
            l.code.toLowerCase().contains(q) ||
            l.city.toLowerCase().contains(q) ||
            l.address.toLowerCase().contains(q);
        if (!match) return false;
      }
      return true;
    }).toList();

    final allCount = queryFiltered.length;
    final activeHubs = queryFiltered.where((l) => l.isActive).toList();
    final inactiveHubs = queryFiltered.where((l) => !l.isActive).toList();

    return AppScaffold(
      appBar: AppHeader(
        title: 'Station Locations',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => fleetProv.loadLocations(forceRefresh: true),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              labelPadding: const EdgeInsets.symmetric(horizontal: 14),
              labelColor: AppColors.primary,
              unselectedLabelColor: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: [
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.location_city_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('All Hubs ($allCount)'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('Active (${activeHubs.length})'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.pause_circle_filled_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('Inactive (${inactiveHubs.length})'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_vehicle_locations',
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt_rounded),
        label: const Text('New Station', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () => _showAddEditLocationSheet(),
      ),
      body: Column(
        children: [
          // Filter Search Bar
          Container(
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.sm),
            color: isDark ? AppColors.darkSurface : Colors.white,
            child: TextField(
              controller: _searchCtrl,
              style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Search station by name, code, city...',
                hintStyle: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
                prefixIcon: const Icon(Icons.search_rounded, size: 18),
                filled: true,
                fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(borderRadius: AppRadius.md, borderSide: BorderSide.none),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 16),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
            ),
          ),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildLocationsList(queryFiltered, fleetProv.locationsLoading),
                _buildLocationsList(activeHubs, fleetProv.locationsLoading),
                _buildLocationsList(inactiveHubs, fleetProv.locationsLoading),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationsList(List<VehicleLocation> locs, bool isLoading) {
    if (isLoading && locs.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (locs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.location_off_rounded, size: 48, color: Color(0xFF94A3B8)),
            SizedBox(height: 8),
            Text('No Station Hubs Found', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            Text('No station records match your current filters.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => context.read<FleetProvider>().loadLocations(forceRefresh: true),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, 80),
        itemCount: locs.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (ctx, idx) {
          final loc = locs[idx];
          return VehicleLocationCard(
            location: loc,
            onEdit: () => _showAddEditLocationSheet(loc),
            onDelete: () => _confirmDeleteLocation(loc),
          );
        },
      ),
    );
  }
}
