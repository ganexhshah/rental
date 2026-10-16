import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/payment_model.dart';
import '../../providers/payment_provider.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import 'invoice_detail_screen.dart';

class PaymentsHubScreen extends StatefulWidget {
  const PaymentsHubScreen({super.key});

  @override
  State<PaymentsHubScreen> createState() => _PaymentsHubScreenState();
}

class _PaymentsHubScreenState extends State<PaymentsHubScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PaymentProvider>().loadFinancials();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final payProv = context.watch<PaymentProvider>();

    return AppScaffold(
      appBar: AppHeader(
        title: 'Financials & Invoices',
        subtitle: 'Cash, bank transfers, deposits & billing',
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primaryLight,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'Transactions'),
            Tab(text: 'Security Deposits'),
            Tab(text: 'Invoices'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // 1. Transactions Tab
          RefreshIndicator(
            onRefresh: () => payProv.loadFinancials(),
            color: AppColors.primary,
            child: payProv.isLoading
                ? ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: 4,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                    itemBuilder: (_, __) => const LoadingSkeleton(height: 70),
                  )
                : payProv.payments.isEmpty
                    ? const EmptyStateWidget(
                        icon: Icons.account_balance_wallet_rounded,
                        title: 'No Transactions Found',
                        description: 'No customer payments recorded in this ledger.',
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        itemCount: payProv.payments.length,
                        itemBuilder: (ctx, idx) {
                          final p = payProv.payments[idx];
                          return Card(
                            margin: const EdgeInsets.only(bottom: AppSpacing.md),
                            child: Padding(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppColors.success.withOpacity(0.12),
                                      borderRadius: AppRadius.sm,
                                    ),
                                    child: const Icon(
                                      Icons.account_balance_wallet_rounded,
                                      color: AppColors.success,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          p.transactionNumber,
                                          style: AppTypography.monospace.copyWith(fontWeight: FontWeight.bold),
                                        ),
                                        Text(
                                          '${p.customerName} • ${p.method.toUpperCase()}',
                                          style: AppTypography.bodySmall,
                                        ),
                                        Text(
                                          DateFormatter.formatDateTime(p.createdAt),
                                          style: AppTypography.bodySmall.copyWith(
                                            color: AppColors.darkTextMuted,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        CurrencyFormatter.format(p.amount),
                                        style: AppTypography.headingSmall.copyWith(
                                          color: AppColors.success,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      StatusChip(status: p.status),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // 2. Security Deposits Tab
          RefreshIndicator(
            onRefresh: () => payProv.loadFinancials(),
            color: AppColors.primary,
            child: payProv.deposits.isEmpty
                ? const EmptyStateWidget(
                    icon: Icons.shield_rounded,
                    title: 'No Security Deposits Held',
                    description: 'No active deposits currently retained for fleet bookings.',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: payProv.deposits.length,
                    itemBuilder: (ctx, idx) {
                      final d = payProv.deposits[idx];
                      return Card(
                        margin: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(d.bookingCode, style: AppTypography.monospace.copyWith(fontWeight: FontWeight.bold)),
                                  StatusChip(status: d.status),
                                ],
                              ),
                              const Divider(height: AppSpacing.md),
                              KeyValueRow(label: 'Customer', value: d.customerName),
                              KeyValueRow(
                                label: 'Deposit Held',
                                value: CurrencyFormatter.format(d.amount),
                                valueStyle: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              KeyValueRow(label: 'Collection Method', value: d.method.toUpperCase()),
                              KeyValueRow(label: 'Held Since', value: DateFormatter.formatDate(d.heldAt)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // 3. Invoices Tab
          RefreshIndicator(
            onRefresh: () => payProv.loadFinancials(),
            color: AppColors.primary,
            child: payProv.invoices.isEmpty
                ? const EmptyStateWidget(
                    icon: Icons.receipt_long_rounded,
                    title: 'No Invoices Issued',
                    description: 'Invoices are generated upon booking confirmation and return completion.',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: payProv.invoices.length,
                    itemBuilder: (ctx, idx) {
                      final inv = payProv.invoices[idx];
                      return Card(
                        margin: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: InkWell(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => InvoiceDetailScreen(
                                  bookingId: inv.bookingId,
                                  bookingCode: inv.bookingCode,
                                  customerName: inv.customerName,
                                  totalAmount: inv.totalAmount,
                                  balanceDue: inv.balanceDue,
                                ),
                              ),
                            );
                          },
                          borderRadius: AppRadius.lg,
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      inv.invoiceNumber,
                                      style: AppTypography.monospace.copyWith(fontWeight: FontWeight.bold),
                                    ),
                                    StatusChip(status: inv.status),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(inv.customerName, style: AppTypography.bodySmall),
                                const Divider(height: AppSpacing.md),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Due: ${DateFormatter.formatDate(inv.dueDate)}',
                                      style: AppTypography.bodySmall.copyWith(color: AppColors.darkTextMuted),
                                    ),
                                    Text(
                                      CurrencyFormatter.format(inv.totalAmount),
                                      style: AppTypography.headingSmall.copyWith(
                                        color: AppColors.primaryLight,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
