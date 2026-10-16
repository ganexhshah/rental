import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
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

class PickupScreen extends StatefulWidget {
  final Booking booking;

  const PickupScreen({super.key, required this.booking});

  @override
  State<PickupScreen> createState() => _PickupScreenState();
}

class _PickupScreenState extends State<PickupScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _odometerController;
  final _notesController = TextEditingController();
  String _fuelLevel = '100%';
  String _customerSignature = '';
  bool _isSubmitting = false;

  // Verification toggles
  bool _idVerified = true;
  bool _licenseVerified = true;
  bool _contractSigned = true;
  bool _exteriorClean = true;
  bool _interiorClean = true;
  bool _tiresGood = true;
  bool _lightsWorking = true;

  // Photo Slots
  final Map<String, String?> _photos = {
    'Front': 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400',
    'Rear': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
    'Left Side': null,
    'Right Side': null,
    'Dashboard / Odometer': 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=400',
    'Interior': null,
  };

  @override
  void initState() {
    super.initState();
    final odo = widget.booking.pickupOdometer;
    _odometerController = TextEditingController(text: odo != null ? '$odo' : '');
  }

  @override
  void dispose() {
    _odometerController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _simulateCapturePhoto(String slot) {
    setState(() {
      _photos[slot] = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400';
    });
    AppToast.showSuccess(context, 'Photo captured for $slot');
  }

  Future<void> _handleSubmitPickup() async {
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
      title: 'Confirm Handover',
      message: 'Start rental for booking ${widget.booking.bookingCode}?',
      confirmLabel: 'Start Rental',
    );

    if (!confirmed || !mounted) return;

    setState(() => _isSubmitting = true);
    final odo = int.tryParse(_odometerController.text) ?? (widget.booking.pickupOdometer ?? 0);
    final photosList = _photos.values.whereType<String>().toList();

    final success = await context.read<BookingProvider>().executePickup(
          bookingId: widget.booking.id,
          odometer: odo,
          fuelLevel: _fuelLevel,
          exteriorCondition: _exteriorClean ? 'Excellent' : 'Needs attention',
          interiorCondition: _interiorClean ? 'Clean' : 'Needs cleaning',
          photos: photosList,
          notes: _notesController.text.trim(),
          signature: _customerSignature,
        );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      _showSuccessDialog();
    } else {
      AppToast.showError(
        context,
        context.read<BookingProvider>().errorMessage ?? 'Failed to execute pickup',
      );
    }
  }

  void _showSuccessDialog() {
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
              child: const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 48),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Rental Started',
              style: AppTypography.headingMedium.copyWith(color: AppColors.success),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Vehicle handover completed successfully.',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.xl),
            PrimaryButton(
              label: 'View Handover PDF',
              icon: Icons.picture_as_pdf_rounded,
              onPressed: () {
                Navigator.of(ctx).pop();
                AppToast.showInfo(context, 'Handover PDF generated.');
                Navigator.of(context).pop();
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

    return AppScaffold(
      appBar: AppHeader(
        title: 'Pickup',
        subtitle: '${b.bookingCode} • ${b.vehiclePlate}',
      ),
      stickyBottomAction: PrimaryButton(
        label: 'Start Rental',
        icon: Icons.key_rounded,
        isLoading: _isSubmitting,
        onPressed: _handleSubmitPickup,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            // 1. Header & Status
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(b.bookingCode, style: AppTypography.monospace.copyWith(fontWeight: FontWeight.bold, fontSize: 16)),
                    StatusChip(status: b.status),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 2. Customer Identity & Verification Card
            const SectionHeader(title: 'Customer Verification', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    KeyValueRow(label: 'Customer', value: b.customerName),
                    if (b.customerPhone.isNotEmpty)
                      KeyValueRow(label: 'Phone', value: b.customerPhone),
                    InspectionItemTile(
                      title: 'ID / Passport Verified',
                      isChecked: _idVerified,
                      onChanged: (v) => setState(() => _idVerified = v ?? false),
                    ),
                    InspectionItemTile(
                      title: 'Driving License Verified',
                      isChecked: _licenseVerified,
                      onChanged: (v) => setState(() => _licenseVerified = v ?? false),
                    ),
                    InspectionItemTile(
                      title: 'Rental Agreement Confirmed',
                      isChecked: _contractSigned,
                      onChanged: (v) => setState(() => _contractSigned = v ?? false),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 3. Vehicle Condition Checklist
            const SectionHeader(title: 'Vehicle Condition', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    InspectionItemTile(
                      title: 'Exterior Clean',
                      isChecked: _exteriorClean,
                      onChanged: (v) => setState(() => _exteriorClean = v ?? false),
                    ),
                    InspectionItemTile(
                      title: 'Interior Clean',
                      isChecked: _interiorClean,
                      onChanged: (v) => setState(() => _interiorClean = v ?? false),
                    ),
                    InspectionItemTile(
                      title: 'Tires & Spare Wheel',
                      isChecked: _tiresGood,
                      onChanged: (v) => setState(() => _tiresGood = v ?? false),
                    ),
                    InspectionItemTile(
                      title: 'Lights & Horn Working',
                      isChecked: _lightsWorking,
                      onChanged: (v) => setState(() => _lightsWorking = v ?? false),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 4. Photo Grid
            const SectionHeader(
              title: 'Photos',
              padding: EdgeInsets.zero,
            ),
            const SizedBox(height: AppSpacing.sm),
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: AppSpacing.sm,
              mainAxisSpacing: AppSpacing.sm,
              children: _photos.entries.map((e) {
                return PhotoCaptureTile(
                  slotName: e.key,
                  photoUrl: e.value,
                  isRequired: true,
                  onCapture: () => _simulateCapturePhoto(e.key),
                  onRemove: e.value != null ? () => setState(() => _photos[e.key] = null) : null,
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 5. Odometer and Fuel Fields
            const SectionHeader(title: 'Odometer & Fuel', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    AppTextField(
                      label: 'Odometer (km)',
                      hint: '0',
                      controller: _odometerController,
                      keyboardType: TextInputType.number,
                      prefixIcon: const Icon(Icons.speed_rounded, size: 20),
                      validator: Validators.odometer,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    FuelSelectorWidget(
                      selectedLevel: _fuelLevel,
                      onSelected: (lvl) => setState(() => _fuelLevel = lvl),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 6. Security Deposit & Balance Summary
            const SectionHeader(title: 'Payment & Deposit', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    KeyValueRow(
                      label: 'Deposit',
                      value: CurrencyFormatter.format(b.depositAmount),
                      valueStyle: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const KeyValueRow(
                      label: 'Deposit Status',
                      value: 'Confirmed',
                      valueStyle: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold),
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
            const SizedBox(height: AppSpacing.lg),

            // 7. Customer Handover Signature Pad
            const SectionHeader(title: 'Customer Signature', padding: EdgeInsets.zero),
            const SizedBox(height: AppSpacing.sm),
            SignaturePadWidget(
              title: 'Sign below',
              onSigned: (sig) => _customerSignature = sig,
            ),
            const SizedBox(height: AppSpacing.lg),

            // 8. Operational Handover Notes
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
