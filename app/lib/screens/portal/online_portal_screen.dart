import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../providers/fleet_provider.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class OnlinePortalScreen extends StatefulWidget {
  const OnlinePortalScreen({super.key});

  @override
  State<OnlinePortalScreen> createState() => _OnlinePortalScreenState();
}

class _OnlinePortalScreenState extends State<OnlinePortalScreen> {
  bool _instantBooking = true;
  bool _requireDeposit = true;

  @override
  Widget build(BuildContext context) {
    final fleet = context.watch<FleetProvider>();

    return AppScaffold(
      body: Column(
        children: [
          AppHeader(
            title: 'Online Booking Portal',
            subtitle: 'Customer self-service portal & direct reservations',
            showBackButton: true,
            actions: [
              IconButton(
                icon: const Icon(Icons.share_rounded),
                onPressed: () {
                  AppFeedback.showToast(
                    context,
                    message: 'Public Booking URL copied: https://rent.himalayanrides.com',
                    type: ToastType.info,
                  );
                },
              ),
            ],
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Portal Banner Card
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: AppRadius.lg,
                      border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.public_rounded, size: 36, color: AppColors.primaryDark),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Public Portal is LIVE',
                                style: AppTypography.labelLarge.copyWith(
                                  color: AppColors.primaryDark,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'rent.himalayanrides.com • Accepting 24/7 web inquiries & online bookings',
                                style: AppTypography.caption.copyWith(color: AppColors.primaryDark),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Portal Controls
                  Text('Portal Rules & Controls', style: AppTypography.headingMedium),
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.lightCard,
                      borderRadius: AppRadius.lg,
                      border: Border.all(color: AppColors.lightBorder),
                    ),
                    child: Column(
                      children: [
                        SwitchListTile.adaptive(
                          title: const Text('Instant Online Booking'),
                          subtitle: const Text('Allow verified tourists to reserve cars without prior approval'),
                          value: _instantBooking,
                          activeColor: AppColors.primary,
                          onChanged: (v) => setState(() => _instantBooking = v),
                        ),
                        const Divider(color: AppColors.lightBorderLight),
                        SwitchListTile.adaptive(
                          title: const Text('Require 20% Advance Deposit'),
                          subtitle: const Text('Hold booking through eSewa, Khalti, or Credit Card'),
                          value: _requireDeposit,
                          activeColor: AppColors.primary,
                          onChanged: (v) => setState(() => _requireDeposit = v),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Showcase Vehicles Preview
                  Text('Public Showcase Fleet', style: AppTypography.headingMedium),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Vehicles visible to customers on your public booking website',
                    style: AppTypography.bodySmall.copyWith(color: AppColors.lightTextSecondary),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  ...fleet.vehicles.map((v) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: AppSpacing.md),
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      decoration: BoxDecoration(
                        color: AppColors.lightCard,
                        borderRadius: AppRadius.lg,
                        border: Border.all(color: AppColors.lightBorder),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.02),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: AppColors.primaryContainer,
                              borderRadius: AppRadius.md,
                            ),
                            child: const Icon(Icons.directions_car_rounded, size: 30, color: AppColors.primaryDark),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${v.make} ${v.model}', style: AppTypography.labelLarge),
                                const SizedBox(height: 2),
                                Text(
                                  '${v.category} • ${v.transmission} • ${v.fuelType}',
                                  style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Rs. ${v.dailyRate.toStringAsFixed(0)} / day',
                                  style: AppTypography.labelSmall.copyWith(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.successBg,
                              borderRadius: AppRadius.full,
                            ),
                            child: Text(
                              'SHOWCASE',
                              style: AppTypography.labelSmall.copyWith(
                                color: AppColors.success,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
