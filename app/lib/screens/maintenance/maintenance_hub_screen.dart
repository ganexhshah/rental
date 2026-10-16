import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../models/maintenance_model.dart';
import '../../providers/fleet_provider.dart';
import '../../providers/maintenance_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/cards/maintenance_cards.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

/// Screen for managing fleet maintenance work orders, service intervals and workshop vendors
class MaintenanceHubScreen extends StatefulWidget {
  const MaintenanceHubScreen({super.key});

  @override
  State<MaintenanceHubScreen> createState() => _MaintenanceHubScreenState();
}

class _MaintenanceHubScreenState extends State<MaintenanceHubScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MaintenanceProvider>().fetchMaintenanceData();
      context.read<FleetProvider>().loadVehicles();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
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

  void _showAddWorkOrderSheet() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fleetVehicles = context.read<FleetProvider>().vehicles;
    final plateCtrl = TextEditingController(text: fleetVehicles.isNotEmpty ? fleetVehicles.first.plateNumber : '');
    final titleCtrl = TextEditingController();
    final costCtrl = TextEditingController();
    final vendorCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String priority = 'medium';
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
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
                            'Create Work Order',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 17,
                              color: isDark ? AppColors.darkText : AppColors.lightText,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, size: 20),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      if (fleetVehicles.isNotEmpty)
                        DropdownButtonFormField<String>(
                          value: fleetVehicles.any((v) => v.plateNumber == plateCtrl.text)
                              ? plateCtrl.text
                              : fleetVehicles.first.plateNumber,
                          isExpanded: true,
                          dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
                          style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText, fontSize: 14),
                          decoration: _sheetInputDecoration('Vehicle', 'Select fleet vehicle', isDark),
                          items: fleetVehicles.map((v) {
                            return DropdownMenuItem<String>(
                              value: v.plateNumber,
                              child: Text('${v.plateNumber} • ${v.make} ${v.model}'),
                            );
                          }).toList(),
                          onChanged: (v) {
                            if (v != null) {
                              setSheetState(() => plateCtrl.text = v);
                            }
                          },
                        )
                      else
                        TextFormField(
                          controller: plateCtrl,
                          style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                          decoration: _sheetInputDecoration('Vehicle Plate *', 'e.g. BA 2 CHA 4492', isDark),
                        ),
                      const SizedBox(height: AppSpacing.sm),

                      TextFormField(
                        controller: titleCtrl,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                        decoration: _sheetInputDecoration('Service Title *', 'e.g. Oil change & brake pads', isDark),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: costCtrl,
                              keyboardType: TextInputType.number,
                              style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                              decoration: _sheetInputDecoration('Estimated Cost', '4500', isDark, prefixText: 'Rs. '),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: priority,
                              isExpanded: true,
                              dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
                              style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText, fontSize: 14),
                              decoration: _sheetInputDecoration('Priority', 'Priority level', isDark),
                              items: const [
                                DropdownMenuItem(value: 'low', child: Text('Low Priority')),
                                DropdownMenuItem(value: 'medium', child: Text('Medium')),
                                DropdownMenuItem(value: 'high', child: Text('High')),
                                DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                              ],
                              onChanged: (v) => setSheetState(() => priority = v ?? 'medium'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      TextFormField(
                        controller: vendorCtrl,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                        decoration: _sheetInputDecoration('Workshop / Vendor', 'e.g. Apex Auto Workshop', isDark),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      TextFormField(
                        controller: descCtrl,
                        maxLines: 2,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                        decoration: _sheetInputDecoration('Service Notes', 'Notes or symptoms observed...', isDark),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      PrimaryButton(
                        label: isSaving ? 'Queueing Work Order...' : 'Queue Work Order',
                        icon: Icons.check_circle_rounded,
                        onPressed: isSaving
                            ? null
                            : () async {
                                if (plateCtrl.text.trim().isEmpty || titleCtrl.text.trim().isEmpty) {
                                  AppFeedback.showToast(
                                    ctx,
                                    message: 'Please provide vehicle plate and service title',
                                    type: ToastType.error,
                                  );
                                  return;
                                }

                                setSheetState(() => isSaving = true);
                                await context.read<MaintenanceProvider>().addTask(
                                      vehiclePlate: plateCtrl.text.trim(),
                                      title: titleCtrl.text.trim(),
                                      priority: priority,
                                      cost: double.tryParse(costCtrl.text.trim()) ?? 0.0,
                                      vendorName: vendorCtrl.text.trim().isNotEmpty ? vendorCtrl.text.trim() : null,
                                      dueDate: DateTime.now().add(const Duration(days: 3)),
                                      description: descCtrl.text.trim(),
                                    );

                                if (context.mounted) {
                                  Navigator.pop(ctx);
                                  AppFeedback.showToast(
                                    context,
                                    message: 'Work order queued successfully',
                                    type: ToastType.success,
                                  );
                                }
                              },
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mnt = context.watch<MaintenanceProvider>();

    return AppScaffold(
      appBar: AppHeader(
        title: 'Fleet Maintenance',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => mnt.fetchMaintenanceData(forceRefresh: true),
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
                      const Icon(Icons.build_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('Work Orders (${mnt.tasks.length})'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.timelapse_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('Schedules (${mnt.schedules.length})'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.store_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('Vendors (${mnt.vendors.length})'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_maintenance_hub',
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: Text(
          _tabController.index == 0
              ? 'Log Service'
              : (_tabController.index == 1 ? 'Add Schedule' : 'Add Vendor'),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        onPressed: _showAddWorkOrderSheet,
      ),
      body: mnt.isLoading && mnt.tasks.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Work Orders
                mnt.tasks.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.build_outlined,
                                size: 48,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                'No active work orders',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: isDark ? AppColors.darkText : AppColors.lightText,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'All vehicles in the fleet are operating at optimal health.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),
                              SecondaryButton(
                                label: 'Log New Service',
                                icon: Icons.add_rounded,
                                onPressed: _showAddWorkOrderSheet,
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => mnt.fetchMaintenanceData(forceRefresh: true),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 88),
                          itemCount: mnt.tasks.length,
                          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (ctx, idx) {
                            final task = mnt.tasks[idx];
                            return MaintenanceWorkOrderCard(
                              task: task,
                              onComplete: () {
                                mnt.completeTask(task.id);
                                AppFeedback.showToast(
                                  context,
                                  message: 'Service marked as completed',
                                  type: ToastType.success,
                                );
                              },
                            );
                          },
                        ),
                      ),

                // Tab 2: Service Schedules
                mnt.schedules.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.timelapse_rounded,
                                size: 48,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                'No maintenance schedules defined',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: isDark ? AppColors.darkText : AppColors.lightText,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => mnt.fetchMaintenanceData(forceRefresh: true),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 88),
                          itemCount: mnt.schedules.length,
                          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (ctx, idx) {
                            final sch = mnt.schedules[idx];
                            return MaintenanceScheduleCard(schedule: sch);
                          },
                        ),
                      ),

                // Tab 3: Workshop Vendors
                mnt.vendors.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.store_outlined,
                                size: 48,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                'No workshop vendors listed',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: isDark ? AppColors.darkText : AppColors.lightText,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => mnt.fetchMaintenanceData(forceRefresh: true),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 88),
                          itemCount: mnt.vendors.length,
                          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (ctx, idx) {
                            final v = mnt.vendors[idx];
                            return MaintenanceVendorCard(vendor: v);
                          },
                        ),
                      ),
              ],
            ),
    );
  }
}
