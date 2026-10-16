import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../models/contract_model.dart';
import '../../providers/contract_provider.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import 'contract_detail_screen.dart';

class ContractsListScreen extends StatefulWidget {
  const ContractsListScreen({super.key});

  @override
  State<ContractsListScreen> createState() => _ContractsListScreenState();
}

class _ContractsListScreenState extends State<ContractsListScreen> {
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ContractProvider>().fetchContracts();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final contractProv = context.watch<ContractProvider>();
    final contracts = contractProv.contracts.where((c) {
      if (_searchCtrl.text.isEmpty) return true;
      final q = _searchCtrl.text.toLowerCase();
      return c.contractNumber.toLowerCase().contains(q) ||
          c.customerName.toLowerCase().contains(q) ||
          c.vehicleName.toLowerCase().contains(q);
    }).toList();

    return AppScaffold(
      body: Column(
        children: [
          AppHeader(
            title: 'Contracts & Legal',
            subtitle: 'Digital rental agreements & customer e-signatures',
            showBackButton: true,
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: () => contractProv.fetchContracts(forceRefresh: true),
              ),
            ],
          ),

          // Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm,
            ),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Search contract #, customer or vehicle...',
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() {});
                        },
                      )
                    : null,
              ),
            ),
          ),

          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xs),
            child: Row(
              children: [
                _buildFilterChip('All', 'all', contractProv),
                const SizedBox(width: AppSpacing.sm),
                _buildFilterChip('Signed', 'signed', contractProv),
                const SizedBox(width: AppSpacing.sm),
                _buildFilterChip('Pending Signature', 'pending', contractProv),
                const SizedBox(width: AppSpacing.sm),
                _buildFilterChip('Expired', 'expired', contractProv),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          // Contracts List
          Expanded(
            child: contractProv.isLoading
                ? AppFeedback.loading(message: 'Loading contracts...')
                : contracts.isEmpty
                    ? AppFeedback.empty(
                        title: 'No Contracts Found',
                        message: 'No rental agreements match the selected criteria.',
                        icon: Icons.history_edu_rounded,
                      )
                    : RefreshIndicator(
                        onRefresh: () => contractProv.fetchContracts(forceRefresh: true),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          itemCount: contracts.length,
                          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                          itemBuilder: (context, index) {
                            return _buildContractCard(context, contracts[index]);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, ContractProvider prov) {
    final isSelected = prov.selectedFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => prov.setFilter(value),
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

  Widget _buildContractCard(BuildContext context, ContractModel contract) {
    final isSigned = contract.isSigned;

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ContractDetailScreen(contract: contract),
          ),
        );
      },
      borderRadius: AppRadius.lg,
      child: Container(
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    borderRadius: AppRadius.xs,
                  ),
                  child: Text(
                    contract.contractNumber,
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 4),
                  decoration: BoxDecoration(
                    color: isSigned ? AppColors.successBg : AppColors.warningBg,
                    borderRadius: AppRadius.full,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isSigned ? Icons.check_circle_rounded : Icons.pending_rounded,
                        size: 14,
                        color: isSigned ? AppColors.success : AppColors.warning,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isSigned ? 'SIGNED' : 'PENDING SIGNATURE',
                        style: AppTypography.labelSmall.copyWith(
                          color: isSigned ? AppColors.success : AppColors.warning,
                          fontWeight: FontWeight.bold,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // Customer & Vehicle Info
            Text(
              contract.customerName,
              style: AppTypography.headingSmall.copyWith(
                color: AppColors.lightText,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                const Icon(Icons.directions_car_rounded, size: 16, color: AppColors.lightTextSecondary),
                const SizedBox(width: 6),
                Text(
                  '${contract.vehicleName} (${contract.vehiclePlate})',
                  style: AppTypography.bodySmall.copyWith(color: AppColors.lightTextSecondary),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            const Divider(color: AppColors.lightBorderLight, height: 1),
            const SizedBox(height: AppSpacing.md),

            // Amounts and Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Total Value', style: AppTypography.caption.copyWith(color: AppColors.lightTextMuted)),
                    Text(
                      'Rs. ${contract.totalAmount.toStringAsFixed(0)}',
                      style: AppTypography.labelLarge.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ContractDetailScreen(contract: contract),
                      ),
                    );
                  },
                  icon: Icon(isSigned ? Icons.remove_red_eye_rounded : Icons.edit_note_rounded, size: 16),
                  label: Text(isSigned ? 'View Agreement' : 'Sign Now'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isSigned ? AppColors.lightBorderLight : AppColors.primary,
                    foregroundColor: isSigned ? AppColors.lightText : Colors.white,
                    minimumSize: const Size(120, 36),
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
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
