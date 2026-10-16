import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/dialogs/confirm_dialog.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class InvoiceDetailScreen extends StatelessWidget {
  final String bookingId;
  final String bookingCode;
  final String customerName;
  final double totalAmount;
  final double balanceDue;

  const InvoiceDetailScreen({
    super.key,
    required this.bookingId,
    required this.bookingCode,
    required this.customerName,
    required this.totalAmount,
    required this.balanceDue,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AppScaffold(
      appBar: AppHeader(
        title: 'Tax Invoice',
        subtitle: 'INV-$bookingCode',
        actions: [
          IconButton(
            icon: const Icon(Icons.share_rounded),
            onPressed: () => AppToast.showInfo(context, 'Sharing PDF document...'),
          ),
          IconButton(
            icon: const Icon(Icons.print_rounded),
            onPressed: () => AppToast.showInfo(context, 'Sending to thermal/system printer...'),
          ),
        ],
      ),
      stickyBottomAction: balanceDue > 0
          ? PrimaryButton(
              label: 'RECORD CASH / QR PAYMENT',
              icon: Icons.point_of_sale_rounded,
              onPressed: () async {
                final confirm = await ConfirmModalDialog.show(
                  context: context,
                  title: 'Record Payment of ${CurrencyFormatter.format(balanceDue)}',
                  message: 'Mark outstanding balance as collected and issue receipt?',
                  confirmLabel: 'Record Payment',
                );
                if (confirm && context.mounted) {
                  AppToast.showSuccess(context, 'Payment of ${CurrencyFormatter.format(balanceDue)} recorded.');
                  Navigator.of(context).pop();
                }
              },
            )
          : null,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // Invoice Meta Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'INV-${bookingCode.replaceAll("BK-", "")}',
                        style: AppTypography.headingSmall.copyWith(
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      StatusChip(status: balanceDue <= 0 ? 'paid' : 'unpaid'),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'ISSUED BY: Himalayan Rides Nepal (Pvt.) Ltd.',
                    style: AppTypography.labelSmall.copyWith(
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                  Text(
                    'PAN / VAT NO: 601234567 • Lazimpat, Kathmandu',
                    style: AppTypography.bodySmall.copyWith(
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                  const Divider(height: AppSpacing.lg),
                  KeyValueRow(label: 'Billed To', value: customerName),
                  KeyValueRow(label: 'Booking Reference', value: bookingCode),
                  KeyValueRow(label: 'Invoice Date', value: DateFormatter.formatDate(DateTime.now())),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Line Items
          const SectionHeader(title: 'Itemized Breakdown', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(
                    label: 'Base Vehicle Rental Duration',
                    value: CurrencyFormatter.format(totalAmount * 0.75),
                  ),
                  KeyValueRow(
                    label: 'Collision Damage Waiver (CDW)',
                    value: CurrencyFormatter.format(totalAmount * 0.10),
                  ),
                  KeyValueRow(
                    label: 'VAT @ 13% (Govt. of Nepal)',
                    value: CurrencyFormatter.format(totalAmount * 0.15),
                  ),
                  const Divider(height: AppSpacing.lg),
                  KeyValueRow(
                    label: 'Grand Total (NPR)',
                    value: CurrencyFormatter.format(totalAmount),
                    valueStyle: AppTypography.headingSmall.copyWith(
                      color: AppColors.primaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  KeyValueRow(
                    label: 'Amount Collected',
                    value: CurrencyFormatter.format(totalAmount - balanceDue),
                    valueStyle: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold),
                  ),
                  KeyValueRow(
                    label: 'Outstanding Balance',
                    value: CurrencyFormatter.format(balanceDue),
                    valueStyle: TextStyle(
                      color: balanceDue > 0 ? AppColors.warning : AppColors.success,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          // Document Viewer Button
          SecondaryButton(
            label: 'Open Full-Screen Signed PDF',
            icon: Icons.picture_as_pdf_rounded,
            onPressed: () {
              AppToast.showInfo(context, 'Launching system PDF viewer...');
            },
          ),
        ],
      ),
    );
  }
}
