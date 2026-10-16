import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/report_model.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final List<AppNotification> _notifications = [
    AppNotification(
      id: 'notif-1',
      title: 'Handover Ready: BK-20261006-076AC8',
      message: 'Scorpio S11 is prepped and ready for customer pickup at Thamel Hub.',
      type: 'booking',
      isRead: false,
      createdAt: DateTime.now().subtract(const Duration(minutes: 25)),
    ),
    AppNotification(
      id: 'notif-2',
      title: 'Payment Received: Rs. 34,182.50',
      message: 'Bank transfer confirmed for reservation BK-20261005-F09367.',
      type: 'payment',
      isRead: true,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
    ),
    AppNotification(
      id: 'notif-3',
      title: 'Upcoming Service: BA 2 CHA 5678',
      message: 'Oil filter and brake inspection due within 500 km.',
      type: 'maintenance',
      isRead: true,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: const AppHeader(
        title: 'Notification Center',
        subtitle: 'Alerts & operational updates',
      ),
      body: _notifications.isEmpty
          ? const EmptyStateWidget(
              icon: Icons.notifications_none_rounded,
              title: 'No Notifications',
              description: 'You are all caught up with fleet and reservation alerts.',
            )
          : ListView.builder(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: _notifications.length,
              itemBuilder: (ctx, idx) {
                final notif = _notifications[idx];
                return Card(
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: (notif.isRead ? Colors.grey : AppColors.primary).withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        notif.type == 'payment'
                            ? Icons.payments_rounded
                            : (notif.type == 'maintenance'
                                ? Icons.build_rounded
                                : Icons.receipt_long_rounded),
                        color: notif.isRead ? Colors.grey : AppColors.primary,
                        size: 20,
                      ),
                    ),
                    title: Text(
                      notif.title,
                      style: AppTypography.bodyMedium.copyWith(
                        fontWeight: notif.isRead ? FontWeight.normal : FontWeight.bold,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 2),
                        Text(notif.message, style: AppTypography.bodySmall),
                        const SizedBox(height: 4),
                        Text(
                          DateFormatter.formatDateTime(notif.createdAt),
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.darkTextMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
