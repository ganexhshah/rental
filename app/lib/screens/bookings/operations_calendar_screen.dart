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
import '../../widgets/data/app_data_display.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import 'booking_detail_screen.dart';

/// Screen matching http://localhost:3000/operations/calendar
class OperationsCalendarScreen extends StatefulWidget {
  const OperationsCalendarScreen({super.key});

  @override
  State<OperationsCalendarScreen> createState() => _OperationsCalendarScreenState();
}

class _OperationsCalendarScreenState extends State<OperationsCalendarScreen> {
  DateTime _focusedMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _selectedDate = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
  String _selectedVehicleId = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().loadBookings();
      context.read<FleetProvider>().loadVehicles();
    });
  }

  void _previousMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1, 1);
    });
  }

  void _nextMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 1);
    });
  }

  List<Booking> _getBookingsForDate(DateTime date, List<Booking> allBookings) {
    return allBookings.filterByDate(date).where((b) {
      if (_selectedVehicleId != 'all' && b.vehicleId != _selectedVehicleId) {
        return false;
      }
      return true;
    }).toList();
  }

  void _showDayBookingsSheet(DateTime date, List<Booking> bookings) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _DayBookingsSheet(date: date, bookings: bookings),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingProv = context.watch<BookingProvider>();
    final fleetProv = context.watch<FleetProvider>();

    final allBookings = bookingProv.bookings;
    final vehicles = fleetProv.vehicles;

    final filteredBookings = allBookings.where((b) {
      if (_selectedVehicleId != 'all' && b.vehicleId != _selectedVehicleId) return false;
      return true;
    }).toList();

    return AppScaffold(
      appBar: AppHeader(
        title: 'Calendar',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => bookingProv.loadBookings(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Toolbar (Vehicle Dropdown)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: AppRadius.md,
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedVehicleId,
                        isExpanded: true,
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                        items: [
                          const DropdownMenuItem(
                            value: 'all',
                            child: Text('All Vehicles', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          ),
                          ...vehicles.map((v) => DropdownMenuItem(
                                value: v.id,
                                child: Text(
                                  '${v.plateNumber} • ${v.make} ${v.model}',
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 13),
                                ),
                              )),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedVehicleId = val);
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Status Legend
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.xs),
            child: Row(
              children: [
                _buildLegendItem(const Color(0xFFF59E0B), 'Confirmed'),
                const SizedBox(width: 14),
                _buildLegendItem(AppColors.secondary, 'Active'),
                const SizedBox(width: 14),
                _buildLegendItem(AppColors.success, 'Completed'),
              ],
            ),
          ),

          // Month Header & Navigation
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xs),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _formatMonthYear(_focusedMonth),
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left_rounded),
                      onPressed: _previousMonth,
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right_rounded),
                      onPressed: _nextMonth,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Calendar Grid
          Expanded(
            child: Container(
              margin: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.md),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: AppRadius.lg,
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  // Weekday Header
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
                    ),
                    child: Row(
                      children: const ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) {
                        return Expanded(
                          child: Center(
                            child: Text(
                              day,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const Divider(height: 1),

                  // Calendar Month Cells
                  Expanded(
                    child: _buildMonthDaysGrid(filteredBookings),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildMonthDaysGrid(List<Booking> bookings) {
    final firstDayOfMonth = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final daysInMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;
    final leadingSpaces = firstDayOfMonth.weekday % 7; // Sunday = 0

    final totalCells = ((leadingSpaces + daysInMonth + 6) ~/ 7) * 7;
    final now = DateTime.now();

    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        childAspectRatio: 0.95,
      ),
      itemCount: totalCells,
      itemBuilder: (ctx, index) {
        if (index < leadingSpaces || index >= leadingSpaces + daysInMonth) {
          return const SizedBox.shrink();
        }

        final dayNum = index - leadingSpaces + 1;
        final cellDate = DateTime(_focusedMonth.year, _focusedMonth.month, dayNum);

        final dayBookings = _getBookingsForDate(cellDate, bookings);
        final isToday = cellDate.year == now.year && cellDate.month == now.month && cellDate.day == now.day;
        final isSelected = cellDate.year == _selectedDate.year && cellDate.month == _selectedDate.month && cellDate.day == _selectedDate.day;

        return InkWell(
          onTap: () {
            setState(() => _selectedDate = cellDate);
            _showDayBookingsSheet(cellDate, dayBookings);
          },
          child: Container(
            margin: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppColors.primary.withOpacity(0.08)
                  : (isToday ? const Color(0xFFF1F5F9) : Colors.transparent),
              borderRadius: AppRadius.sm,
              border: isSelected
                  ? Border.all(color: AppColors.primary, width: 1.5)
                  : (isToday ? Border.all(color: const Color(0xFFCBD5E1)) : null),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '$dayNum',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isToday || isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? AppColors.primary : (isToday ? Colors.black87 : const Color(0xFF334155)),
                  ),
                ),
                const SizedBox(height: 3),
                if (dayBookings.isNotEmpty)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: dayBookings.take(3).map((b) {
                      Color dotColor = const Color(0xFF94A3B8);
                      if (b.status == 'confirmed' || b.status == 'pending') dotColor = const Color(0xFFF59E0B);
                      if (b.status == 'active') dotColor = AppColors.secondary;
                      if (b.status == 'completed') dotColor = AppColors.success;

                      return Container(
                        width: 5,
                        height: 5,
                        margin: const EdgeInsets.symmetric(horizontal: 1.5),
                        decoration: BoxDecoration(
                          color: dotColor,
                          shape: BoxShape.circle,
                        ),
                      );
                    }).toList(),
                  )
                else
                  const SizedBox(height: 5),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatMonthYear(DateTime dt) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[dt.month - 1]} ${dt.year}';
  }
}

extension on List<Booking> {
  List<Booking> filterByDate(DateTime date) {
    final target = DateTime(date.year, date.month, date.day);
    return where((b) {
      final s = DateTime(b.startDate.year, b.startDate.month, b.startDate.day);
      final e = DateTime(b.endDate.year, b.endDate.month, b.endDate.day);
      return !target.isBefore(s) && !target.isAfter(e);
    }).toList();
  }
}

/// Day Inspection Sheet
class _DayBookingsSheet extends StatelessWidget {
  final DateTime date;
  final List<Booking> bookings;

  const _DayBookingsSheet({required this.date, required this.bookings});

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormatter.formatFullDate(date);

    return Material(
      color: Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.75,
          child: Column(
            children: [
              // Drag Handle
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  margin: const EdgeInsets.only(top: 10, bottom: 6),
                  decoration: BoxDecoration(
                    color: Colors.black12,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.xs, AppSpacing.sm, AppSpacing.xs),
                child: Row(
                  children: [
                    const Icon(Icons.event_note_rounded, color: AppColors.primary, size: 22),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(dateStr, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          Text(
                            '${bookings.length} ${bookings.length == 1 ? 'booking' : 'bookings'}',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                        ],
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

              // Bookings List
              Expanded(
                child: bookings.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.event_available_rounded, size: 40, color: Color(0xFF94A3B8)),
                            SizedBox(height: 8),
                            Text('No bookings for this date', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        itemCount: bookings.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                        itemBuilder: (ctx, idx) {
                          final b = bookings[idx];
                          return InkWell(
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => BookingDetailScreen(bookingId: b.id)),
                              );
                            },
                            borderRadius: AppRadius.md,
                            child: Container(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: AppRadius.md,
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '#${b.bookingCode}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                                      ),
                                      StatusChip(status: b.status),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Text(
                                        '${b.vehicleMake} ${b.vehicleModel}',
                                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFE2E8F0),
                                          borderRadius: AppRadius.sm,
                                        ),
                                        child: Text(
                                          b.vehiclePlate,
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${b.customerName} • ${b.customerPhone}',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF334155)),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${DateFormatter.formatShortDate(b.startDate)} → ${DateFormatter.formatShortDate(b.endDate)}',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                  ),
                                  const Divider(height: 16),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        CurrencyFormatter.format(b.totalAmount),
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      StatusChip(status: b.paymentStatus),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

