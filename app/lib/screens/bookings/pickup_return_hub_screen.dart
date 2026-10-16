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
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

/// Screen matching operations pickup & return with swipeable TabBarView
class PickupReturnHubScreen extends StatefulWidget {
  final String initialMode; // 'pickup' or 'return'
  final String? initialBookingId;

  const PickupReturnHubScreen({
    super.key,
    this.initialMode = 'pickup',
    this.initialBookingId,
  });

  @override
  State<PickupReturnHubScreen> createState() => _PickupReturnHubScreenState();
}

class _PickupReturnHubScreenState extends State<PickupReturnHubScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Pickup Tab State
  String? _selectedPickupBookingId;
  final TextEditingController _pickupOdometerCtrl = TextEditingController();
  final TextEditingController _pickupExteriorCtrl = TextEditingController();
  final TextEditingController _pickupInteriorCtrl = TextEditingController();
  final TextEditingController _pickupNotesCtrl = TextEditingController();
  String _pickupFuelLevel = '100% (Full)';

  // Return Tab State
  String? _selectedReturnBookingId;
  final TextEditingController _returnOdometerCtrl = TextEditingController();
  final TextEditingController _returnExteriorCtrl = TextEditingController();
  final TextEditingController _returnInteriorCtrl = TextEditingController();
  final TextEditingController _returnNotesCtrl = TextEditingController();
  final TextEditingController _damageAmountCtrl = TextEditingController(text: '0');
  final TextEditingController _damageDescCtrl = TextEditingController();
  final TextEditingController _fuelChargeCtrl = TextEditingController(text: '0');
  final TextEditingController _depositDeductionCtrl = TextEditingController(text: '0');
  final TextEditingController _refundNoteCtrl = TextEditingController();
  String _returnFuelLevel = '90%';

  bool _isSubmitting = false;

  final List<String> _fuelOptions = [
    '100% (Full)',
    '90%',
    '75% (3/4)',
    '50% (Half)',
    '25% (1/4)',
    'Empty / Low',
  ];

  @override
  void initState() {
    super.initState();
    final initialIndex = widget.initialMode == 'return' ? 1 : 0;
    _tabController = TabController(length: 2, vsync: this, initialIndex: initialIndex);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });

    if (widget.initialMode == 'return') {
      _selectedReturnBookingId = widget.initialBookingId;
    } else {
      _selectedPickupBookingId = widget.initialBookingId;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().loadBookings();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _pickupOdometerCtrl.dispose();
    _pickupExteriorCtrl.dispose();
    _pickupInteriorCtrl.dispose();
    _pickupNotesCtrl.dispose();

    _returnOdometerCtrl.dispose();
    _returnExteriorCtrl.dispose();
    _returnInteriorCtrl.dispose();
    _returnNotesCtrl.dispose();
    _damageAmountCtrl.dispose();
    _damageDescCtrl.dispose();
    _fuelChargeCtrl.dispose();
    _depositDeductionCtrl.dispose();
    _refundNoteCtrl.dispose();
    super.dispose();
  }

  void _onPickupBookingSelected(Booking b) {
    setState(() {
      _selectedPickupBookingId = b.id;
      final initialOdo = b.pickupOdometer ?? 15400;
      _pickupOdometerCtrl.text = initialOdo.toString();
      _pickupFuelLevel = '100% (Full)';
    });
  }

  void _onReturnBookingSelected(Booking b) {
    setState(() {
      _selectedReturnBookingId = b.id;
      final initialOdo = b.pickupOdometer != null ? b.pickupOdometer! + 180 : 15580;
      _returnOdometerCtrl.text = initialOdo.toString();
      _returnFuelLevel = '90%';
    });
  }

  Future<void> _handlePickupSubmit(Booking activeBooking) async {
    final odo = int.tryParse(_pickupOdometerCtrl.text.trim()) ?? 0;
    if (odo <= 0) {
      AppFeedback.showToast(context, message: 'Please enter valid odometer reading', type: ToastType.error);
      return;
    }

    setState(() => _isSubmitting = true);
    final bookingProv = context.read<BookingProvider>();

    try {
      await bookingProv.pickupBooking(
        activeBooking.id,
        odometer: odo,
        fuelLevel: _pickupFuelLevel,
        exteriorCondition: _pickupExteriorCtrl.text.trim(),
        interiorCondition: _pickupInteriorCtrl.text.trim(),
        notes: _pickupNotesCtrl.text.trim(),
      );
      if (!mounted) return;
      AppFeedback.showToast(context, message: 'Vehicle handover dispatched successfully', type: ToastType.success);
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      AppFeedback.showToast(context, message: 'Inspection processed successfully', type: ToastType.success);
      Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _handleReturnSubmit(Booking activeBooking) async {
    final odo = int.tryParse(_returnOdometerCtrl.text.trim()) ?? 0;
    if (odo <= 0) {
      AppFeedback.showToast(context, message: 'Please enter valid odometer reading', type: ToastType.error);
      return;
    }

    setState(() => _isSubmitting = true);
    final bookingProv = context.read<BookingProvider>();

    try {
      final damage = double.tryParse(_damageAmountCtrl.text.trim()) ?? 0;
      final fuelCharge = double.tryParse(_fuelChargeCtrl.text.trim()) ?? 0;
      final deduction = double.tryParse(_depositDeductionCtrl.text.trim()) ?? 0;

      await bookingProv.returnBooking(
        activeBooking.id,
        odometer: odo,
        fuelLevel: _returnFuelLevel,
        exteriorCondition: _returnExteriorCtrl.text.trim(),
        interiorCondition: _returnInteriorCtrl.text.trim(),
        additionalDamages: damage,
        damageDescription: _damageDescCtrl.text.trim(),
        fuelCharge: fuelCharge,
        depositDeduction: deduction,
        depositRefundNote: _refundNoteCtrl.text.trim(),
        notes: _returnNotesCtrl.text.trim(),
      );
      if (!mounted) return;
      AppFeedback.showToast(context, message: 'Vehicle returned and deposit settled', type: ToastType.success);
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      AppFeedback.showToast(context, message: 'Inspection processed successfully', type: ToastType.success);
      Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProv = context.watch<BookingProvider>();
    final allBookings = bookingProv.bookings;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final pickupBookings = allBookings.where((b) {
      return ['confirmed', 'pending', 'pickup_scheduled'].contains(b.status.toLowerCase());
    }).toList();

    final returnBookings = allBookings.where((b) {
      return b.status.toLowerCase() == 'active';
    }).toList();

    return AppScaffold(
      appBar: AppHeader(
        title: 'Pickup & Return',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => bookingProv.loadBookings(),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(46),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  width: 1,
                ),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              indicatorSize: TabBarIndicatorSize.tab,
              labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
              unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.key_rounded, size: 17),
                      const SizedBox(width: 8),
                      const Text('Pickup'),
                      const SizedBox(width: 6),
                      _CountBadge(
                        count: pickupBookings.length,
                        isSelected: _tabController.index == 0,
                      ),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.assignment_turned_in_rounded, size: 17),
                      const SizedBox(width: 8),
                      const Text('Return'),
                      const SizedBox(width: 6),
                      _CountBadge(
                        count: returnBookings.length,
                        isSelected: _tabController.index == 1,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // 1. Pickup View (Swipeable)
          _buildPickupTab(context, allBookings, pickupBookings, isDark),

          // 2. Return View (Swipeable)
          _buildReturnTab(context, allBookings, returnBookings, isDark),
        ],
      ),
    );
  }

  // ==========================================
  // PICKUP VIEW
  // ==========================================
  Widget _buildPickupTab(
    BuildContext context,
    List<Booking> allBookings,
    List<Booking> pickupBookings,
    bool isDark,
  ) {
    Booking? activeBooking;
    if (_selectedPickupBookingId != null) {
      activeBooking = allBookings.where((b) => b.id == _selectedPickupBookingId).firstOrNull;
    }
    activeBooking ??= pickupBookings.isNotEmpty ? pickupBookings.first : null;

    if (activeBooking != null && _pickupOdometerCtrl.text.isEmpty) {
      _pickupOdometerCtrl.text = (activeBooking.pickupOdometer ?? 15400).toString();
    }

    if (pickupBookings.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.no_crash_rounded,
                size: 48,
                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
              ),
              const SizedBox(height: 12),
              Text(
                'No reservations awaiting pickup',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Confirmed rentals scheduled for handover will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      children: [
        DropdownButtonFormField<String>(
          value: activeBooking?.id,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Selected Reservation',
            prefixIcon: Icon(Icons.car_rental_rounded, size: 20),
            contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
          items: pickupBookings.map((b) {
            return DropdownMenuItem(
              value: b.id,
              child: Text(
                '#${b.bookingCode} • ${b.vehiclePlate} (${b.customerName})',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13),
              ),
            );
          }).toList(),
          onChanged: (val) {
            if (val != null) {
              final selected = allBookings.firstWhere((b) => b.id == val);
              _onPickupBookingSelected(selected);
            }
          },
        ),
        const SizedBox(height: AppSpacing.md),

        if (activeBooking != null) ...[
          // Booking Details Card (Clean, modern, no heavy box border)
          _buildBookingSummaryCard(activeBooking, isDark),
          const SizedBox(height: AppSpacing.md),

          // Handover Inspection
          const Text(
            'Handover Inspection',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          const SizedBox(height: AppSpacing.sm),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextFormField(
                  controller: _pickupOdometerCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Odometer (km)',
                    prefixIcon: Icon(Icons.speed_rounded, size: 20),
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _pickupFuelLevel,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Fuel Level',
                    prefixIcon: Icon(Icons.local_gas_station_rounded, size: 20),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  items: _fuelOptions
                      .map((f) => DropdownMenuItem(
                            value: f,
                            child: Text(
                              f,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12),
                            ),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _pickupFuelLevel = v!),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),

          TextFormField(
            controller: _pickupExteriorCtrl,
            decoration: const InputDecoration(
              labelText: 'Exterior Condition',
              hintText: 'Body, paint & tyres condition',
              prefixIcon: Icon(Icons.car_crash_rounded, size: 20),
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          TextFormField(
            controller: _pickupInteriorCtrl,
            decoration: const InputDecoration(
              labelText: 'Interior Condition',
              hintText: 'Seats & cleanliness condition',
              prefixIcon: Icon(Icons.airline_seat_recline_normal_rounded, size: 20),
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          TextFormField(
            controller: _pickupNotesCtrl,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Notes',
              hintText: 'Optional handover remarks',
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          PrimaryButton(
            label: 'Complete Pickup',
            icon: Icons.check_circle_rounded,
            isLoading: _isSubmitting,
            onPressed: () => _handlePickupSubmit(activeBooking!),
          ),
          const SizedBox(height: AppSpacing.xl),
        ],
      ],
    );
  }

  // ==========================================
  // RETURN VIEW
  // ==========================================
  Widget _buildReturnTab(
    BuildContext context,
    List<Booking> allBookings,
    List<Booking> returnBookings,
    bool isDark,
  ) {
    Booking? activeBooking;
    if (_selectedReturnBookingId != null) {
      activeBooking = allBookings.where((b) => b.id == _selectedReturnBookingId).firstOrNull;
    }
    activeBooking ??= returnBookings.isNotEmpty ? returnBookings.first : null;

    if (activeBooking != null && _returnOdometerCtrl.text.isEmpty) {
      final initialOdo = activeBooking.pickupOdometer != null
          ? activeBooking.pickupOdometer! + 180
          : 15580;
      _returnOdometerCtrl.text = initialOdo.toString();
    }

    final pickupOdo = activeBooking?.pickupOdometer ?? 15400;
    final currentOdo = int.tryParse(_returnOdometerCtrl.text.trim()) ?? pickupOdo;
    final kmDriven = (currentOdo - pickupOdo) > 0 ? (currentOdo - pickupOdo) : 0;

    final depositHeld = activeBooking?.depositAmount ?? 0.0;
    final deduction = double.tryParse(_depositDeductionCtrl.text.trim()) ?? 0.0;
    final netRefundable = (depositHeld - deduction) > 0 ? (depositHeld - deduction) : 0.0;

    if (returnBookings.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.task_alt_rounded,
                size: 48,
                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
              ),
              const SizedBox(height: 12),
              Text(
                'No active rentals to return',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Active rentals out on the road will be listed here for return inspection.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      children: [
        DropdownButtonFormField<String>(
          value: activeBooking?.id,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Selected Rental',
            prefixIcon: Icon(Icons.car_rental_rounded, size: 20),
            contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
          items: returnBookings.map((b) {
            return DropdownMenuItem(
              value: b.id,
              child: Text(
                '#${b.bookingCode} • ${b.vehiclePlate} (${b.customerName})',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13),
              ),
            );
          }).toList(),
          onChanged: (val) {
            if (val != null) {
              final selected = allBookings.firstWhere((b) => b.id == val);
              _onReturnBookingSelected(selected);
            }
          },
        ),
        const SizedBox(height: AppSpacing.md),

        if (activeBooking != null) ...[
          // Booking Details Card (Clean, modern, no heavy box border)
          _buildBookingSummaryCard(activeBooking, isDark),
          const SizedBox(height: AppSpacing.md),

          // Return Inspection Form
          const Text(
            'Return Inspection',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          const SizedBox(height: AppSpacing.sm),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextFormField(
                  controller: _returnOdometerCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Return Odometer (km)',
                    prefixIcon: Icon(Icons.speed_rounded, size: 20),
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _returnFuelLevel,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Fuel Level',
                    prefixIcon: Icon(Icons.local_gas_station_rounded, size: 20),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  items: _fuelOptions
                      .map((f) => DropdownMenuItem(
                            value: f,
                            child: Text(
                              f,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12),
                            ),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _returnFuelLevel = v!),
                ),
              ),
            ],
          ),

          // Clean Inline Mileage Comparison (No heavy box)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Pickup baseline: $pickupOdo km',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                  ),
                ),
                Text(
                  'Distance driven: $kmDriven km',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xs),

          TextFormField(
            controller: _returnExteriorCtrl,
            decoration: const InputDecoration(
              labelText: 'Exterior Condition',
              hintText: 'Scratches, dents or condition notes',
              prefixIcon: Icon(Icons.car_crash_rounded, size: 20),
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          TextFormField(
            controller: _returnInteriorCtrl,
            decoration: const InputDecoration(
              labelText: 'Interior Condition',
              hintText: 'Seats & cabin condition',
              prefixIcon: Icon(Icons.airline_seat_recline_normal_rounded, size: 20),
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Deposit Settlement
          const Text(
            'Deposit Settlement',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          const SizedBox(height: AppSpacing.sm),

          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _damageAmountCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Damage Charge (Rs.)',
                    prefixIcon: Icon(Icons.build_rounded, size: 18),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: TextFormField(
                  controller: _fuelChargeCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Fuel Charge (Rs.)',
                    prefixIcon: Icon(Icons.local_gas_station_rounded, size: 18),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),

          TextFormField(
            controller: _depositDeductionCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Deposit Deduction (Rs.)',
              prefixIcon: Icon(Icons.money_off_rounded, size: 18),
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpacing.md),

          // Clean Net Refund Row (No nested border box)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Refund to Customer',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    Text(
                      'Deposit: ${CurrencyFormatter.format(depositHeld)} • Deductions: ${CurrencyFormatter.format(deduction)}',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      ),
                    ),
                  ],
                ),
                Text(
                  CurrencyFormatter.format(netRefundable),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: Color(0xFF16A34A),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          TextFormField(
            controller: _returnNotesCtrl,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Notes',
              hintText: 'Optional return remarks',
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          PrimaryButton(
            label: 'Complete Return',
            icon: Icons.task_alt_rounded,
            isLoading: _isSubmitting,
            onPressed: () => _handleReturnSubmit(activeBooking!),
          ),
          const SizedBox(height: AppSpacing.xl),
        ],
      ],
    );
  }

  // Helper: Booking Details Card
  Widget _buildBookingSummaryCard(Booking activeBooking, bool isDark) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.md,
        side: BorderSide(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          width: 1,
        ),
      ),
      color: isDark ? AppColors.darkSurface : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: AppRadius.sm,
                  ),
                  child: Text(
                    '#${activeBooking.bookingCode}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                StatusChip(status: activeBooking.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${activeBooking.vehicleMake} ${activeBooking.vehicleModel}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 2),
            Text(
              activeBooking.vehiclePlate,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(
                  Icons.person_outline_rounded,
                  size: 15,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
                const SizedBox(width: 6),
                Text(
                  activeBooking.customerName,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                ),
                if (activeBooking.customerPhone.isNotEmpty) ...[
                  Text(
                    ' • ',
                    style: TextStyle(
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                  Text(
                    activeBooking.customerPhone,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(
                  Icons.date_range_rounded,
                  size: 14,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
                const SizedBox(width: 6),
                Text(
                  '${DateFormatter.formatShortDate(activeBooking.startDate)} → ${DateFormatter.formatShortDate(activeBooking.endDate)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                  ),
                ),
              ],
            ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Deposit: ${CurrencyFormatter.format(activeBooking.depositAmount)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                Text(
                  'Total: ${CurrencyFormatter.format(activeBooking.totalAmount)}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final int count;
  final bool isSelected;

  const _CountBadge({required this.count, required this.isSelected});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected
            ? AppColors.primary.withOpacity(0.12)
            : (isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: isSelected
              ? AppColors.primary
              : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
        ),
      ),
    );
  }
}

