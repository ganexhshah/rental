import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../providers/report_provider.dart';
import '../../widgets/cards/metric_banner_carousel.dart';
import '../../widgets/cards/rental_cards.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/sheets/create_booking_sheet.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import '../bookings/booking_detail_screen.dart';
import '../bookings/booking_list_screen.dart';
import '../bookings/operations_calendar_screen.dart';
import '../bookings/pickup_return_hub_screen.dart';
import '../bookings/pickup_screen.dart';
import '../bookings/return_screen.dart';
import '../payments/payments_hub_screen.dart';

class DashboardScreen extends StatefulWidget {
  final void Function(int tabIndex)? onSwitchTab;

  const DashboardScreen({super.key, this.onSwitchTab});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    context.read<BookingProvider>().loadBookings();
    context.read<ReportProvider>().loadDashboardMetrics();
  }

  @override
  Widget build(BuildContext context) {
    final bookingProv = context.watch<BookingProvider>();
    final reportProv = context.watch<ReportProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final ops = bookingProv.operationsSummary;
    final summary = reportProv.summary;

    final pickupsToday = bookingProv.bookings.where((b) => b.isPickupReady).toList();
    final returnsToday = bookingProv.bookings.where((b) => b.isReturnReady).toList();

    // Real data from backend summary & operations
    final availableFleetStr = '${summary.availableVehicles} / ${summary.totalVehicles}';
    final activeRentalsStr = '${ops.activeRentalsCount > 0 ? ops.activeRentalsCount : summary.activeBookings}';
    final todayBookingsStr = '${summary.todayBookings > 0 ? summary.todayBookings : (ops.pickupsTodayCount + ops.returnsTodayCount)}';
    final rentedFleetStr = '${summary.rentedVehicles > 0 ? summary.rentedVehicles : ops.rentedFleetCount}';
    final pendingPaymentsStr = '${summary.pendingPayments > 0 ? summary.pendingPayments : bookingProv.bookings.where((b) => b.balanceDue > 0 || b.paymentStatus == 'unpaid' || b.paymentStatus == 'pending').length}';
    final inMaintenanceStr = '${summary.maintenanceVehicles}';

    final bannerItems = [
      MetricBannerItem(
        title: "Total Revenue",
        value: CurrencyFormatter.format(summary.totalRevenue, symbol: summary.currencySymbol),
        icon: Icons.account_balance_wallet_rounded,
        color: AppColors.primary,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const PaymentsHubScreen()),
          );
        },
      ),
      MetricBannerItem(
        title: "Today's Revenue",
        value: CurrencyFormatter.format(summary.todayRevenue, symbol: summary.currencySymbol),
        icon: Icons.trending_up_rounded,
        color: AppColors.success,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const PaymentsHubScreen()),
          );
        },
      ),
      MetricBannerItem(
        title: "Active Rentals",
        value: activeRentalsStr,
        icon: Icons.directions_car_rounded,
        color: AppColors.secondary,
        onTap: () => widget.onSwitchTab?.call(1),
      ),
      MetricBannerItem(
        title: "Today's Bookings",
        value: todayBookingsStr,
        icon: Icons.calendar_month_rounded,
        color: const Color(0xFF8B5CF6),
        onTap: () => widget.onSwitchTab?.call(1),
      ),
      MetricBannerItem(
        title: "Available Vehicles",
        value: availableFleetStr,
        icon: Icons.check_circle_rounded,
        color: const Color(0xFF059669),
        onTap: () => widget.onSwitchTab?.call(2),
      ),
      MetricBannerItem(
        title: "Rented Vehicles",
        value: rentedFleetStr,
        icon: Icons.car_rental_rounded,
        color: const Color(0xFF0284C7),
        onTap: () => widget.onSwitchTab?.call(1),
      ),
      MetricBannerItem(
        title: "Pending Payments",
        value: pendingPaymentsStr,
        icon: Icons.pending_actions_rounded,
        color: AppColors.warning,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const PaymentsHubScreen()),
          );
        },
      ),
      MetricBannerItem(
        title: "In Maintenance",
        value: inMaintenanceStr,
        icon: Icons.build_circle_rounded,
        color: const Color(0xFF64748B),
        onTap: () => widget.onSwitchTab?.call(2),
      ),
    ];

    return AppScaffold(
      isOffline: bookingProv.isOfflineMode,
      onRetryOffline: _loadData,
      appBar: AppProfileHeader(
        onRefresh: _loadData,
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppColors.primary,
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          children: [
            // 1. Swipeable Operational & Financial Metrics Banner Carousel
            MetricBannerCarousel(
              items: bannerItems,
            ),
            const SizedBox(height: AppSpacing.lg),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

            // 2. Quick Actions
            Row(
              children: [
                Expanded(
                  child: _QuickActionTile(
                    icon: Icons.add_circle_rounded,
                    label: 'New Booking',
                    onTap: () => CreateBookingSheet.show(context),
                  ),
                ),
                Expanded(
                  child: _QuickActionTile(
                    icon: Icons.key_rounded,
                    label: 'Handover',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const PickupReturnHubScreen(initialMode: 'pickup'),
                        ),
                      );
                    },
                  ),
                ),
                Expanded(
                  child: _QuickActionTile(
                    icon: Icons.assignment_turned_in_rounded,
                    label: 'Return',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const PickupReturnHubScreen(initialMode: 'return'),
                        ),
                      );
                    },
                  ),
                ),
                Expanded(
                  child: _QuickActionTile(
                    icon: Icons.account_balance_wallet_rounded,
                    label: 'Payments',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const PaymentsHubScreen()),
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),

            // 3. Operational Section: Today's Pickups
            SectionHeader(
              title: "Today's Pickups",
              subtitle: '${pickupsToday.length} bookings ready for handover',
              padding: EdgeInsets.zero,
              trailing: TextButton(
                onPressed: () => widget.onSwitchTab?.call(1),
                child: const Text('View All'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            if (pickupsToday.isEmpty)
              const EmptyStateWidget(
                icon: Icons.event_available_rounded,
                title: 'No Pickups Scheduled Today',
                description: 'All scheduled vehicles for today have either been picked up or none are due.',
              )
            else
              ...pickupsToday.take(3).map((b) => BookingCard(
                    booking: b,
                    primaryActionLabel: 'Start Pickup Handover',
                    onPrimaryAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => PickupScreen(booking: b)),
                      );
                    },
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => BookingDetailScreen(bookingId: b.id)),
                      );
                    },
                  )),

            const SizedBox(height: AppSpacing.xl),

            // 4. Operational Section: Today's Returns
            SectionHeader(
              title: "Today's Returns",
              subtitle: '${returnsToday.length} active rentals scheduled to return',
              padding: EdgeInsets.zero,
              trailing: TextButton(
                onPressed: () => widget.onSwitchTab?.call(1),
                child: const Text('View All'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            if (returnsToday.isEmpty)
              const EmptyStateWidget(
                icon: Icons.assignment_turned_in_rounded,
                title: 'No Returns Due Today',
                description: 'No active vehicles currently due for return today.',
              )
            else
              ...returnsToday.take(3).map((b) => BookingCard(
                    booking: b,
                    primaryActionLabel: 'Start Return Inspection',
                    onPrimaryAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => ReturnScreen(booking: b)),
                      );
                    },
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => BookingDetailScreen(bookingId: b.id)),
                      );
                    },
                  )),
            const SizedBox(height: AppSpacing.xxl),
                ],
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
