import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/customer_model.dart';
import '../../models/vehicle_model.dart';
import '../../providers/booking_provider.dart';
import '../../providers/customer_provider.dart';
import '../../providers/fleet_provider.dart';
import '../buttons/app_buttons.dart';
import '../data/app_data_display.dart';
import '../feedback/app_feedback.dart';
import 'add_customer_sheet.dart';

/// Modal bottom sheet matching http://localhost:3000/operations/bookings/new
class CreateBookingSheet extends StatefulWidget {
  const CreateBookingSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const CreateBookingSheet(),
    );
  }

  @override
  State<CreateBookingSheet> createState() => _CreateBookingSheetState();
}

class _CreateBookingSheetState extends State<CreateBookingSheet> {
  // Form State
  String? _selectedCustomerId;
  String? _selectedVehicleId;
  String _vehicleTypeFilter = 'all';

  DateTime _startDate = DateTime.now().add(const Duration(hours: 2));
  DateTime _endDate = DateTime.now().add(const Duration(days: 3, hours: 2));

  // Rate & Options
  String _ratePlan = 'daily';
  double? _customDailyRate;
  bool _vatEnabled = true;
  bool _withInsurance = true;

  // Collateral / Security
  String _collateralType = 'bank_cheque';
  String _chequeBankName = 'Nabil Bank Ltd.';
  final TextEditingController _chequeNumberController = TextEditingController();
  final TextEditingController _chequeHolderController = TextEditingController();
  bool _isBlankCheque = true;
  final TextEditingController _chequeAmountController = TextEditingController();

  // Payment
  String _paymentOption = 'unpaid';
  String _paymentMethod = 'fonepay';
  final TextEditingController _advanceAmountController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();

  bool _isSubmitting = false;

  static const List<String> _nepalBanks = [
    'Nabil Bank Ltd.',
    'Global IME Bank Ltd.',
    'NIC Asia Bank Ltd.',
    'Himalayan Bank Ltd.',
    'Everest Bank Ltd.',
    'Prabhu Bank Ltd.',
    'Standard Chartered Bank Nepal Ltd.',
    'Nepal Investment Mega Bank Ltd. (NIMB)',
    'Rastriya Banijya Bank Ltd.',
    'Sanima Bank Ltd.',
    'Siddhartha Bank Ltd.',
    'Citizens Bank International Ltd.',
    'Kumari Bank Ltd.',
    'Laxmi Sunrise Bank Ltd.',
    'Machhapuchchhre Bank Ltd.',
    'Prime Commercial Bank Ltd.',
    'Nepal Bank Ltd.',
  ];

