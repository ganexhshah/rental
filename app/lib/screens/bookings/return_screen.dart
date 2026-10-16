import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';
import '../../core/utils/validators.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/dialogs/confirm_dialog.dart';
import '../../widgets/inputs/app_inputs.dart';
import '../../widgets/inspection/inspection_widgets.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import '../payments/invoice_detail_screen.dart';

class ReturnScreen extends StatefulWidget {
  final Booking booking;

  const ReturnScreen({super.key, required this.booking});

  @override
  State<ReturnScreen> createState() => _ReturnScreenState();
}

class _ReturnScreenState extends State<ReturnScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _odometerController;
  final _notesController = TextEditingController();
  final _damageDescController = TextEditingController();
  final _damageCostController = TextEditingController(text: '0');
  final _depositDeductionController = TextEditingController(text: '0');

  String _fuelLevel = '100%';
  String _customerSignature = '';
  bool _isSubmitting = false;

  // Condition checklist
  bool _exteriorOk = true;
  bool _interiorClean = true;
  bool _accessoriesReturned = true;
  bool _hasNewDamage = false;

  // Photos
  final Map<String, String?> _returnPhotos = {
    'Front Check': 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400',
    'Rear Check': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
    'Odometer In': 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=400',
    'Fuel Gauge': null,
  };

  @override
  void initState() {
    super.initState();
    final pickupOdo = widget.booking.pickupOdometer;
    _odometerController = TextEditingController(text: pickupOdo != null ? '$pickupOdo' : '');
  }

  @override
  void dispose() {
    _odometerController.dispose();
    _notesController.dispose();
    _damageDescController.dispose();
    _damageCostController.dispose();
    _depositDeductionController.dispose();
    super.dispose();
  }

  void _simulateCapturePhoto(String slot) {
    setState(() {
      _returnPhotos[slot] = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400';
    });
    AppToast.showSuccess(context, 'Photo captured for $slot');
  }

  double get _calculatedDamageCost => double.tryParse(_damageCostController.text) ?? 0.0;
  double get _calculatedFuelCharge => _fuelLevel != '100%' ? 1500.0 : 0.0;
  double get _calculatedDeduction => double.tryParse(_depositDeductionController.text) ?? 0.0;
  double get _refundDepositAmount {
    final originalDeposit = widget.booking.depositAmount;
    final refund = originalDeposit - _calculatedDeduction;
    return refund > 0 ? refund : 0.0;
  }

  Future<void> _handleSubmitReturn() async {
    if (!_formKey.currentState!.validate()) {
      AppToast.showError(context, 'Please fix validation errors');
      return;
    }

    if (_customerSignature.isEmpty) {
      AppToast.showError(context, 'Customer signature is required');
      return;
    }

    final confirmed = await ConfirmModalDialog.show(
      context: context,
      title: 'Confirm Return',
      message: 'Complete return for ${widget.booking.bookingCode}?',
      confirmLabel: 'Complete Return',
    );

    if (!confirmed || !mounted) return;

    setState(() => _isSubmitting = true);
    final odo = int.tryParse(_odometerController.text) ?? (widget.booking.pickupOdometer ?? 0);
    final photosList = _returnPhotos.values.whereType<String>().toList();

    final success = await context.read<BookingProvider>().executeReturn(
          bookingId: widget.booking.id,
          odometer: odo,
          fuelLevel: _fuelLevel,
          exteriorCondition: _exteriorOk ? 'Checked OK' : 'Damage reported',
          interiorCondition: _interiorClean ? 'Clean' : 'Dirty',
          photos: photosList,
          notes: _notesController.text.trim(),
          signature: _customerSignature,
          additionalDamages: _calculatedDamageCost,
          fuelCharge: _calculatedFuelCharge,
          damageDescription: _damageDescController.text.trim(),
          depositDeduction: _calculatedDeduction,
          depositRefundNote: _refundDepositAmount > 0
              ? 'Deposit refund Rs. $_refundDepositAmount processed'
              : 'Full deposit retained',
        );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      _showReturnCompletedDialog();
    } else {
      AppToast.showError(
        context,
        context.read<BookingProvider>().errorMessage ?? 'Failed to complete vehicle return',
      );
    }
  }

  void _showReturnCompletedDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.lg),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.successBg,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.task_alt_rounded, color: AppColors.success, size: 48),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Return Completed',
              style: AppTypography.headingMedium.copyWith(color: AppColors.success),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Vehicle returned successfully.',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.xl),
            PrimaryButton(
              label: 'View Invoice',
              icon: Icons.receipt_long_rounded,
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (_) => InvoiceDetailScreen(
                      bookingId: widget.booking.id,
                      bookingCode: widget.booking.bookingCode,
                      customerName: widget.booking.customerName,
                      totalAmount: widget.booking.totalAmount +
                          _calculatedDamageCost +
                          _calculatedFuelCharge,
                      balanceDue: 0.0,
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: AppSpacing.sm),
            SecondaryButton(
              label: 'Done',
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).pop();
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.booking;
    final isOverdue = DateFormatter.isOverdue(b.endDate);
    final pickupOdo = b.pickupOdometer ?? 14000;

    return AppScaffold(
      appBar: AppHeader(
        title: 'Return',
        subtitle: '${b.bookingCode} • ${b.vehiclePlate}',
      ),
      stickyBottomAction: PrimaryButton(
        label: 'Complete Return',
        icon: Icons.check_circle_outline_rounded,
        backgroundColor: AppColors.warning,
        foregroundColor: Colors.black87,
        isLoading: _isSubmitting,
        onPressed: _handleSubmitReturn,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            // 1. Header & Schedule Details
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(b.bookingCode, style: AppTypography.monospace.copyWith(fontWeight: FontWeight.bold, fontSize: 16)),
                        StatusChip(status: b.status),
                      ],
                    ),
                    const Divider(height: AppSpacing.lg),
                    KeyValueRow(
                      label: 'Scheduled Return',
                      value: DateFormatter.formatDateTime(b.endDate),
                    ),
                    if (isOverdue)
                      Container(
                        margin: const EdgeInsets.only(top: AppSpacing.sm),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.errorBg,
                          borderRadius: AppRadius.sm,
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.error),
                            const SizedBox(width: AppSpacing.sm),
                            Text(
                              'Late Return',
                              style: AppTypography.labelSmall.copyWith(color: AppColors.error, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 2. Odometer Reading In
            const SectionHeader(title: 'Odometer', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    KeyValueRow(label: 'Pickup Odometer', value: '$pickupOdo km'),
                    const SizedBox(height: AppSpacing.sm),
                    AppTextField(
                      label: 'Return Odometer (km)',
                      controller: _odometerController,
                      keyboardType: TextInputType.number,
                      prefixIcon: const Icon(Icons.speed_rounded, size: 20),
                      validator: (val) => Validators.odometer(val, previousOdometer: pickupOdo),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 3. Return Fuel Check
            const SectionHeader(title: 'Fuel Level', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    KeyValueRow(label: 'Pickup Fuel', value: b.pickupFuel ?? '100%'),
                    const SizedBox(height: AppSpacing.sm),
                    FuelSelectorWidget(
                      selectedLevel: _fuelLevel,
                      onSelected: (lvl) => setState(() => _fuelLevel = lvl),
                    ),
                    if (_fuelLevel != '100%') ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Refueling fee: Rs. 1,500',
                        style: AppTypography.labelSmall.copyWith(color: AppColors.warning),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 4. Vehicle Condition Checklist
            const SectionHeader(title: 'Vehicle Condition', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    InspectionItemTile(
                      title: 'Exterior Clean',
                      isChecked: _exteriorOk,
                      onChanged: (v) => setState(() => _exteriorOk = v ?? false),
                    ),
                    InspectionItemTile(
                      title: 'Interior Clean',
                      isChecked: _interiorClean,
                      onChanged: (v) => setState(() => _interiorClean = v ?? false),
                    ),
                    InspectionItemTile(
                      title: 'Accessories Returned',
                      isChecked: _accessoriesReturned,
                      onChanged: (v) => setState(() => _accessoriesReturned = v ?? false),
                    ),
                    SwitchListTile(
                      title: Text('Report Damage', style: AppTypography.bodyMedium),
                      value: _hasNewDamage,
                      activeColor: AppColors.error,
                      contentPadding: EdgeInsets.zero,
                      onChanged: (v) => setState(() => _hasNewDamage = v),
                    ),
                    if (_hasNewDamage) ...[
                      const Divider(),
                      AppTextField(
                        label: 'Damage Description',
                        hint: 'Describe damage',
                        controller: _damageDescController,
                        maxLines: 2,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      AppTextField(
                        label: 'Repair Cost (Rs.)',
                        hint: '0',
                        controller: _damageCostController,
                        keyboardType: TextInputType.number,
                        onChanged: (_) => setState(() {}),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 5. Return Photo Verification
            const SectionHeader(
              title: 'Photos',
              padding: EdgeInsets.zero,
            ),
            const SizedBox(height: AppSpacing.sm),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: AppSpacing.sm,
              mainAxisSpacing: AppSpacing.sm,
              childAspectRatio: 1.3,
              children: _returnPhotos.entries.map((e) {
                return PhotoCaptureTile(
                  slotName: e.key,
                  photoUrl: e.value,
                  onCapture: () => _simulateCapturePhoto(e.key),
                  onRemove: e.value != null ? () => setState(() => _returnPhotos[e.key] = null) : null,
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 6. Security Deposit & Final Settlement Summary
            const SectionHeader(title: 'Deposit Settlement', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    KeyValueRow(
                      label: 'Deposit Held',
                      value: CurrencyFormatter.format(b.depositAmount),
                    ),
                    if (_calculatedFuelCharge > 0)
                      KeyValueRow(
                        label: 'Fuel Charge',
                        value: CurrencyFormatter.format(_calculatedFuelCharge),
                        valueStyle: const TextStyle(color: AppColors.error),
                      ),
                    if (_calculatedDamageCost > 0)
                      KeyValueRow(
                        label: 'Damage Charge',
                        value: CurrencyFormatter.format(_calculatedDamageCost),
                        valueStyle: const TextStyle(color: AppColors.error),
                      ),
                    AppTextField(
                      label: 'Deposit Deduction (Rs.)',
                      controller: _depositDeductionController,
                      keyboardType: TextInputType.number,
                      onChanged: (_) => setState(() {}),
                    ),
                    const Divider(height: AppSpacing.lg),
                    KeyValueRow(
                      label: 'Refund Amount',
                      value: CurrencyFormatter.format(_refundDepositAmount),
                      valueStyle: AppTypography.headingSmall.copyWith(
                        color: AppColors.success,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 7. Customer Return Signature
            const SectionHeader(title: 'Customer Signature', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            SignaturePadWidget(
              title: 'Sign below',
              onSigned: (sig) => _customerSignature = sig,
            ),
            const SizedBox(height: AppSpacing.lg),

            // 8. Final Inspection Notes
            AppTextField(
              label: 'Notes',
              hint: 'Optional notes',
              controller: _notesController,
              maxLines: 2,
            ),
            const SizedBox(height: AppSpacing.giant),
          ],
        ),
      ),
    );
  }
}
