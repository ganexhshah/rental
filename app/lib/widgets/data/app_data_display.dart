import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';

class StatusChip extends StatelessWidget {
  final String status;
  final String? customLabel;

  const StatusChip({
    super.key,
    required this.status,
    this.customLabel,
  });

  IconData _getStatusIcon(String s) {
    switch (s.toLowerCase()) {
      case 'confirmed':
        return Icons.check_circle_outline_rounded;
      case 'active':
        return Icons.directions_car_rounded;
      case 'completed':
        return Icons.task_alt_rounded;
      case 'pickup_scheduled':
      case 'pickup_in_progress':
        return Icons.key_rounded;
      case 'return_in_progress':
        return Icons.assignment_return_rounded;
      case 'pending':
      case 'pending_verification':
      case 'pending_payment':
        return Icons.hourglass_top_rounded;
      case 'cancelled':
      case 'no_show':
      case 'expired':
      case 'rejected':
      case 'overdue':
        return Icons.cancel_rounded;
      case 'verified':
      case 'valid':
        return Icons.verified_user_rounded;
      case 'paid':
        return Icons.paid_rounded;
      default:
        return Icons.info_rounded;
    }
  }

  String _formatLabel(String s) {
    if (customLabel != null) return customLabel!;
    return s.replaceAll('_', ' ').toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final color = AppColors.statusColor(status);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(isDark ? 0.2 : 0.12),
        borderRadius: AppRadius.sm,
        border: Border.all(
          color: color.withOpacity(isDark ? 0.4 : 0.25),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_getStatusIcon(status), size: 12, color: color),
          const SizedBox(width: AppSpacing.xs),
          Text(
            _formatLabel(status),
            style: AppTypography.labelSmall.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 10.5,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}

class CurrencyText extends StatelessWidget {
  final double amount;
  final TextStyle? style;
  final bool showDecimals;
  final String symbol;

  const CurrencyText({
    super.key,
    required this.amount,
    this.style,
    this.showDecimals = true,
    this.symbol = 'Rs.',
  });

  @override
  Widget build(BuildContext context) {
    final text = CurrencyFormatter.format(
      amount,
      symbol: symbol,
      showDecimals: showDecimals,
    );
    return Text(
      text,
      style: style ?? AppTypography.headingSmall,
    );
  }
}

class DateText extends StatelessWidget {
  final DateTime? date;
  final String? dateStr;
  final bool includeTime;
  final TextStyle? style;

  const DateText({
    super.key,
    this.date,
    this.dateStr,
    this.includeTime = true,
    this.style,
  });

  @override
  Widget build(BuildContext context) {
    final formatted = date != null
        ? (includeTime ? DateFormatter.formatDateTime(date) : DateFormatter.formatDate(date))
        : (includeTime ? DateFormatter.formatDateTimeString(dateStr) : DateFormatter.formatDateString(dateStr));

    return Text(
      formatted,
      style: style ?? AppTypography.bodySmall,
    );
  }
}

class AppAvatar extends StatelessWidget {
  final String name;
  final String? photoUrl;
  final double size;

  static const String defaultProfileImage =
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

  const AppAvatar({
    super.key,
    required this.name,
    this.photoUrl,
    this.size = 38,
  });

  String _getInitials(String str) {
    final parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0][0].toUpperCase();
    }
    return 'U';
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = (photoUrl != null && photoUrl!.isNotEmpty)
        ? photoUrl!
        : defaultProfileImage;

    return CircleAvatar(
      radius: size / 2,
      backgroundColor: AppColors.primaryContainer,
      child: ClipOval(
        child: Image.network(
          imageUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Center(
            child: Text(
              _getInitials(name),
              style: TextStyle(
                color: AppColors.primaryDark,
                fontSize: size * 0.4,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class KpiCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color? color;
  final String? subtitle;
  final VoidCallback? onTap;

  const KpiCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    this.color,
    this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.primary;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.lg,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: AppTypography.labelSmall.copyWith(
                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: c.withOpacity(isDark ? 0.2 : 0.1),
                      borderRadius: AppRadius.sm,
                    ),
                    child: Icon(icon, size: 16, color: c),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                value,
                style: AppTypography.headingMedium.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle!,
                  style: AppTypography.bodySmall.copyWith(
                    color: c,
                    fontSize: 11,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class KeyValueRow extends StatelessWidget {
  final String label;
  final String value;
  final TextStyle? valueStyle;
  final Widget? trailing;

  const KeyValueRow({
    super.key,
    required this.label,
    required this.value,
    this.valueStyle,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.bodySmall.copyWith(
              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
            ),
          ),
          trailing ??
              Text(
                value,
                style: valueStyle ?? AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w500),
              ),
        ],
      ),
    );
  }
}
