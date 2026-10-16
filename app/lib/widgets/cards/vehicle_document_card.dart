import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/vehicle_model.dart';

/// Reusable vehicle compliance document card
class VehicleDocumentCard extends StatelessWidget {
  final VehicleDocument document;
  final VoidCallback? onAudit;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;

  const VehicleDocumentCard({
    super.key,
    required this.document,
    this.onAudit,
    this.onDelete,
    this.onTap,
  });

  IconData _getDocIcon(String docType) {
    switch (docType.toLowerCase()) {
      case 'insurance':
        return Icons.security_rounded;
      case 'bluebook':
      case 'registration':
        return Icons.badge_rounded;
      case 'road_tax':
        return Icons.receipt_long_rounded;
      case 'pollution':
      case 'emission':
        return Icons.eco_rounded;
      case 'permit':
        return Icons.commute_rounded;
      case 'fitness':
        return Icons.verified_user_rounded;
      default:
        return Icons.description_rounded;
    }
  }

  String _formatDocType(String docType) {
    switch (docType.toLowerCase()) {
      case 'bluebook':
        return 'Bluebook (Registration)';
      case 'insurance':
        return 'Comprehensive Insurance';
      case 'road_tax':
        return 'Road Tax Token';
      case 'pollution':
        return 'Pollution / Emission Test';
      case 'permit':
        return 'Route Permit';
      case 'fitness':
        return 'Fitness Certificate';
      default:
        return docType.replaceAll('_', ' ').toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final softGray = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final hardGray = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    final expiry = document.expiryDate;
    final now = DateTime.now();
    final daysRemaining = expiry?.difference(now).inDays;
    final isExpired = daysRemaining != null && daysRemaining < 0;
    final isExpiringSoon = daysRemaining != null && !isExpired && daysRemaining <= 30;
    final isVerified = document.verificationStatus == 'verified';

    return InkWell(
      onTap: onTap ?? onAudit,
      borderRadius: AppRadius.lg,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: softGray,
          borderRadius: AppRadius.lg,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Type Icon, Title & Plate, Expiry Pill
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: hardGray,
                    borderRadius: AppRadius.md,
                  ),
                  child: Icon(
                    _getDocIcon(document.docType),
                    color: AppColors.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        document.name.isNotEmpty ? document.name : _formatDocType(document.docType),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          if (document.vehiclePlate != null && document.vehiclePlate!.isNotEmpty) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: hardGray,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                document.vehiclePlate!,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          if (document.vehicleName != null && document.vehicleName!.isNotEmpty)
                            Expanded(
                              child: Text(
                                document.vehicleName!,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (daysRemaining != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isExpired
                          ? AppColors.error.withOpacity(0.12)
                          : (isExpiringSoon ? AppColors.warning.withOpacity(0.15) : AppColors.success.withOpacity(0.12)),
                      borderRadius: AppRadius.full,
                    ),
                    child: Text(
                      isExpired
                          ? 'Expired ${-daysRemaining}d ago'
                          : (isExpiringSoon ? 'Expires in ${daysRemaining}d' : 'Valid (${daysRemaining}d)'),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isExpired
                            ? AppColors.error
                            : (isExpiringSoon ? AppColors.warning : AppColors.success),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),

            // Hard Gray Block: Policy/Doc #, Expiry Date, Authority
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: hardGray,
                borderRadius: AppRadius.md,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'DOCUMENT / POLICY #',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          document.documentNumber?.isNotEmpty == true ? document.documentNumber! : 'N/A',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: isDark ? AppColors.darkText : AppColors.lightText,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (expiry != null)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'EXPIRY DATE',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            DateFormatter.formatShortDate(expiry),
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isExpired
                                  ? AppColors.error
                                  : (isDark ? AppColors.darkText : AppColors.lightText),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            // Bottom Actions Row: Verification Badge & Action Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isVerified ? Icons.verified_rounded : Icons.pending_actions_rounded,
                      size: 15,
                      color: isVerified ? AppColors.success : AppColors.warning,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isVerified ? 'Verified & Audited' : (document.verificationStatus == 'rejected' ? 'Rejected' : 'Pending Verification'),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isVerified
                            ? AppColors.success
                            : (document.verificationStatus == 'rejected' ? AppColors.error : AppColors.warning),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    if (onDelete != null)
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 18),
                        color: AppColors.error,
                        tooltip: 'Delete Document',
                        visualDensity: VisualDensity.compact,
                        onPressed: onDelete,
                      ),
                    if (onAudit != null)
                      TextButton.icon(
                        onPressed: onAudit,
                        icon: const Icon(Icons.rule_rounded, size: 15, color: AppColors.primary),
                        label: const Text(
                          'Audit / Action',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                        style: TextButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

