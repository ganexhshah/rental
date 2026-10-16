import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../buttons/app_buttons.dart';

class BottomSheetHeader extends StatelessWidget {
  final String title;
  final String? subtitle;

  const BottomSheetHeader({
    super.key,
    required this.title,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
          child: Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            decoration: BoxDecoration(
              color: Colors.grey.withOpacity(0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
        Text(title, style: AppTypography.headingMedium),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle!,
            style: AppTypography.bodySmall.copyWith(color: AppColors.darkTextMuted),
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        const Divider(),
      ],
    );
  }
}

class ActionSheetItem {
  final String title;
  final String? subtitle;
  final IconData icon;
  final VoidCallback onTap;
  final bool isDestructive;

  ActionSheetItem({
    required this.title,
    this.subtitle,
    required this.icon,
    required this.onTap,
    this.isDestructive = false,
  });
}

class AppActionSheet extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<ActionSheetItem> items;

  const AppActionSheet({
    super.key,
    required this.title,
    this.subtitle,
    required this.items,
  });

  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    String? subtitle,
    required List<ActionSheetItem> items,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => AppActionSheet(
        title: title,
        subtitle: subtitle,
        items: items,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        AppSpacing.xxl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          BottomSheetHeader(title: title, subtitle: subtitle),
          ...items.map((item) {
            final color = item.isDestructive ? AppColors.error : null;
            return ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: (item.isDestructive ? AppColors.error : AppColors.primary)
                      .withOpacity(0.12),
                  borderRadius: AppRadius.sm,
                ),
                child: Icon(item.icon, size: 20, color: color ?? AppColors.primary),
              ),
              title: Text(
                item.title,
                style: AppTypography.bodyLarge.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: item.subtitle != null
                  ? Text(item.subtitle!, style: AppTypography.bodySmall)
                  : null,
              contentPadding: EdgeInsets.zero,
              onTap: () {
                Navigator.of(context).pop();
                item.onTap();
              },
            );
          }),
        ],
      ),
    );
  }
}

class FilterBottomSheet extends StatefulWidget {
  final String initialStatus;
  final String? initialPaymentStatus;
  final void Function(String status, String? paymentStatus) onApply;
  final VoidCallback onReset;

  const FilterBottomSheet({
    super.key,
    required this.initialStatus,
    this.initialPaymentStatus,
    required this.onApply,
    required this.onReset,
  });

  static Future<void> show({
    required BuildContext context,
    required String currentStatus,
    String? currentPaymentStatus,
    required void Function(String, String?) onApply,
    required VoidCallback onReset,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => FilterBottomSheet(
        initialStatus: currentStatus,
        initialPaymentStatus: currentPaymentStatus,
        onApply: onApply,
        onReset: onReset,
      ),
    );
  }

  @override
  State<FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<FilterBottomSheet> {
  late String _selectedStatus;
  String? _selectedPaymentStatus;

  static const statuses = [
    'all',
    'pending',
    'confirmed',
    'pickup_scheduled',
    'active',
    'return_in_progress',
    'completed',
    'cancelled',
  ];

  static const paymentStatuses = [
    'all',
    'unpaid',
    'partially_paid',
    'paid',
    'refunded',
  ];

  @override
  void initState() {
    super.initState();
    _selectedStatus = widget.initialStatus;
    _selectedPaymentStatus = widget.initialPaymentStatus ?? 'all';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        AppSpacing.xxl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const BottomSheetHeader(
            title: 'Filter Bookings',
            subtitle: 'Filter active operations by state and payment',
          ),

          Text('Booking Status', style: AppTypography.labelMedium),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.xs,
            children: statuses.map((st) {
              final isSelected = _selectedStatus == st;
              return ChoiceChip(
                label: Text(st.replaceAll('_', ' ').toUpperCase()),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) setState(() => _selectedStatus = st);
                },
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : null,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: AppSpacing.lg),
          Text('Payment Status', style: AppTypography.labelMedium),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.xs,
            children: paymentStatuses.map((pst) {
              final isSelected = _selectedPaymentStatus == pst;
              return ChoiceChip(
                label: Text(pst.replaceAll('_', ' ').toUpperCase()),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) setState(() => _selectedPaymentStatus = pst);
                },
                selectedColor: AppColors.secondary,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : null,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: AppSpacing.xxl),
          Row(
            children: [
              Expanded(
                child: SecondaryButton(
                  label: 'Reset Filters',
                  onPressed: () {
                    widget.onReset();
                    Navigator.of(context).pop();
                  },
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: PrimaryButton(
                  label: 'Apply Filters',
                  onPressed: () {
                    widget.onApply(_selectedStatus, _selectedPaymentStatus);
                    Navigator.of(context).pop();
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
