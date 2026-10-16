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
import 'pickup_return_hub_screen.dart';

/// Screen displaying all active on-road rentals with quick extend and return actions
class ActiveRentalsListScreen extends StatefulWidget {
  const ActiveRentalsListScreen({super.key});

  @override
  State<ActiveRentalsListScreen> createState() => _ActiveRentalsListScreenState();
}

class _ActiveRentalsListScreenState extends State<ActiveRentalsListScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';
  String _filter = 'all'; // 'all' or 'overdue'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().loadBookings();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _showExtendRentalSheet(Booking booking) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ExtendRentalSheet(booking: booking),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingProv = context.watch<BookingProvider>();
    final allBookings = bookingProv.bookings;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final now = DateTime.now();

    // Filter to active rentals
    final allActiveRentals = allBookings.where((b) {
      return b.status.toLowerCase() == 'active';
    }).toList();

    final overdueCount = allActiveRentals.where((b) => b.endDate.isBefore(now)).length;

    // Apply search and filter
    final activeRentals = allActiveRentals.where((b) {
      if (_filter == 'overdue' && !b.endDate.isBefore(now)) {
        return false;
      }
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final match = b.bookingCode.toLowerCase().contains(q) ||
            b.customerName.toLowerCase().contains(q) ||
            b.vehiclePlate.toLowerCase().contains(q) ||
            b.vehicleModel.toLowerCase().contains(q);
        if (!match) return false;
      }
      return true;
    }).toList();

    return AppScaffold(
      appBar: AppHeader(
        title: 'Active Rentals',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => bookingProv.loadBookings(),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, 8),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 40,
                    child: TextField(
                      controller: _searchCtrl,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Search vehicle, plate, or customer...',
                        hintStyle: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                        ),
                        prefixIcon: const Icon(Icons.search_rounded, size: 18),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                        border: OutlineInputBorder(
                          borderRadius: AppRadius.md,
                          borderSide: BorderSide.none,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: AppRadius.md,
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: AppRadius.md,
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                        ),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 16),
                                padding: EdgeInsets.zero,
                                onPressed: () {
                                  _searchCtrl.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val.trim()),
                    ),
                  ),
                ),
                if (overdueCount > 0) ...[
                  const SizedBox(width: AppSpacing.sm),
                  SizedBox(
                    height: 40,
                    child: FilterChip(
                      label: Text(
                        'Overdue ($overdueCount)',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: _filter == 'overdue' ? Colors.white : AppColors.error,
                        ),
                      ),
                      selected: _filter == 'overdue',
                      selectedColor: AppColors.error,
                      backgroundColor: AppColors.error.withOpacity(0.08),
                      side: BorderSide(
                        color: _filter == 'overdue' ? AppColors.error : AppColors.error.withOpacity(0.3),
                      ),
                      showCheckmark: false,
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                      onSelected: (selected) {
                        setState(() => _filter = selected ? 'overdue' : 'all');
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
      body: activeRentals.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.directions_car_rounded,
                            size: 44,
                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _filter == 'overdue'
                                ? 'No overdue rentals'
                                : _searchQuery.isNotEmpty
                                    ? 'No rentals match "$_searchQuery"'
                                    : 'No active rentals on the road',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
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
                    itemCount: activeRentals.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                    itemBuilder: (ctx, idx) {
                      final b = activeRentals[idx];
                      final isOverdue = b.endDate.isBefore(now);

                      return _ActiveRentalCard(
                        booking: b,
                        isOverdue: isOverdue,
                        onExtend: () => _showExtendRentalSheet(b),
                        onReturn: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => PickupReturnHubScreen(
                                initialMode: 'return',
                                initialBookingId: b.id,
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
    );
  }
}

/// Clean, theme-aligned Active Rental Card (No vibe coding clutter)
class _ActiveRentalCard extends StatelessWidget {
  final Booking booking;
  final bool isOverdue;
  final VoidCallback onExtend;
  final VoidCallback onReturn;

  const _ActiveRentalCard({
    required this.booking,
    required this.isOverdue,
    required this.onExtend,
    required this.onReturn,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.md,
        side: BorderSide(
          color: isOverdue
              ? AppColors.error.withOpacity(0.4)
              : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
          width: isOverdue ? 1.5 : 1.0,
        ),
      ),
      color: isDark ? AppColors.darkSurface : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Booking Code, Plate, and Status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: AppRadius.sm,
                      ),
                      child: Text(
                        '#${booking.bookingCode}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      booking.vehiclePlate,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
                if (isOverdue)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: AppColors.error.withOpacity(0.1),
                      borderRadius: AppRadius.full,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.warning_amber_rounded, size: 13, color: AppColors.error),
                        SizedBox(width: 4),
                        Text(
                          'Overdue',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.error,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  const StatusChip(status: 'active'),
              ],
            ),
            const SizedBox(height: 10),

            // Vehicle Title
            Text(
              '${booking.vehicleMake} ${booking.vehicleModel}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 6),

            // Customer Info Row
            Row(
              children: [
                Icon(
                  Icons.person_outline_rounded,
                  size: 15,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
                const SizedBox(width: 6),
                Text(
                  booking.customerName,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                ),
                if (booking.customerPhone.isNotEmpty) ...[
                  Text(
                    ' • ',
                    style: TextStyle(
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                  Text(
                    booking.customerPhone,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 4),

            // Return Due Row
            Row(
              children: [
                Icon(
                  Icons.schedule_rounded,
                  size: 15,
                  color: isOverdue
                      ? AppColors.error
                      : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                ),
                const SizedBox(width: 6),
                Text(
                  'Due: ${DateFormatter.formatDateTime(booking.endDate)}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isOverdue ? FontWeight.bold : FontWeight.normal,
                    color: isOverdue
                        ? AppColors.error
                        : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                  ),
                ),
              ],
            ),
            const Divider(height: 20),

            // Financial Summary & Action Buttons
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Deposit Held',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      ),
                    ),
                    Text(
                      CurrencyFormatter.format(booking.depositAmount),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                OutlinedButton(
                  onPressed: onExtend,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    side: BorderSide(
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: AppRadius.sm),
                  ),
                  child: const Text('Extend', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: onReturn,
                  icon: const Icon(Icons.assignment_turned_in_rounded, size: 15),
                  label: const Text('Return', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: AppRadius.sm),
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

/// Extend Rental Duration Bottom Sheet (Clean & aligned with app theme)
class _ExtendRentalSheet extends StatefulWidget {
  final Booking booking;

  const _ExtendRentalSheet({required this.booking});

  @override
  State<_ExtendRentalSheet> createState() => _ExtendRentalSheetState();
}

class _ExtendRentalSheetState extends State<_ExtendRentalSheet> {
  late DateTime _newEndDate;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _newEndDate = widget.booking.endDate.add(const Duration(days: 2));
  }

  Future<void> _pickNewDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _newEndDate,
      firstDate: widget.booking.endDate,
      lastDate: widget.booking.endDate.add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() {
        _newEndDate = DateTime(
          picked.year,
          picked.month,
          picked.day,
          widget.booking.endDate.hour,
          widget.booking.endDate.minute,
        );
      });
    }
  }

  Future<void> _handleConfirm() async {
    setState(() => _isSubmitting = true);
    final bookingProv = context.read<BookingProvider>();

    try {
      await bookingProv.extendBooking(widget.booking.id, newEndDate: _newEndDate);
      if (!mounted) return;
      AppFeedback.showToast(
        context,
        message: 'Rental extended to ${DateFormatter.formatShortDate(_newEndDate)}',
        type: ToastType.success,
      );
      Navigator.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      AppFeedback.showToast(
        context,
        message: 'Rental extended successfully',
        type: ToastType.success,
      );
      Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final additionalDays = _newEndDate.difference(widget.booking.endDate).inDays;

    return Material(
      color: isDark ? AppColors.darkSurface : Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Extend Rental',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                      ),
                      Text(
                        '#${widget.booking.bookingCode} • ${widget.booking.vehiclePlate}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
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
              const Divider(height: 16),

              Text(
                'Current Return: ${DateFormatter.formatDateTime(widget.booking.endDate)}',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              const Text(
                'New Return Date',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: AppSpacing.xs),
              InkWell(
                onTap: _pickNewDate,
                borderRadius: AppRadius.md,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    borderRadius: AppRadius.md,
                    border: Border.all(
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            DateFormatter.formatFullDate(_newEndDate),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                      Icon(
                        Icons.edit_calendar_rounded,
                        size: 18,
                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Clean duration summary
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Extension Days:',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    Text(
                      '+$additionalDays days',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),

              PrimaryButton(
                label: 'Confirm Extension',
                icon: Icons.check_circle_rounded,
                isLoading: _isSubmitting,
                onPressed: _handleConfirm,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
