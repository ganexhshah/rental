import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../models/vehicle_model.dart';
import '../../providers/fleet_provider.dart';
import '../../widgets/cards/rental_cards.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import 'add_edit_vehicle_screen.dart';
import 'vehicle_availability_screen.dart';
import 'vehicle_categories_screen.dart';
import 'vehicle_detail_screen.dart';
import 'vehicle_documents_screen.dart';
import 'vehicle_locations_screen.dart';
import '../maintenance/maintenance_hub_screen.dart';

/// Screen matching http://localhost:3000/vehicles/all
class VehicleListScreen extends StatefulWidget {
  const VehicleListScreen({super.key});

  @override
  State<VehicleListScreen> createState() => _VehicleListScreenState();
}

class _VehicleListScreenState extends State<VehicleListScreen> {
  static const _statusOptions = ['all', 'available', 'rented', 'maintenance', 'reserved'];
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';
  String _typeFilter = 'all';
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FleetProvider>().loadVehicles();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _startSearching() {
    setState(() {
      _isSearching = true;
    });
  }

  void _stopSearching() {
    setState(() {
      _isSearching = false;
      _searchCtrl.clear();
      _searchQuery = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final fleetProv = context.watch<FleetProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filteredVehicles = fleetProv.vehicles.where((v) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final match = v.make.toLowerCase().contains(q) ||
            v.model.toLowerCase().contains(q) ||
            v.plateNumber.toLowerCase().contains(q);
        if (!match) return false;
      }
      if (_typeFilter != 'all') {
        if (_typeFilter == 'car') {
          if (!['car', 'suv', 'sedan', 'hatchback'].contains(v.vehicleType.toLowerCase())) return false;
        } else if (v.vehicleType.toLowerCase() != _typeFilter) {
          return false;
        }
      }
      return true;
    }).toList();

    return PopScope(
      canPop: !_isSearching,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_isSearching) {
          _stopSearching();
        }
      },
      child: AppScaffold(
        appBar: AppHeader(
          title: 'Fleet',
          showBackButton: false,
          leading: _isSearching
              ? IconButton(
                  icon: const Icon(Icons.arrow_back_rounded),
                  onPressed: _stopSearching,
                )
              : null,
          titleWidget: _isSearching
              ? TextField(
                  controller: _searchCtrl,
                  autofocus: true,
                  style: AppTypography.bodyMedium.copyWith(
                    color: isDark ? AppColors.darkText : AppColors.lightText,
                  ),
                  cursorColor: AppColors.primary,
                  decoration: InputDecoration(
                    hintText: 'Search make, model, plate...',
                    hintStyle: TextStyle(
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                  ),
                  onChanged: (val) {
                    setState(() => _searchQuery = val.trim());
                  },
                )
              : null,
          actions: _isSearching
              ? [
                  if (_searchCtrl.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear_rounded),
                      tooltip: 'Clear',
                      onPressed: () {
                        _searchCtrl.clear();
                        setState(() => _searchQuery = '');
                      },
                    ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    tooltip: 'Close search',
                    onPressed: _stopSearching,
                  ),
                ]
              : [
                  IconButton(
                    icon: const Icon(Icons.search_rounded),
                    tooltip: 'Search',
                    onPressed: _startSearching,
                  ),
                  IconButton(
                    icon: const Icon(Icons.event_available_rounded),
                    tooltip: 'Availability Grid',
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const VehicleAvailabilityScreen()),
                      );
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded),
                    tooltip: 'Refresh',
                    onPressed: () => fleetProv.loadVehicles(),
                  ),
                ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          heroTag: 'fab_vehicle_list',
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          icon: const Icon(Icons.add_rounded),
          label: const Text('Add Vehicle', style: TextStyle(fontWeight: FontWeight.bold)),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const AddEditVehicleScreen()),
            );
          },
        ),
      body: Column(
        children: [
          // Horizontal Quick Filter Chips
          Container(
            height: 42,
            margin: const EdgeInsets.only(top: 8, bottom: 2),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              scrollDirection: Axis.horizontal,
              itemCount: _statusOptions.length,
              separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
              itemBuilder: (ctx, idx) {
                final status = _statusOptions[idx];
                final isSelected = fleetProv.filterStatus == status;
                final label = status == 'all'
                    ? 'All'
                    : status
                        .replaceAll('_', ' ')
                        .split(' ')
                        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
                        .join(' ');
                return Center(
                  child: FilterChip(
                    label: Text(
                      label,
                      style: TextStyle(
                        color: isSelected
                            ? Colors.white
                            : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
                    side: BorderSide(
                      color: isSelected
                          ? AppColors.primary
                          : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                      width: 1,
                    ),
                    showCheckmark: false,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    onSelected: (selected) {
                      fleetProv.setFilterStatus(selected ? status : 'all');
                    },
                  ),
                );
              },
            ),
          ),

          // Fleet Quick Actions (Same style as Home & Booking Screen)
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.xs,
            ),
            child: Row(
              children: [
                Expanded(
                  child: _QuickActionTile(
                    icon: Icons.category_rounded,
                    label: 'Categories',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const VehicleCategoriesScreen()),
                      );
                    },
                  ),
                ),
                Expanded(
                  child: _QuickActionTile(
                    icon: Icons.build_circle_rounded,
                    label: 'Maintenance',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const MaintenanceHubScreen()),
                      );
                    },
                  ),
                ),
                Expanded(
                  child: _QuickActionTile(
                    icon: Icons.badge_rounded,
                    label: 'Documents',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const VehicleDocumentsScreen()),
                      );
                    },
                  ),
                ),
                Expanded(
                  child: _QuickActionTile(
                    icon: Icons.location_on_rounded,
                    label: 'Locations',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const VehicleLocationsScreen()),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xs),

          // Vehicles List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => fleetProv.loadVehicles(),
              color: AppColors.primary,
              child: fleetProv.isLoading
                  ? ListView.separated(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      itemCount: 3,
                      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                      itemBuilder: (_, __) => const LoadingSkeleton(height: 90),
                    )
                  : filteredVehicles.isEmpty
                      ? const EmptyStateWidget(
                          icon: Icons.directions_car_rounded,
                          title: 'No Fleet Vehicles Found',
                          description: 'No vehicles match your search or status criteria.',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 80),
                          itemCount: filteredVehicles.length,
                          itemBuilder: (ctx, idx) {
                            final v = filteredVehicles[idx];
                            return VehicleCard(
                              vehicle: v,
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => VehicleDetailScreen(vehicleId: v.id),
                                  ),
                                );
                              },
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    ),
  );
}
}

class _QuickActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const themeColor = AppColors.primary;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.md,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: themeColor.withOpacity(isDark ? 0.16 : 0.10),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Icon(
                  icon,
                  color: themeColor,
                  size: 26,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: AppTypography.labelSmall.copyWith(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkText : AppColors.lightText,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
