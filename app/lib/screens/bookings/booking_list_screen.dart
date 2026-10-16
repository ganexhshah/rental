import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/cards/rental_cards.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/sheets/bottom_sheets.dart';
import '../../widgets/sheets/create_booking_sheet.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import 'active_rentals_list_screen.dart';
import 'booking_detail_screen.dart';
import 'operations_calendar_screen.dart';
import 'pickup_return_hub_screen.dart';
import 'pickup_screen.dart';
import 'return_screen.dart';
import '../fleet/vehicle_availability_screen.dart';

class BookingListScreen extends StatefulWidget {
  const BookingListScreen({super.key});

  @override
  State<BookingListScreen> createState() => _BookingListScreenState();
}

class _BookingListScreenState extends State<BookingListScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;

  static const List<String> _quickFilterChips = [
    'all',
    'confirmed',
    'active',
    'pickup_scheduled',
    'pending',
    'completed',
    'cancelled',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().loadBookings();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
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
      _searchController.clear();
    });
    context.read<BookingProvider>().setSearchQuery('');
  }

  void _openFilterSheet() {
    final prov = context.read<BookingProvider>();
    FilterBottomSheet.show(
      context: context,
      currentStatus: prov.filterStatus,
      currentPaymentStatus: prov.filterPaymentStatus,
      onApply: (status, paymentStatus) {
        prov.setFilterStatus(status, paymentStatus);
      },
      onReset: () {
        prov.resetFilters();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingProv = context.watch<BookingProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final summary = bookingProv.operationsSummary;
    final pickupsReturnsToday = summary.pickupsTodayCount + summary.returnsTodayCount;

    return PopScope(
      canPop: !_isSearching,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_isSearching) {
          _stopSearching();
        }
      },
      child: AppScaffold(
        isOffline: bookingProv.isOfflineMode,
        onRetryOffline: () => bookingProv.loadBookings(),
        floatingActionButton: FloatingActionButton.extended(
          heroTag: 'fab_booking_list',
          onPressed: () => CreateBookingSheet.show(context),
          backgroundColor: AppColors.primary,
          elevation: 3,
          icon: const Icon(Icons.add_rounded, color: Colors.white, size: 20),
          label: const Text(
            'New Booking',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ),
        appBar: AppHeader(
          title: 'Bookings',
          showBackButton: false,
          leading: _isSearching
              ? IconButton(
                  icon: const Icon(Icons.arrow_back_rounded),
                  onPressed: _stopSearching,
                )
              : null,
          titleWidget: _isSearching
              ? TextField(
                  controller: _searchController,
                  autofocus: true,
                  style: AppTypography.bodyMedium.copyWith(
                    color: isDark ? AppColors.darkText : AppColors.lightText,
                  ),
                  cursorColor: AppColors.primary,
                  decoration: InputDecoration(
                    hintText: 'Search code, customer, plate...',
                    hintStyle: TextStyle(
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                  ),
                  onChanged: (val) {
                    setState(() {});
                    bookingProv.setSearchQuery(val);
                  },
                )
              : null,
          actions: _isSearching
              ? [
                  if (_searchController.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear_rounded),
                      tooltip: 'Clear',
                      onPressed: () {
                        _searchController.clear();
                        bookingProv.setSearchQuery('');
                        setState(() {});
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
                    icon: const Icon(Icons.filter_list_rounded),
                    tooltip: 'Filters',
                    onPressed: _openFilterSheet,
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded),
                    tooltip: 'Refresh',
                    onPressed: () => bookingProv.loadBookings(),
                  ),
                ],
        ),
        body: Column(
          children: [
            // Horizontal Quick Filter Chips (All, Confirmed, Active, Pickup Scheduled, Pending, Completed, Cancelled)
            Container(
              height: 42,
              margin: const EdgeInsets.only(top: 8, bottom: 2),
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                scrollDirection: Axis.horizontal,
                itemCount: _quickFilterChips.length,
                separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
                itemBuilder: (ctx, idx) {
                  final status = _quickFilterChips[idx];
                  final isSelected = bookingProv.filterStatus == status;
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
                        bookingProv.setFilterStatus(selected ? status : 'all');
                      },
                    ),
                  );
                },
              ),
            ),

            // Operations Quick Actions (Same style as Home Screen)
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.xs,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _QuickActionTile(
                      icon: Icons.calendar_month_rounded,
                      label: 'Calendar',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const OperationsCalendarScreen(),
                          ),
                        );
                      },
                    ),
                  ),
                  Expanded(
                    child: _QuickActionTile(
                      icon: Icons.swap_horiz_rounded,
                      label: 'Pickup & Return',
                      badgeCount: pickupsReturnsToday > 0 ? pickupsReturnsToday : null,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const PickupReturnHubScreen(),
                          ),
                        );
                      },
                    ),
                  ),
                  Expanded(
                    child: _QuickActionTile(
                      icon: Icons.directions_car_rounded,
                      label: 'Active on Road',
                      badgeCount: summary.activeRentalsCount > 0 ? summary.activeRentalsCount : null,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const ActiveRentalsListScreen(),
                          ),
                        );
                      },
                    ),
                  ),
                  Expanded(
                    child: _QuickActionTile(
                      icon: Icons.event_available_rounded,
                      label: 'Availability',
                      badgeCount: summary.availableFleetCount > 0 ? summary.availableFleetCount : null,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const VehicleAvailabilityScreen(),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: AppSpacing.xs),

          // Bookings List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => bookingProv.loadBookings(),
              color: AppColors.primary,
              child: bookingProv.isLoading
                  ? ListView.separated(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      itemCount: 4,
                      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                      itemBuilder: (_, __) => const LoadingSkeleton(height: 140),
                    )
                  : bookingProv.bookings.isEmpty
                      ? EmptyStateWidget(
                          icon: Icons.search_off_rounded,
                          title: 'No Bookings Found',
                          description: bookingProv.searchQuery.isNotEmpty
                              ? 'No results for "${bookingProv.searchQuery}".'
                              : 'No bookings in this filter.',
                          actionLabel: 'Reset Filters',
                          onAction: () => bookingProv.resetFilters(),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          itemCount: bookingProv.bookings.length,
                          itemBuilder: (ctx, idx) {
                            final b = bookingProv.bookings[idx];
                            String? actionLabel;
                            VoidCallback? onAction;

                            if (b.isPickupReady) {
                              actionLabel = 'Start Pickup';
                              onAction = () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => PickupScreen(booking: b),
                                  ),
                                );
                              };
                            } else if (b.isReturnReady) {
                              actionLabel = 'Process Return';
                              onAction = () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ReturnScreen(booking: b),
                                  ),
                                );
                              };
                            }

                            return BookingCard(
                              booking: b,
                              primaryActionLabel: actionLabel,
                              onPrimaryAction: onAction,
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => BookingDetailScreen(bookingId: b.id),
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
  final int? badgeCount;

  const _QuickActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.badgeCount,
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
            Stack(
              clipBehavior: Clip.none,
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
                if (badgeCount != null && badgeCount! > 0)
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isDark ? AppColors.darkSurface : Colors.white,
                          width: 1.5,
                        ),
                      ),
                      child: Text(
                        '${badgeCount!}',
                        style: const TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
              ],
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
