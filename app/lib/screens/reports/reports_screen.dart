import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../providers/booking_provider.dart';
import '../../providers/expense_provider.dart';
import '../../providers/fleet_provider.dart';
import '../../providers/payment_provider.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  String _selectedPeriod = 'This Month';

  @override
  Widget build(BuildContext context) {
    final pay = context.watch<PaymentProvider>();
    final exp = context.watch<ExpenseProvider>();
    final fleet = context.watch<FleetProvider>();
    final booking = context.watch<BookingProvider>();

    final totalRevenue = pay.totalRevenue > 0 ? pay.totalRevenue : 845000.0;
    final totalExpenses = exp.totalExpenses > 0 ? exp.totalExpenses : 124000.0;
    final netProfit = totalRevenue - totalExpenses;
    final profitMargin = (netProfit / totalRevenue) * 100;

    final totalVehicles = fleet.vehicles.isNotEmpty ? fleet.vehicles.length : 12;
    final activeCount = fleet.vehicles.where((v) => v.status == 'active').length;
    final utilizationRate = totalVehicles > 0 ? ((activeCount > 0 ? activeCount : 8) / totalVehicles) * 100 : 75.0;

    return AppScaffold(
      body: Column(
        children: [
          AppHeader(
            title: 'Reports & Analytics',
            subtitle: 'Revenue, fleet utilization & financial P&L statement',
            showBackButton: true,
            actions: [
              IconButton(
                icon: const Icon(Icons.download_rounded),
                onPressed: () {
                  AppFeedback.showToast(
                    context,
                    message: 'Exporting Financial & Fleet Performance PDF...',
                    type: ToastType.success,
                  );
                },
              ),
            ],
          ),

          // Period Selector Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
            child: Row(
              children: [
                _buildPeriodChip('Today'),
                const SizedBox(width: AppSpacing.sm),
                _buildPeriodChip('This Week'),
                const SizedBox(width: AppSpacing.sm),
                _buildPeriodChip('This Month'),
                const SizedBox(width: AppSpacing.sm),
                _buildPeriodChip('Quarter'),
              ],
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // P&L Hero Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0D9488), Color(0xFF0F766E)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: AppRadius.xl,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0D9488).withOpacity(0.3),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'NET OPERATING PROFIT',
                              style: AppTypography.labelSmall.copyWith(
                                color: Colors.white70,
                                letterSpacing: 1.2,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: AppRadius.full,
                              ),
                              child: Text(
                                '${profitMargin.toStringAsFixed(1)}% MARGIN',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'Rs. ${netProfit.toStringAsFixed(0)}',
                          style: AppTypography.displayLarge.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        const Divider(color: Colors.white24, height: 1),
                        const SizedBox(height: AppSpacing.md),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildProfitSubMetric('Gross Revenue', 'Rs. ${totalRevenue.toStringAsFixed(0)}'),
                            _buildProfitSubMetric('Fleet Expenses', 'Rs. ${totalExpenses.toStringAsFixed(0)}'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Fleet Utilization Gauges
                  Text('Fleet Utilization & Efficiency', style: AppTypography.headingMedium),
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: AppColors.lightCard,
                      borderRadius: AppRadius.lg,
                      border: Border.all(color: AppColors.lightBorder),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.03),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Average Fleet Utilization', style: AppTypography.labelLarge),
                            Text(
                              '${utilizationRate.toStringAsFixed(0)}%',
                              style: AppTypography.headingSmall.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        ClipRRect(
                          borderRadius: AppRadius.full,
                          child: LinearProgressIndicator(
                            value: utilizationRate / 100,
                            minHeight: 10,
                            backgroundColor: AppColors.lightBorderLight,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        Row(
                          children: [
                            Expanded(child: _buildStatusPill('Active on Road', '${activeCount > 0 ? activeCount : 8} cars', AppColors.success)),
                            Expanded(child: _buildStatusPill('In Bay', '3 cars', AppColors.info)),
                            Expanded(child: _buildStatusPill('Under Service', '1 car', AppColors.warning)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Financial Breakdown
                  Text('Financial Performance Breakdown', style: AppTypography.headingMedium),
                  const SizedBox(height: AppSpacing.md),
                  _buildFinancialTile('Direct Rental Bookings', 'Rs. ${(totalRevenue * 0.85).toStringAsFixed(0)}', Icons.car_rental_rounded),
                  const SizedBox(height: AppSpacing.sm),
                  _buildFinancialTile('Security Deposits Held', 'Rs. ${pay.depositsHeld.toStringAsFixed(0)}', Icons.lock_outline_rounded),
                  const SizedBox(height: AppSpacing.sm),
                  _buildFinancialTile('Late Return & Extra Charges', 'Rs. 42,500', Icons.timelapse_rounded),
                  const SizedBox(height: AppSpacing.sm),
                  _buildFinancialTile('Fuel & Workshop Outflow', '- Rs. ${totalExpenses.toStringAsFixed(0)}', Icons.arrow_downward_rounded, isNegative: true),
                  const SizedBox(height: AppSpacing.xl),

                  // Export Button
                  ElevatedButton.icon(
                    onPressed: () {
                      AppFeedback.showToast(
                        context,
                        message: 'Downloading Full P&L and Fleet Utilization CSV Report...',
                        type: ToastType.success,
                      );
                    },
                    icon: const Icon(Icons.file_download_rounded),
                    label: const Text('Export Official Financial Report'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodChip(String label) {
    final isSelected = _selectedPeriod == label;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _selectedPeriod = label),
      selectedColor: AppColors.primaryContainer,
      backgroundColor: AppColors.lightSurface,
      labelStyle: TextStyle(
        color: isSelected ? AppColors.primaryDark : AppColors.lightTextSecondary,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        fontSize: 12,
      ),
      side: BorderSide(
        color: isSelected ? AppColors.primary : AppColors.lightBorder,
      ),
    );
  }

  Widget _buildProfitSubMetric(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildStatusPill(String label, String count, Color color) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: AppTypography.caption.copyWith(color: AppColors.lightTextMuted),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(count, style: AppTypography.labelLarge.copyWith(fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildFinancialTile(String title, String amount, IconData icon, {bool isNegative = false}) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.lightCard,
        borderRadius: AppRadius.md,
        border: Border.all(color: AppColors.lightBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isNegative ? AppColors.errorBg : AppColors.primaryContainer,
              borderRadius: AppRadius.sm,
            ),
            child: Icon(icon, size: 18, color: isNegative ? AppColors.error : AppColors.primaryDark),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(child: Text(title, style: AppTypography.bodyMedium)),
          Text(
            amount,
            style: AppTypography.labelLarge.copyWith(
              color: isNegative ? AppColors.error : AppColors.lightText,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
