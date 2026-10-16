import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../models/expense_model.dart';
import '../../providers/expense_provider.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ExpenseProvider>().fetchExpenses();
    });
  }

  void _showAddExpenseSheet() {
    final titleCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final plateCtrl = TextEditingController();
    final vendorCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    String category = 'Fuel';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.lightSurface,
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.topXl),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: AppSpacing.xl,
                right: AppSpacing.xl,
                top: AppSpacing.xl,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.xl,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Log Fleet Expense', style: AppTypography.headingMedium),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: titleCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Expense Description',
                        hintText: 'e.g. Fuel top-up, Toll tax, Oil change',
                        prefixIcon: Icon(Icons.receipt_long_rounded),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: amountCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Amount (Rs.)',
                              prefixIcon: Icon(Icons.payments_rounded),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: category,
                            decoration: const InputDecoration(labelText: 'Category'),
                            items: const [
                              DropdownMenuItem(value: 'Fuel', child: Text('Fuel')),
                              DropdownMenuItem(value: 'Maintenance', child: Text('Maintenance')),
                              DropdownMenuItem(value: 'Cleaning', child: Text('Cleaning')),
                              DropdownMenuItem(value: 'Insurance', child: Text('Insurance')),
                              DropdownMenuItem(value: 'Toll', child: Text('Toll & Parking')),
                              DropdownMenuItem(value: 'Other', child: Text('Other')),
                            ],
                            onChanged: (v) => setSheetState(() => category = v ?? 'Fuel'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: plateCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Associated Vehicle Plate (Optional)',
                        hintText: 'e.g. BA 2 CHA 4492',
                        prefixIcon: Icon(Icons.directions_car_rounded),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: vendorCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Vendor / Fuel Station',
                        hintText: 'e.g. Sajha Petrol Pump',
                        prefixIcon: Icon(Icons.storefront_rounded),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: notesCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Internal Notes',
                        hintText: 'Bill number, odometer at refueling...',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    ElevatedButton(
                      onPressed: () async {
                        if (titleCtrl.text.isEmpty || amountCtrl.text.isEmpty) {
                          AppFeedback.showToast(
                            context,
                            message: 'Please provide expense title and amount',
                            type: ToastType.error,
                          );
                          return;
                        }
                        Navigator.pop(ctx);
                        await context.read<ExpenseProvider>().addExpense(
                              title: titleCtrl.text,
                              category: category,
                              amount: double.tryParse(amountCtrl.text) ?? 0.0,
                              vehiclePlate: plateCtrl.text.isNotEmpty ? plateCtrl.text : null,
                              vendor: vendorCtrl.text.isNotEmpty ? vendorCtrl.text : null,
                              notes: notesCtrl.text.isNotEmpty ? notesCtrl.text : null,
                            );
                        if (mounted) {
                          AppFeedback.showToast(
                            context,
                            message: 'Expense recorded successfully!',
                            type: ToastType.success,
                          );
                        }
                      },
                      child: const Text('Save Expense'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final exp = context.watch<ExpenseProvider>();

    return AppScaffold(
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_expenses',
        onPressed: _showAddExpenseSheet,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('Add Expense', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          AppHeader(
            title: 'Fleet Expenses',
            subtitle: 'Operating costs, fuel bills, repairs & receipts',
            showBackButton: true,
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: () => exp.fetchExpenses(forceRefresh: true),
              ),
            ],
          ),

          // Monthly Summary Cards
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: _buildMetricTile(
                    label: 'Total Expenses',
                    value: 'Rs. ${exp.totalExpenses.toStringAsFixed(0)}',
                    icon: Icons.account_balance_wallet_rounded,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _buildMetricTile(
                    label: 'Fuel Fleet Cost',
                    value: 'Rs. ${exp.fuelExpenses.toStringAsFixed(0)}',
                    icon: Icons.local_gas_station_rounded,
                    color: AppColors.warning,
                  ),
                ),
              ],
            ),
          ),

          // Categories Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xs),
            child: Row(
              children: [
                _buildCategoryChip('All', exp),
                const SizedBox(width: AppSpacing.sm),
                _buildCategoryChip('Fuel', exp),
                const SizedBox(width: AppSpacing.sm),
                _buildCategoryChip('Maintenance', exp),
                const SizedBox(width: AppSpacing.sm),
                _buildCategoryChip('Cleaning', exp),
                const SizedBox(width: AppSpacing.sm),
                _buildCategoryChip('Insurance', exp),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          // Expenses List
          Expanded(
            child: exp.isLoading
                ? AppFeedback.loading(message: 'Loading fleet expenses...')
                : exp.expenses.isEmpty
                    ? AppFeedback.empty(
                        title: 'No Expenses Recorded',
                        message: 'Log expenses such as fuel, toll, or spare parts to track fleet margins.',
                        icon: Icons.receipt_rounded,
                      )
                    : RefreshIndicator(
                        onRefresh: () => exp.fetchExpenses(forceRefresh: true),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          itemCount: exp.expenses.length,
                          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                          itemBuilder: (context, index) {
                            final item = exp.expenses[index];
                            return _buildExpenseCard(item);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.lightCard,
        borderRadius: AppRadius.md,
        border: Border.all(color: AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(label, style: AppTypography.caption.copyWith(color: AppColors.lightTextMuted)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: AppTypography.headingSmall.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.lightText,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String category, ExpenseProvider prov) {
    final isSelected = prov.selectedCategory == category;
    return ChoiceChip(
      label: Text(category),
      selected: isSelected,
      onSelected: (_) => prov.setCategory(category),
      selectedColor: AppColors.primaryContainer,
      backgroundColor: AppColors.lightSurface,
      labelStyle: TextStyle(
        color: isSelected ? AppColors.primaryDark : AppColors.lightTextSecondary,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        fontSize: 13,
      ),
      side: BorderSide(
        color: isSelected ? AppColors.primary : AppColors.lightBorder,
      ),
    );
  }

  Widget _buildExpenseCard(ExpenseModel item) {
    IconData getCategoryIcon(String cat) {
      switch (cat.toLowerCase()) {
        case 'fuel':
          return Icons.local_gas_station_rounded;
        case 'maintenance':
          return Icons.build_rounded;
        case 'cleaning':
          return Icons.local_car_wash_rounded;
        case 'insurance':
          return Icons.verified_user_rounded;
        default:
          return Icons.receipt_rounded;
      }
    }

    return Container(
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
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer,
              borderRadius: AppRadius.md,
            ),
            child: Icon(getCategoryIcon(item.category), color: AppColors.primaryDark),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.title, style: AppTypography.labelLarge),
                const SizedBox(height: 2),
                Text(
                  '${item.category} • ${item.date.toString().substring(0, 10)}${item.vehiclePlate != null ? " • ${item.vehiclePlate}" : ""}',
                  style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary),
                ),
                if (item.vendor != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Vendor: ${item.vendor}',
                    style: AppTypography.caption.copyWith(color: AppColors.lightTextMuted),
                  ),
                ],
              ],
            ),
          ),
          Text(
            'Rs. ${item.amount.toStringAsFixed(0)}',
            style: AppTypography.labelLarge.copyWith(
              color: AppColors.error,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
