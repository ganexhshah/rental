import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/booking_model.dart';
import '../../models/vehicle_model.dart';
import '../../providers/booking_provider.dart';
import '../../providers/fleet_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/sheets/create_booking_sheet.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

/// Screen for checking fleet availability across specific dates with real-time conflict checking
class VehicleAvailabilityScreen extends StatefulWidget {
  final String? preselectedVehicleId;

  const VehicleAvailabilityScreen({super.key, this.preselectedVehicleId});

  @override
  State<VehicleAvailabilityScreen> createState() => _VehicleAvailabilityScreenState();
}

class _VehicleAvailabilityScreenState extends State<VehicleAvailabilityScreen> {
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now().add(const Duration(days: 3));

  String _availabilityFilter = 'all'; // 'all', 'available', 'booked'
  String _typeFilter = 'all'; // 'all', 'car', 'bike', 'scooter'
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';

  final List<Map<String, String>> _typeOptions = [
    {'key': 'all', 'label': 'All Types'},
    {'key': 'car', 'label': 'Cars & SUVs'},
    {'key': 'bike', 'label': 'Bikes'},
    {'key': 'scooter', 'label': 'Scooters'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FleetProvider>().loadVehicles();
      context.read<BookingProvider>().loadBookings();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDateRange() async {
    final picked = await showModalBottomSheet<DateTimeRange>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _DateRangePickerSheet(
        initialStart: _startDate,
        initialEnd: _endDate,
      ),
    );

    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final fleetProv = context.watch<FleetProvider>();
    final bookingProv = context.watch<BookingProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final allVehicles = fleetProv.vehicles;
    final allBookings = bookingProv.bookings;

    final durationDays = _endDate.difference(_startDate).inDays > 0
        ? _endDate.difference(_startDate).inDays
        : 1;

    // Check collision / availability in chosen date window
    final allSlots = allVehicles.map((vehicle) {
      Booking? conflictBooking;
      for (final b in allBookings) {
        if (b.vehicleId == vehicle.id && b.status.toLowerCase() != 'cancelled') {
          final isOverlap = !(_endDate.isBefore(b.startDate) || _startDate.isAfter(b.endDate));
          if (isOverlap) {
            conflictBooking = b;
            break;
          }
        }
      }

      final isAvailable = conflictBooking == null && vehicle.status.toLowerCase() == 'available';

      return _VehicleAvailabilitySlot(
        vehicle: vehicle,
        isAvailable: isAvailable,
        currentBooking: conflictBooking,
      );
    }).toList();

    final totalAvailable = allSlots.where((s) => s.isAvailable).length;
    final totalBooked = allSlots.length - totalAvailable;

    // Apply active filters
    final filteredSlots = allSlots.where((slot) {
      final v = slot.vehicle;

      // Availability filter
      if (_availabilityFilter == 'available' && !slot.isAvailable) return false;
      if (_availabilityFilter == 'booked' && slot.isAvailable) return false;

      // Type filter
      if (_typeFilter != 'all') {
        if (_typeFilter == 'car') {
          if (!['car', 'suv'].contains(v.vehicleType.toLowerCase())) return false;
        } else if (v.vehicleType.toLowerCase() != _typeFilter) {
          return false;
        }
      }

      // Search filter
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final match = '${v.make} ${v.model}'.toLowerCase().contains(q) ||
            v.plateNumber.toLowerCase().contains(q) ||
            (v.locationName?.toLowerCase().contains(q) ?? false);
        if (!match) return false;
      }

      return true;
    }).toList();

    return AppScaffold(
      appBar: AppHeader(
        title: 'Fleet Availability',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () {
              fleetProv.loadVehicles();
              bookingProv.loadBookings();
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, 8),
            child: InkWell(
              onTap: _pickDateRange,
              borderRadius: AppRadius.md,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: AppRadius.md,
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${DateFormatter.formatShortDate(_startDate)} → ${DateFormatter.formatShortDate(_endDate)} ($durationDays ${durationDays == 1 ? 'day' : 'days'})',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                    ),
                    Text(
                      'Change',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Filter Chips Row (Availability + Vehicle Type)
          Container(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.xs),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterPill(
                    label: 'All (${allSlots.length})',
                    isSelected: _availabilityFilter == 'all',
                    onTap: () => setState(() => _availabilityFilter = 'all'),
                  ),
                  const SizedBox(width: 6),
                  _FilterPill(
                    label: 'Available ($totalAvailable)',
                    isSelected: _availabilityFilter == 'available',
                    onTap: () => setState(() => _availabilityFilter = 'available'),
                  ),
                  const SizedBox(width: 6),
                  _FilterPill(
                    label: 'Booked ($totalBooked)',
                    isSelected: _availabilityFilter == 'booked',
                    onTap: () => setState(() => _availabilityFilter = 'booked'),
                  ),
                  const SizedBox(width: 12),
                  Container(height: 18, width: 1, color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                  const SizedBox(width: 12),
                  ..._typeOptions.map((t) {
                    final key = t['key']!;
                    final isSelected = _typeFilter == key;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: _FilterPill(
                        label: t['label']!,
                        isSelected: isSelected,
                        onTap: () => setState(() => _typeFilter = key),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),

          // Vehicle List
          Expanded(
            child: filteredSlots.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.directions_car_outlined,
                            size: 44,
                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _availabilityFilter == 'available'
                                ? 'No vehicles available for these dates'
                                : 'No vehicles found matching filters',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Try picking different dates or resetting filters.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.md,
                    ),
                    itemCount: filteredSlots.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                    itemBuilder: (ctx, idx) {
                      final slot = filteredSlots[idx];
                      return _AvailabilityVehicleCard(
                        slot: slot,
                        durationDays: durationDays,
                        startDate: _startDate,
                        endDate: _endDate,
                        onBook: () => CreateBookingSheet.show(context),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

/// Clean Filter Chip / Pill
class _FilterPill extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterPill({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected
                ? Colors.white
                : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
          ),
        ),
      ),
    );
  }
}

/// Polished, Human-Crafted Vehicle Availability Card
class _AvailabilityVehicleCard extends StatelessWidget {
  final _VehicleAvailabilitySlot slot;
  final int durationDays;
  final DateTime startDate;
  final DateTime endDate;
  final VoidCallback onBook;

  const _AvailabilityVehicleCard({
    required this.slot,
    required this.durationDays,
    required this.startDate,
    required this.endDate,
    required this.onBook,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final v = slot.vehicle;
    final isAvailable = slot.isAvailable;
    final booking = slot.currentBooking;
    final estimatedTotal = v.dailyRate * durationDays;

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
            // Top Row: Title, Plate & Status Pill
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${v.make} ${v.model}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(
                            v.plateNumber,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (v.locationName != null && v.locationName!.isNotEmpty) ...[
                            Text(
                              ' • ',
                              style: TextStyle(
                                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                              ),
                            ),
                            Flexible(
                              child: Text(
                                v.locationName!,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isAvailable
                        ? const Color(0xFF10B981).withOpacity(0.12)
                        : (isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)),
                    borderRadius: AppRadius.full,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isAvailable ? Icons.check_circle_rounded : Icons.schedule_rounded,
                        size: 13,
                        color: isAvailable
                            ? const Color(0xFF10B981)
                            : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isAvailable ? 'Available' : 'Booked',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isAvailable
                            ? const Color(0xFF10B981)
                            : (isDark ? AppColors.darkTextMuted : AppColors.lightTextSecondary),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Vehicle Specs: Transmission, Fuel, Category
            Row(
              children: [
                _SpecItem(
                  icon: Icons.settings_rounded,
                  label: v.transmission.toLowerCase() == 'automatic' ? 'Automatic' : 'Manual',
                ),
                const SizedBox(width: 12),
                _SpecItem(
                  icon: Icons.local_gas_station_rounded,
                  label: v.fuelType.isNotEmpty
                      ? '${v.fuelType[0].toUpperCase()}${v.fuelType.substring(1)}'
                      : 'Petrol',
                ),
                const SizedBox(width: 12),
                _SpecItem(
                  icon: Icons.airline_seat_recline_normal_rounded,
                  label: '${v.seatingCapacity} Seats',
                ),
              ],
            ),

            if (!isAvailable && booking != null) ...[
              const SizedBox(height: 8),
              Text(
                'Reserved until ${DateFormatter.formatShortDate(booking.endDate)} (#${booking.bookingCode})',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
              ),
            ],

            const Divider(height: 20),

            // Bottom Row: Rate + Book Action
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          CurrencyFormatter.format(v.dailyRate),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        Text(
                          '/day',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '~${CurrencyFormatter.format(estimatedTotal)} for $durationDays ${durationDays == 1 ? 'day' : 'days'}',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      ),
                    ),
                  ],
                ),
                if (isAvailable)
                  ElevatedButton(
                    onPressed: onBook,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
                      shape: RoundedRectangleBorder(borderRadius: AppRadius.sm),
                    ),
                    child: const Text(
                      'Book',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  )
                else
                  Text(
                    'Unavailable',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SpecItem extends StatelessWidget {
  final IconData icon;
  final String label;

  const _SpecItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
        ),
      ],
    );
  }
}

class _VehicleAvailabilitySlot {
  final Vehicle vehicle;
  final bool isAvailable;
  final Booking? currentBooking;

  _VehicleAvailabilitySlot({
    required this.vehicle,
    required this.isAvailable,
    this.currentBooking,
  });
}

/// Calendar Date Range Picker Bottom Sheet (Human-crafted, polished UX)
class _DateRangePickerSheet extends StatefulWidget {
  final DateTime initialStart;
  final DateTime initialEnd;

  const _DateRangePickerSheet({
    required this.initialStart,
    required this.initialEnd,
  });

  @override
  State<_DateRangePickerSheet> createState() => _DateRangePickerSheetState();
}

class _DateRangePickerSheetState extends State<_DateRangePickerSheet> {
  late DateTime _startDate;
  late DateTime _endDate;
  bool _editingEnd = false;

  @override
  void initState() {
    super.initState();
    _startDate = widget.initialStart;
    _endDate = widget.initialEnd;
  }

  void _applyPreset(int days) {
    setState(() {
      _startDate = DateTime.now();
      _endDate = DateTime.now().add(Duration(days: days));
      _editingEnd = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final durationDays = _endDate.difference(_startDate).inDays > 0
        ? _endDate.difference(_startDate).inDays
        : 1;

    final activeTargetDate = _editingEnd ? _endDate : _startDate;
    final minDate = _editingEnd
        ? _startDate
        : DateTime.now().subtract(const Duration(days: 1));
    final maxDate = DateTime.now().add(const Duration(days: 365));

    final safeInitialDate = activeTargetDate.isBefore(minDate)
        ? minDate
        : (activeTargetDate.isAfter(maxDate) ? maxDate : activeTargetDate);

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(top: 6, bottom: 12),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black12,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Text(
                        'Select Rental Dates',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$durationDays ${durationDays == 1 ? 'day' : 'days'}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),

              // Date Selectors: Pickup & Return
              Row(
                children: [
                  Expanded(
                    child: _DateSelectorTile(
                      label: 'Pickup Date',
                      date: _startDate,
                      isActive: !_editingEnd,
                      onTap: () => setState(() => _editingEnd = false),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _DateSelectorTile(
                      label: 'Return Date',
                      date: _endDate,
                      isActive: _editingEnd,
                      onTap: () => setState(() => _editingEnd = true),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),

              // Quick Presets
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _PresetChip(label: 'Today (1d)', onTap: () => _applyPreset(1)),
                    const SizedBox(width: 6),
                    _PresetChip(label: 'Weekend (2d)', onTap: () => _applyPreset(2)),
                    const SizedBox(width: 6),
                    _PresetChip(label: '3 Days', onTap: () => _applyPreset(3)),
                    const SizedBox(width: 6),
                    _PresetChip(label: '1 Week', onTap: () => _applyPreset(7)),
                    const SizedBox(width: 6),
                    _PresetChip(label: '2 Weeks', onTap: () => _applyPreset(14)),
                    const SizedBox(width: 6),
                    _PresetChip(label: '1 Month', onTap: () => _applyPreset(30)),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xs),

              // Calendar Widget
              Theme(
                data: Theme.of(context).copyWith(
                  colorScheme: Theme.of(context).colorScheme.copyWith(
                        primary: AppColors.primary,
                        onPrimary: Colors.white,
                        surface: isDark ? AppColors.darkSurface : Colors.white,
                        onSurface: isDark ? AppColors.darkText : AppColors.lightText,
                      ),
                ),
                child: SizedBox(
                  height: 290,
                  child: CalendarDatePicker(
                    key: ValueKey('${_editingEnd}_${_startDate.millisecondsSinceEpoch}_${_endDate.millisecondsSinceEpoch}'),
                    initialDate: safeInitialDate,
                    firstDate: minDate,
                    lastDate: maxDate,
                    onDateChanged: (picked) {
                      setState(() {
                        if (!_editingEnd) {
                          _startDate = picked;
                          if (_endDate.isBefore(_startDate)) {
                            _endDate = _startDate.add(const Duration(days: 1));
                          }
                          // Automatically transition to selecting return date
                          _editingEnd = true;
                        } else {
                          _endDate = picked;
                          if (_endDate.isBefore(_startDate)) {
                            _endDate = _startDate.add(const Duration(days: 1));
                          }
                        }
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Apply Dates Button
              PrimaryButton(
                label: 'Apply Dates ($durationDays ${durationDays == 1 ? 'day' : 'days'})',
                icon: Icons.check_circle_rounded,
                onPressed: () {
                  Navigator.of(context).pop(
                    DateTimeRange(start: _startDate, end: _endDate),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DateSelectorTile extends StatelessWidget {
  final String label;
  final DateTime date;
  final bool isActive;
  final VoidCallback onTap;

  const _DateSelectorTile({
    required this.label,
    required this.date,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.md,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isActive
              ? AppColors.primary.withOpacity(0.08)
              : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC)),
          borderRadius: AppRadius.md,
          border: Border.all(
            color: isActive
                ? AppColors.primary
                : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
            width: isActive ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: isActive
                    ? AppColors.primary
                    : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              DateFormatter.formatDate(date),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkText : AppColors.lightText,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PresetChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _PresetChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4.5),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
        ),
      ),
    );
  }
}
