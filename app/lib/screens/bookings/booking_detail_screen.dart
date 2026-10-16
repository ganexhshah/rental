import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/dialogs/confirm_dialog.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/sheets/bottom_sheets.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import '../payments/invoice_detail_screen.dart';
import 'pickup_screen.dart';
import 'return_screen.dart';

class BookingDetailScreen extends StatefulWidget {
  final String bookingId;

  const BookingDetailScreen({super.key, required this.bookingId});

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  Booking? _booking;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() => _isLoading = true);
    final prov = context.read<BookingProvider>();
    final result = await prov.loadBookingDetail(widget.bookingId);
    if (mounted) {
      setState(() {
        _booking = result;
        _isLoading = false;
      });
    }
  }

  void _openSecondaryActions() {
    if (_booking == null) return;
    final b = _booking!;

    AppActionSheet.show(
      context: context,
      title: 'Booking Actions',
      subtitle: b.bookingCode,
      items: [
        if (b.status == 'confirmed' || b.status == 'pending')
          ActionSheetItem(
            title: 'Cancel Booking',
            subtitle: 'Release reserved inventory',
            icon: Icons.cancel_rounded,
            isDestructive: true,
            onTap: () async {
              final reason = await ReasonInputDialog.show(
                context: context,
                title: 'Cancel Booking',
                hint: 'Reason for cancellation (e.g. customer request)...',
              );
              if (reason != null && mounted) {
                final ok = await context
                    .read<BookingProvider>()
                    .cancelBooking(b.id, reason: reason);
                if (ok) {
                  AppToast.showSuccess(context, 'Booking cancelled successfully');
                  _loadDetail();
                }
              }
            },
          ),
        ActionSheetItem(
          title: 'View Invoices & Payments',
          subtitle: 'Billing and transaction history',
          icon: Icons.receipt_long_rounded,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => InvoiceDetailScreen(
                  bookingId: b.id,
                  bookingCode: b.bookingCode,
                  customerName: b.customerName,
                  totalAmount: b.totalAmount,
                  balanceDue: b.balanceDue,
                ),
              ),
            );
          },
        ),
        ActionSheetItem(
          title: 'Contact Customer',
          subtitle: b.customerPhone.isNotEmpty ? b.customerPhone : b.customerEmail,
          icon: Icons.phone_rounded,
          onTap: () {
            AppToast.showInfo(context, 'Call initiator: ${b.customerPhone}');
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const AppScaffold(
        appBar: AppHeader(title: 'Booking Details'),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_booking == null) {
      return AppScaffold(
        appBar: const AppHeader(title: 'Booking Details'),
        body: ErrorStateWidget(
          title: 'Booking Not Found',
          message: 'The requested reservation ID could not be retrieved from the server.',
          onRetry: _loadDetail,
        ),
      );
    }

    final b = _booking!;

    // Sticky bottom action widget based on lifecycle
    Widget? stickyAction;
    if (b.isPickupReady) {
      stickyAction = PrimaryButton(
        label: 'Start Pickup',
        icon: Icons.key_rounded,
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => PickupScreen(booking: b)),
          );
          _loadDetail();
        },
      );
    } else if (b.isReturnReady) {
      stickyAction = PrimaryButton(
        label: 'Process Return',
        icon: Icons.assignment_return_rounded,
        backgroundColor: AppColors.warning,
        foregroundColor: Colors.black87,
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ReturnScreen(booking: b)),
          );
          _loadDetail();
        },
      );
    }

    return AppScaffold(
      appBar: AppHeader(
        title: b.bookingCode,
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert_rounded),
            onPressed: _openSecondaryActions,
          ),
        ],
      ),
      stickyBottomAction: stickyAction,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // Status Overview Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Booking Status', style: AppTypography.labelSmall),
                      StatusChip(status: b.status),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Payment Status', style: AppTypography.labelSmall),
                      StatusChip(status: b.paymentStatus),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Customer Section
          SectionHeader(
            title: 'Customer Details',
            padding: EdgeInsets.zero,
            trailing: StatusChip(status: b.customerKycStatus ?? 'verified'),
          ),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(label: 'Full Name', value: b.customerName),
                  if (b.customerPhone.isNotEmpty)
                    KeyValueRow(label: 'Phone', value: b.customerPhone),
                  if (b.customerEmail.isNotEmpty)
                    KeyValueRow(label: 'Email', value: b.customerEmail),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Vehicle Section
          const SectionHeader(title: 'Assigned Vehicle', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(label: 'Make & Model', value: '${b.vehicleMake} ${b.vehicleModel}'),
                  KeyValueRow(
                    label: 'Plate Number',
                    value: b.vehiclePlate,
                    valueStyle: AppTypography.monospace.copyWith(fontWeight: FontWeight.bold),
                  ),
                  if (b.categoryName != null)
                    KeyValueRow(label: 'Category', value: b.categoryName!),
                  if (b.pickupOdometer != null)
                    KeyValueRow(label: 'Pickup Odometer', value: '${b.pickupOdometer} km'),
                  if (b.returnOdometer != null)
                    KeyValueRow(label: 'Return Odometer', value: '${b.returnOdometer} km'),
                  if (b.pickupFuel != null)
                    KeyValueRow(label: 'Pickup Fuel', value: b.pickupFuel!),
                  if (b.returnFuel != null)
                    KeyValueRow(label: 'Return Fuel', value: b.returnFuel!),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Schedule & Locations Section
          const SectionHeader(title: 'Schedule & Locations', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(
                    label: 'Scheduled Pickup',
                    value: DateFormatter.formatDateTime(b.startDate),
                  ),
                  KeyValueRow(label: 'Pickup Branch', value: b.pickupLocation),
                  const SizedBox(height: AppSpacing.sm),
                  KeyValueRow(
                    label: 'Scheduled Return',
                    value: DateFormatter.formatDateTime(b.endDate),
                  ),
                  KeyValueRow(label: 'Return Branch', value: b.returnLocation),
                  if (b.actualPickupAt != null)
                    KeyValueRow(
                      label: 'Actual Handover',
                      value: DateFormatter.formatDateTime(b.actualPickupAt),
                    ),
                  if (b.actualReturnAt != null)
                    KeyValueRow(
                      label: 'Actual Return',
                      value: DateFormatter.formatDateTime(b.actualReturnAt),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Authoritative Pricing Snapshot Section
          const SectionHeader(title: 'Financial Breakdown', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(
                    label: 'Rental Rate',
                    value: CurrencyFormatter.format(b.rentalAmount),
                  ),
                  if (b.insuranceAmount > 0)
                    KeyValueRow(
                      label: 'Insurance',
                      value: CurrencyFormatter.format(b.insuranceAmount),
                    ),
                  if (b.taxAmount > 0)
                    KeyValueRow(
                      label: 'Tax (VAT 13%)',
                      value: CurrencyFormatter.format(b.taxAmount),
                    ),
                  if (b.extraCharges > 0)
                    KeyValueRow(
                      label: 'Extra Charges',
                      value: CurrencyFormatter.format(b.extraCharges),
                    ),
                  if (b.depositAmount > 0)
                    KeyValueRow(
                      label: 'Security Deposit',
                      value: CurrencyFormatter.format(b.depositAmount),
                    ),
                  const Divider(),
                  KeyValueRow(
                    label: 'Total Amount',
                    value: CurrencyFormatter.format(b.totalAmount),
                    valueStyle: AppTypography.headingSmall.copyWith(
                      color: AppColors.primaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  KeyValueRow(
                    label: 'Paid to Date',
                    value: CurrencyFormatter.format(b.paidAmount),
                    valueStyle: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold),
                  ),
                  KeyValueRow(
                    label: 'Balance Due',
                    value: CurrencyFormatter.format(b.balanceDue),
                    valueStyle: TextStyle(
                      color: b.balanceDue > 0 ? AppColors.warning : AppColors.success,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }
}
