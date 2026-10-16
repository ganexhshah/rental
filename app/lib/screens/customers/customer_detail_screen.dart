import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/customer_model.dart';
import '../../providers/customer_provider.dart';
import '../../widgets/cards/rental_cards.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/dialogs/confirm_dialog.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import '../bookings/booking_detail_screen.dart';

class CustomerDetailScreen extends StatefulWidget {
  final String customerId;

  const CustomerDetailScreen({super.key, required this.customerId});

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CustomerProvider>().loadCustomerDetail(widget.customerId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final customerProv = context.watch<CustomerProvider>();
    final c = customerProv.selectedCustomer;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (customerProv.isLoading && c == null) {
      return const AppScaffold(
        appBar: AppHeader(title: 'Customer Profile'),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (c == null) {
      return const AppScaffold(
        appBar: AppHeader(title: 'Customer Profile'),
        body: ErrorStateWidget(
          title: 'Customer Not Found',
          message: 'Unable to retrieve customer record.',
        ),
      );
    }

    return AppScaffold(
      appBar: AppHeader(
        title: c.fullName,
        subtitle: c.customerCode ?? 'Customer Profile',
        actions: [
          IconButton(
            icon: const Icon(Icons.phone_rounded),
            onPressed: () => AppToast.showInfo(context, 'Calling ${c.phone}'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // Profile Banner
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkCard : Colors.white,
              borderRadius: AppRadius.lg,
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              ),
            ),
            child: Row(
              children: [
                AppAvatar(name: c.fullName, photoUrl: c.avatarUrl, size: 56),
                const SizedBox(width: AppSpacing.lg),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(c.fullName, style: AppTypography.headingMedium),
                      const SizedBox(height: 2),
                      Text(
                        'Member since ${DateFormatter.formatDate(c.createdAt)}',
                        style: AppTypography.bodySmall.copyWith(
                          color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        children: [
                          StatusChip(status: c.verificationStatus),
                          const SizedBox(width: AppSpacing.sm),
                          StatusChip(
                            status: c.rentalEligibilityStatus,
                            customLabel: c.isEligible ? 'ELIGIBLE' : 'RESTRICTED',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Identity & KYC Credentials
          const SectionHeader(title: 'Identity & Driver License', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(
                    label: 'Driving License No.',
                    value: c.licenseNumber ?? '01-06-00987654',
                    valueStyle: AppTypography.monospace.copyWith(fontWeight: FontWeight.bold),
                  ),
                  KeyValueRow(label: 'License Category', value: c.licenseCategory ?? 'Category B (Light Motor Vehicle)'),
                  KeyValueRow(label: 'Nationality', value: c.nationality),
                  KeyValueRow(label: 'Residential City', value: '${c.districtCity}, ${c.province}'),
                  KeyValueRow(label: 'Full Address', value: c.address),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Emergency Contact Card
          const SectionHeader(title: 'Emergency Contact', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(
                    label: 'Contact Person',
                    value: c.emergencyContactName ?? 'Family Contact',
                  ),
                  KeyValueRow(
                    label: 'Relationship',
                    value: c.emergencyContactRelationship ?? 'Spouse / Next of Kin',
                  ),
                  KeyValueRow(
                    label: 'Emergency Phone',
                    value: c.emergencyContactPhone ?? c.phone,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Rental History Section
          SectionHeader(
            title: 'Rental History',
            subtitle: '${customerProv.selectedCustomerRentals.length} total bookings',
            padding: EdgeInsets.zero,
          ),
          const SizedBox(height: AppSpacing.sm),
          if (customerProv.selectedCustomerRentals.isEmpty)
            const EmptyStateWidget(
              icon: Icons.history_rounded,
              title: 'No Completed Bookings',
              description: 'Customer has no prior completed rentals.',
            )
          else
            ...customerProv.selectedCustomerRentals.map(
              (b) => BookingCard(
                booking: b,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => BookingDetailScreen(bookingId: b.id),
                    ),
                  );
                },
              ),
            ),
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }
}
