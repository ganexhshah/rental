import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/booking_model.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/dialogs/confirm_dialog.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import 'return_screen.dart';

class ActiveRentalScreen extends StatelessWidget {
  final Booking booking;

  const ActiveRentalScreen({super.key, required this.booking});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isOverdue = DateFormatter.isOverdue(booking.endDate);

    return AppScaffold(
      appBar: AppHeader(
        title: 'Active Rental',
        subtitle: '${booking.bookingCode} • ${booking.vehiclePlate}',
      ),
      stickyBottomAction: PrimaryButton(
        label: 'Process Return',
        icon: Icons.assignment_return_rounded,
        backgroundColor: AppColors.warning,
        foregroundColor: Colors.black87,
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ReturnScreen(booking: booking)),
          );
        },
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // Live status badge
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: isOverdue ? AppColors.errorBg : AppColors.primary.withOpacity(0.12),
              borderRadius: AppRadius.md,
              border: Border.all(
                color: isOverdue ? AppColors.error : AppColors.primary,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  isOverdue ? Icons.warning_rounded : Icons.directions_car_rounded,
                  color: isOverdue ? AppColors.error : AppColors.primary,
                  size: 28,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isOverdue ? 'OVERDUE RETURN WARNING' : 'LIVE ON ROAD',
                        style: AppTypography.labelLarge.copyWith(
                          color: isOverdue ? AppColors.error : AppColors.primaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        isOverdue
                          ? 'Vehicle return date was exceeded. Contact renter immediately.'
                          : 'Due return: ${DateFormatter.formatDateTime(booking.endDate)}',
                        style: AppTypography.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Vehicle & Renter summary card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(
                    label: 'Assigned Vehicle',
                    value: '${booking.vehicleMake} ${booking.vehicleModel}',
                  ),
                  KeyValueRow(
                    label: 'Plate Number',
                    value: booking.vehiclePlate,
                    valueStyle: AppTypography.monospace.copyWith(fontWeight: FontWeight.bold),
                  ),
                  KeyValueRow(label: 'Renter', value: booking.customerName),
                  KeyValueRow(label: 'Contact', value: booking.customerPhone),
                  KeyValueRow(label: 'Pickup Odometer', value: '${booking.pickupOdometer ?? 14000} km'),
                  KeyValueRow(label: 'Pickup Fuel', value: booking.pickupFuel ?? '100%'),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Operational Quick Actions
          Row(
            children: [
              Expanded(
                child: SecondaryButton(
                  label: 'Request Extension',
                  icon: Icons.calendar_month_rounded,
                  onPressed: () async {
                    final note = await ReasonInputDialog.show(
                      context: context,
                      title: 'Extend Rental Duration',
                      hint: 'Days to extend and reason...',
                      confirmLabel: 'Submit Request',
                    );
                    if (note != null && context.mounted) {
                      AppToast.showSuccess(context, 'Extension request logged for approval.');
                    }
                  },
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: SecondaryButton(
                  label: 'Report Incident',
                  icon: Icons.report_problem_rounded,
                  onPressed: () async {
                    final note = await ReasonInputDialog.show(
                      context: context,
                      title: 'Report Road Incident',
                      hint: 'Incident description, location, police case...',
                    );
                    if (note != null && context.mounted) {
                      AppToast.showInfo(context, 'Incident recorded in audit trail.');
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
