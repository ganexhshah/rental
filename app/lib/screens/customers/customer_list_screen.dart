import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../models/customer_model.dart';
import '../../providers/customer_provider.dart';
import '../../widgets/cards/rental_cards.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/inputs/app_inputs.dart';
import '../../widgets/sheets/add_customer_sheet.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import 'customer_detail_screen.dart';

class CustomerListScreen extends StatefulWidget {
  const CustomerListScreen({super.key});

  @override
  State<CustomerListScreen> createState() => _CustomerListScreenState();
}

class _CustomerListScreenState extends State<CustomerListScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CustomerProvider>().loadCustomers();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final customerProv = context.watch<CustomerProvider>();

    return AppScaffold(
      appBar: AppHeader(
        title: 'Customer Directory',
        subtitle: '${customerProv.customers.length} verified accounts',
        showBackButton: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_rounded),
            tooltip: 'Register Customer',
            onPressed: () => AddCustomerSheet.show(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => customerProv.loadCustomers(),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: AppSearchField(
              controller: _searchController,
              hint: 'Search by customer name, phone, email...',
              onChanged: (val) => customerProv.setSearchQuery(val),
              onClear: () => customerProv.setSearchQuery(''),
            ),
          ),
          const Divider(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => customerProv.loadCustomers(),
              color: AppColors.primary,
              child: customerProv.isLoading
                  ? ListView.separated(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      itemCount: 4,
                      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                      itemBuilder: (_, __) => const LoadingSkeleton(height: 80),
                    )
                  : customerProv.customers.isEmpty
                      ? const EmptyStateWidget(
                          icon: Icons.person_search_rounded,
                          title: 'No Customers Found',
                          description: 'No customer profiles match your search criteria.',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          itemCount: customerProv.customers.length,
                          itemBuilder: (ctx, idx) {
                            final c = customerProv.customers[idx];
                            return CustomerCard(
                              customer: c,
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => CustomerDetailScreen(customerId: c.id),
                                  ),
                                );
                              },
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_customer_list',
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_rounded),
        label: const Text('New Customer', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () => AddCustomerSheet.show(context),
      ),
    );
  }
}