  static const String _defaultLocationId = '04f70790-dc1a-41fc-901a-ef68e56f5f91';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CustomerProvider>().loadCustomers();
      context.read<FleetProvider>().loadVehicles();
    });
  }

  @override
  void dispose() {
    _chequeNumberController.dispose();
    _chequeHolderController.dispose();
    _chequeAmountController.dispose();
    _advanceAmountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  int get _rentalDays {
    final diff = _endDate.difference(_startDate);
    final days = (diff.inHours / 24).ceil();
    return days < 1 ? 1 : days;
  }

  double _calculateBaseRate(Vehicle? v) {
    if (v == null) return 0.0;
    if (_ratePlan == 'custom' && _customDailyRate != null) {
      return _customDailyRate!;
    }
    if (_ratePlan == 'weekly') {
      return v.dailyRate * 0.90; // 10% discount for weekly
    }
    if (_ratePlan == 'monthly') {
      return v.dailyRate * 0.80; // 20% discount for monthly
    }
    return v.dailyRate;
  }

  double _calculateDeposit(Vehicle? v) {
    if (v == null) return 0.0;
    return (v.depositAmount > 0) ? v.depositAmount : 15000.0;
  }

  double _calculateRentalTotal(Vehicle? v) {
    return _calculateBaseRate(v) * _rentalDays;
  }

  double _calculateInsurance(Vehicle? v) {
    if (!_withInsurance) return 0.0;
    return _calculateRentalTotal(v) * 0.10;
  }

  double _calculateVat(Vehicle? v) {
    if (!_vatEnabled) return 0.0;
    return (_calculateRentalTotal(v) + _calculateInsurance(v)) * 0.13;
  }

  double _calculateTotalPayable(Vehicle? v) {
    return _calculateRentalTotal(v) + _calculateInsurance(v) + _calculateVat(v) + _calculateDeposit(v);
  }

  Future<void> _pickDateTime(bool isStart) async {
    final initialDate = isStart ? _startDate : _endDate;
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (ctx, child) {
        return Theme(
          data: Theme.of(ctx).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedDate == null || !mounted) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initialDate),
    );

    if (pickedTime == null || !mounted) return;

    final newDateTime = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    setState(() {
      if (isStart) {
        _startDate = newDateTime;
        if (_endDate.isBefore(_startDate)) {
          _endDate = _startDate.add(const Duration(days: 2));
        }
      } else {
        if (newDateTime.isAfter(_startDate)) {
          _endDate = newDateTime;
        } else {
          AppFeedback.showToast(context, message: 'Return date must be after pickup date', type: ToastType.error);
        }
      }
    });
  }

  Future<void> _showQuickAddCustomerDialog() async {
    final cust = await AddCustomerSheet.show(context);
    if (cust != null) {
      setState(() {
        _selectedCustomerId = cust.id;
        _chequeHolderController.text = cust.fullName;
      });
    }
  }

  Future<void> _submitBooking() async {
    if (_selectedCustomerId == null) {
      AppFeedback.showToast(context, message: 'Please select a customer', type: ToastType.error);
      return;
    }
    if (_selectedVehicleId == null) {
      AppFeedback.showToast(context, message: 'Please select a vehicle', type: ToastType.error);
      return;
    }

    setState(() => _isSubmitting = true);

    final payload = {
      'customer_id': _selectedCustomerId,
      'vehicle_id': _selectedVehicleId,
      'pickup_location_id': _defaultLocationId,
      'return_location_id': _defaultLocationId,
      'start_date': _startDate.toUtc().toIso8601String(),
      'end_date': _endDate.toUtc().toIso8601String(),
      'initial_status': 'confirmed',
      'insurance': _withInsurance,
      'notes': _notesController.text.trim(),
    };

    final bookingProv = context.read<BookingProvider>();
    final newBooking = await bookingProv.createBooking(payload);

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (newBooking != null) {
      Navigator.of(context).pop();
      _showSuccessDialog(newBooking);
    } else {
      AppFeedback.showToast(
        context,
        message: bookingProv.errorMessage ?? 'Failed to create booking. Please verify inputs.',
        type: ToastType.error,
      );
    }
  }

  void _showSuccessDialog(dynamic b) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.lg),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, size: 54, color: AppColors.primary),
            ),
            const SizedBox(height: AppSpacing.md),
            const Text(
              'Booking Confirmed!',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Code: ${b.bookingCode}',
              style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.primary),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '${b.customerName} has been booked for ${b.vehicleMake} ${b.vehicleModel}.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
            ),
            const SizedBox(height: AppSpacing.md),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(borderRadius: AppRadius.md),
              ),
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Done'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final custProv = context.watch<CustomerProvider>();
    final fleetProv = context.watch<FleetProvider>();

    final customers = custProv.customers;
    final allVehicles = fleetProv.vehicles;

    final filteredVehicles = _vehicleTypeFilter == 'all'
        ? allVehicles
        : allVehicles.where((v) => v.category.toLowerCase().contains(_vehicleTypeFilter.toLowerCase())).toList();

    Customer? selectedCustomer;
    if (_selectedCustomerId != null) {
      selectedCustomer = customers.where((c) => c.id == _selectedCustomerId).firstOrNull;
    }

    Vehicle? selectedVehicle;
    if (_selectedVehicleId != null) {
      selectedVehicle = allVehicles.where((v) => v.id == _selectedVehicleId).firstOrNull;
    }

    return Material(
      color: Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.92,
        child: Column(
          children: [
            // Header Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.sm, AppSpacing.sm),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: AppRadius.sm,
                    ),
                    child: const Icon(Icons.add_circle_rounded, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  const Expanded(
                    child: Text(
                      'New Booking',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Scrollable Content
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  // 1. Customer Section
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          '1. Customer Information',
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _showQuickAddCustomerDialog,
                        icon: const Icon(Icons.person_add_rounded, size: 16),
                        label: const Text('+ Instant KYC', style: TextStyle(fontSize: 12)),
                        style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                      ),
                    ],
                  ),
                const SizedBox(height: AppSpacing.xs),
                DropdownButtonFormField<String>(
                  value: _selectedCustomerId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Select Customer *',
                    prefixIcon: Icon(Icons.person_rounded, size: 20),
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  items: customers.map((c) {
                    return DropdownMenuItem(
                      value: c.id,
                      child: Text(
                        '${c.fullName} (${c.phone})',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedCustomerId = val;
                      final c = customers.where((x) => x.id == val).firstOrNull;
                      if (c != null) {
                        _chequeHolderController.text = c.fullName;
                      }
                    });
                  },
                ),
                if (selectedCustomer != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: AppRadius.md,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(selectedCustomer.fullName, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold)),
                              Text(selectedCustomer.phone, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                            ],
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        StatusChip(status: selectedCustomer.verificationStatus),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.xl),

                // 2. Vehicle Selection Section
                const Text('2. Vehicle Selection', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: AppSpacing.xs),
                // Vehicle type filter pills
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: ['all', 'car', 'suv', 'bike', 'scooter'].map((type) {
                      final isSel = _vehicleTypeFilter == type;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text(type.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isSel ? Colors.white : const Color(0xFF64748B))),
                          selected: isSel,
                          selectedColor: AppColors.primary,
                          backgroundColor: const Color(0xFFF1F5F9),
                          side: BorderSide.none,
                          onSelected: (_) => setState(() => _vehicleTypeFilter = type),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                DropdownButtonFormField<String>(
                  value: _selectedVehicleId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Select Vehicle *',
                    prefixIcon: Icon(Icons.directions_car_rounded, size: 20),
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  items: filteredVehicles.map((v) {
                    return DropdownMenuItem(
                      value: v.id,
                      child: Text(
                        '${v.make} ${v.model} (${v.plateNumber}) • ${CurrencyFormatter.format(v.dailyRate)}/d',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) => setState(() => _selectedVehicleId = val),
                ),
                if (selectedVehicle != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: AppRadius.md,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${selectedVehicle.make} ${selectedVehicle.model}', overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold)),
                              Text('Plate: ${selectedVehicle.plateNumber} • ${selectedVehicle.fuelType}', overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                            ],
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          '${CurrencyFormatter.format(selectedVehicle.dailyRate)}/day',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.xl),

                // 3. Rental Dates & Stations Section
                const Text('3. Rental Schedule & Branch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => _pickDateTime(true),
                        borderRadius: AppRadius.md,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: AppRadius.md,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Pickup Date & Time', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.event_rounded, size: 16, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    DateFormatter.formatShortDate(_startDate),
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: InkWell(
                        onTap: () => _pickDateTime(false),
                        borderRadius: AppRadius.md,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: AppRadius.md,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Return Date & Time', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.event_rounded, size: 16, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    DateFormatter.formatShortDate(_endDate),
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Text(
                        'Kathmandu Central Hub (HQ)',
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.12),
                        borderRadius: AppRadius.full,
                      ),
                      child: Text(
                        '$_rentalDays Days Total',
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),

                // 4. Rate Plan & Options
                const Text('4. Rate Plan & Taxes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: ['daily', 'weekly', 'monthly', 'custom'].map((plan) {
                    final isSel = _ratePlan == plan;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            backgroundColor: isSel ? AppColors.primary : Colors.white,
                            foregroundColor: isSel ? Colors.white : Colors.black87,
                            side: BorderSide(color: isSel ? AppColors.primary : const Color(0xFFE2E8F0)),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: AppRadius.sm),
                          ),
                          onPressed: () => setState(() => _ratePlan = plan),
                          child: Text(plan.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                if (_ratePlan == 'custom') ...[
                  const SizedBox(height: AppSpacing.sm),
                  TextFormField(
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Custom Daily Rate (Rs.)', prefixText: 'Rs. '),
                    onChanged: (val) => setState(() => _customDailyRate = double.tryParse(val)),
                  ),
                ],
                const SizedBox(height: AppSpacing.sm),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('13% Nepal VAT (Official Tax Invoice)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  value: _vatEnabled,
                  activeColor: AppColors.primary,
                  onChanged: (v) => setState(() => _vatEnabled = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Comprehensive Vehicle Insurance', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  value: _withInsurance,
                  activeColor: AppColors.primary,
                  onChanged: (v) => setState(() => _withInsurance = v),
                ),
                const SizedBox(height: AppSpacing.xl),

                // 5. Collateral & Security Details
                const Text('5. Collateral & Cheque Security', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: AppSpacing.sm),
                DropdownButtonFormField<String>(
                  value: _collateralType,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Collateral Type', contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
                  items: const [
                    DropdownMenuItem(value: 'bank_cheque', child: Text('Security Bank Cheque', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'cash_card', child: Text('Cash / Card Deposit', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'original_document', child: Text('Original Passport / Citizen Doc', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'waived', child: Text('Waived (VIP Customer)', overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged: (v) => setState(() => _collateralType = v!),
                ),
                if (_collateralType == 'bank_cheque') ...[
                  const SizedBox(height: AppSpacing.sm),
                  DropdownButtonFormField<String>(
                    value: _chequeBankName,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Bank Name', contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
                    items: _nepalBanks.map((b) => DropdownMenuItem(value: b, child: Text(b, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis))).toList(),
                    onChanged: (v) => setState(() => _chequeBankName = v!),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _chequeNumberController,
                          decoration: const InputDecoration(labelText: 'Cheque Number', hintText: 'e.g. 0987654321'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: TextField(
                          controller: _chequeHolderController,
                          decoration: const InputDecoration(labelText: 'A/C Holder Name', hintText: 'Name on cheque'),
                        ),
                      ),
                    ],
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Blank Security Cheque', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    value: _isBlankCheque,
                    activeColor: AppColors.primary,
                    onChanged: (v) => setState(() => _isBlankCheque = v),
                  ),
                ],
                const SizedBox(height: AppSpacing.xl),

                // 6. Payment & Advance
                const Text('6. Payment & Advance', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: AppSpacing.sm),
                DropdownButtonFormField<String>(
                  value: _paymentOption,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Payment Status', contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
                  items: const [
                    DropdownMenuItem(value: 'unpaid', child: Text('Unpaid / Pay on Return', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'advance', child: Text('Partial Advance', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'full', child: Text('Full Payment', overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged: (v) => setState(() => _paymentOption = v!),
                ),
                const SizedBox(height: AppSpacing.sm),
                DropdownButtonFormField<String>(
                  value: _paymentMethod,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Payment Method', contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
                  items: const [
                    DropdownMenuItem(value: 'fonepay', child: Text('Fonepay QR', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'cash', child: Text('Cash', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'bank_transfer', child: Text('Bank Transfer', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'esewa', child: Text('eSewa', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: 'khalti', child: Text('Khalti', overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged: (v) => setState(() => _paymentMethod = v!),
                ),
                const SizedBox(height: AppSpacing.xl),

                // 7. Live Financial Summary
                Container(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: AppRadius.lg,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Authoritative Pricing Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: AppSpacing.md),
                      _SummaryRow(label: 'Rental Duration', value: '$_rentalDays Days'),
                      _SummaryRow(label: 'Base Rental Rate', value: '${CurrencyFormatter.format(_calculateBaseRate(selectedVehicle))}/day'),
                      _SummaryRow(label: 'Base Rental Total', value: CurrencyFormatter.format(_calculateRentalTotal(selectedVehicle))),
                      if (_withInsurance)
                        _SummaryRow(label: 'Insurance (10%)', value: CurrencyFormatter.format(_calculateInsurance(selectedVehicle))),
                      if (_vatEnabled)
                        _SummaryRow(label: 'Nepal VAT (13%)', value: CurrencyFormatter.format(_calculateVat(selectedVehicle))),
                      _SummaryRow(label: 'Refundable Security Deposit', value: CurrencyFormatter.format(_calculateDeposit(selectedVehicle))),
                      const Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Estimated Amount', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          Text(
                            CurrencyFormatter.format(_calculateTotalPayable(selectedVehicle)),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: AppColors.primary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),
              ],
            ),
          ),

          // Sticky Bottom Confirmation Action
          Container(
            padding: EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.lg,
              AppSpacing.md + MediaQuery.paddingOf(context).bottom,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -3)),
              ],
            ),
            child: PrimaryButton(
              label: 'Confirm & Reserve Booking',
              icon: Icons.check_circle_rounded,
              isLoading: _isSubmitting,
              onPressed: _submitBooking,
            ),
          ),
        ],
      ),
    ),
  );
}
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
