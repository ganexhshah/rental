import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../models/marketing_model.dart';
import '../../providers/marketing_provider.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class MarketingScreen extends StatefulWidget {
  const MarketingScreen({super.key});

  @override
  State<MarketingScreen> createState() => _MarketingScreenState();
}

class _MarketingScreenState extends State<MarketingScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketingProvider>().fetchCoupons();
    });
  }

  void _showCreateCouponSheet() {
    final codeCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final valCtrl = TextEditingController();
    final minDaysCtrl = TextEditingController(text: '1');
    String discountType = 'percentage';

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
                        Text('Create Promo Coupon', style: AppTypography.headingMedium),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: codeCtrl,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        labelText: 'Promo Code',
                        hintText: 'e.g. MONSOON20, DASHAIN15',
                        prefixIcon: Icon(Icons.confirmation_number_rounded),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: descCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Coupon Description',
                        hintText: 'e.g. 15% discount for 3+ day rentals',
                        prefixIcon: Icon(Icons.description_rounded),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: discountType,
                            decoration: const InputDecoration(labelText: 'Discount Type'),
                            items: const [
                              DropdownMenuItem(value: 'percentage', child: Text('Percentage (%)')),
                              DropdownMenuItem(value: 'fixed_amount', child: Text('Flat (Rs.)')),
                            ],
                            onChanged: (v) => setSheetState(() => discountType = v ?? 'percentage'),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: TextField(
                            controller: valCtrl,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: discountType == 'percentage' ? 'Percent Value (%)' : 'Amount (Rs.)',
                              prefixIcon: const Icon(Icons.discount_rounded),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: minDaysCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Minimum Rental Days',
                        prefixIcon: Icon(Icons.calendar_today_rounded),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    ElevatedButton(
                      onPressed: () async {
                        if (codeCtrl.text.isEmpty || valCtrl.text.isEmpty) {
                          AppFeedback.showToast(
                            context,
                            message: 'Please provide promo code and discount value',
                            type: ToastType.error,
                          );
                          return;
                        }
                        Navigator.pop(ctx);
                        await context.read<MarketingProvider>().createCoupon(
                              code: codeCtrl.text,
                              description: descCtrl.text,
                              discountType: discountType,
                              discountValue: double.tryParse(valCtrl.text) ?? 10.0,
                              minRentalDays: double.tryParse(minDaysCtrl.text) ?? 1.0,
                              validUntil: DateTime.now().add(const Duration(days: 30)),
                            );
                        if (mounted) {
                          AppFeedback.showToast(
                            context,
                            message: 'Promo coupon ${codeCtrl.text.toUpperCase()} created!',
                            type: ToastType.success,
                          );
                        }
                      },
                      child: const Text('Generate Coupon'),
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
    final mkt = context.watch<MarketingProvider>();

    return AppScaffold(
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_marketing',
        onPressed: _showCreateCouponSheet,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('New Coupon', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          AppHeader(
            title: 'Marketing & Promos',
            subtitle: 'Discount coupons, campaigns & referral codes',
            showBackButton: true,
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: () => mkt.fetchCoupons(forceRefresh: true),
              ),
            ],
          ),

          // Coupon List
          Expanded(
            child: mkt.isLoading
                ? AppFeedback.loading(message: 'Loading active coupons...')
                : mkt.coupons.isEmpty
                    ? AppFeedback.empty(
                        title: 'No Promo Coupons',
                        message: 'Create discounts to incentivize repeat customer rentals and off-peak bookings.',
                        icon: Icons.local_offer_rounded,
                      )
                    : RefreshIndicator(
                        onRefresh: () => mkt.fetchCoupons(forceRefresh: true),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          itemCount: mkt.coupons.length,
                          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                          itemBuilder: (context, index) {
                            final coupon = mkt.coupons[index];
                            return _buildCouponCard(context, coupon, mkt);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildCouponCard(BuildContext context, CouponModel coupon, MarketingProvider mkt) {
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: AppRadius.sm,
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                ),
                child: Text(
                  coupon.code,
                  style: AppTypography.labelLarge.copyWith(
                    color: AppColors.primaryDark,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
              Switch.adaptive(
                value: coupon.isActive,
                activeColor: AppColors.primary,
                onChanged: (_) {
                  mkt.toggleCoupon(coupon.id);
                  AppFeedback.showToast(
                    context,
                    message: coupon.isActive ? 'Coupon deactivated' : 'Coupon activated',
                    type: ToastType.info,
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          Text(coupon.description, style: AppTypography.bodyMedium),
          const SizedBox(height: AppSpacing.sm),

          Row(
            children: [
              const Icon(Icons.discount_rounded, size: 14, color: AppColors.primary),
              const SizedBox(width: 4),
              Text(
                coupon.discountType == 'percentage'
                    ? '${coupon.discountValue.toStringAsFixed(0)}% Discount'
                    : 'Rs. ${coupon.discountValue.toStringAsFixed(0)} OFF',
                style: AppTypography.labelSmall.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              const Icon(Icons.people_outline_rounded, size: 14, color: AppColors.lightTextMuted),
              const SizedBox(width: 4),
              Text(
                '${coupon.usageCount} times redeemed',
                style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),

          Text(
            'Valid until ${coupon.validUntil.toString().substring(0, 10)} • Min ${coupon.minRentalDays.toStringAsFixed(0)} rental days',
            style: AppTypography.caption.copyWith(color: AppColors.lightTextMuted),
          ),
        ],
      ),
    );
  }
}
