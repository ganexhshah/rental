import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/dialogs/confirm_dialog.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';
import '../auth/login_screen.dart';
import '../bookings/active_rentals_list_screen.dart';
import '../bookings/operations_calendar_screen.dart';
import '../bookings/pickup_return_hub_screen.dart';
import '../contracts/contracts_list_screen.dart';
import '../expenses/expenses_screen.dart';
import '../fleet/add_edit_vehicle_screen.dart';
import '../fleet/vehicle_availability_screen.dart';
import '../fleet/vehicle_categories_screen.dart';
import '../fleet/vehicle_documents_screen.dart';
import '../fleet/vehicle_locations_screen.dart';
import '../maintenance/maintenance_hub_screen.dart';
import '../marketing/marketing_screen.dart';
import '../payments/payments_hub_screen.dart';
import '../portal/online_portal_screen.dart';
import '../reports/reports_screen.dart';
import '../settings/settings_screen.dart';
import '../staff/staff_hub_screen.dart';
import 'notifications_screen.dart';
import 'profile_settings_screen.dart';

class MoreHubScreen extends StatelessWidget {
  const MoreHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser;

    return AppScaffold(
      appBar: const AppHeader(
        title: 'Operations Hub',
        subtitle: 'All system modules, finances & configuration',
        showBackButton: false,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // Operator summary header
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
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
            child: InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfileSettingsScreen()),
                );
              },
              borderRadius: AppRadius.lg,
              child: Row(
                children: [
                  AppAvatar(name: user?.name ?? 'Admin', size: 48),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.name ?? 'Operator', style: AppTypography.headingSmall),
                        Text(user?.email ?? '', style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary)),
                        const SizedBox(height: 2),
                        Text(
                          'Himalayan Rides Nepal',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.lightTextMuted),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          // 1. FLEET & WORKFLOWS
          _buildCategoryHeader('Fleet & Operations'),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.calendar_month_rounded,
            title: 'Operations Calendar',
            subtitle: 'Dispatch timeline, reservations & vehicle occupancy',
            color: const Color(0xFF0284C7),
            onTap: () => _push(context, const OperationsCalendarScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.swap_horiz_rounded,
            title: 'Pickup & Return Terminal',
            subtitle: 'Vehicle dispatch checklists & return check-in terminal',
            color: const Color(0xFF0D9488),
            onTap: () => _push(context, const PickupReturnHubScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.directions_car_rounded,
            title: 'Active On-Road Rentals',
            subtitle: 'Live rentals, mileage tracking & rental extensions',
            color: const Color(0xFF2563EB),
            onTap: () => _push(context, const ActiveRentalsListScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.event_available_rounded,
            title: 'Fleet Availability Engine',
            subtitle: 'Real-time double-booking prevention calendar',
            color: AppColors.secondary,
            onTap: () => _push(context, const VehicleAvailabilityScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.category_rounded,
            title: 'Vehicle Categories & Types',
            subtitle: 'Class taxonomy, standard daily pricing & deposit tiers',
            color: const Color(0xFF7C3AED),
            onTap: () => _push(context, const VehicleCategoriesScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.location_on_rounded,
            title: 'Station Locations & Depots',
            subtitle: 'Branch depots & pickup stations across Nepal',
            color: const Color(0xFFEA580C),
            onTap: () => _push(context, const VehicleLocationsScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.build_circle_rounded,
            title: 'Fleet Maintenance Bay',
            subtitle: 'Work orders, service intervals & repair vendors',
            color: const Color(0xFFF97316),
            onTap: () => _push(context, const MaintenanceHubScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.badge_rounded,
            title: 'Vehicle Documents & Tax',
            subtitle: 'Insurance policies, bluebooks & road tax clearances',
            color: AppColors.info,
            onTap: () => _push(context, const VehicleDocumentsScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.add_circle_outline_rounded,
            title: 'Register New Fleet Asset',
            subtitle: 'Add vehicle make, specs, rates and plate number',
            color: AppColors.primary,
            onTap: () => _push(context, const AddEditVehicleScreen()),
          ),
          const SizedBox(height: AppSpacing.xl),

          // 2. LEGAL & CONTRACTS
          _buildCategoryHeader('Contracts & Legal'),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.draw_rounded,
            title: 'Contracts & E-Signatures',
            subtitle: 'Digital rental leases, terms and signature signing',
            color: const Color(0xFF8B5CF6),
            onTap: () => _push(context, const ContractsListScreen()),
          ),
          const SizedBox(height: AppSpacing.xl),

          // 3. FINANCE & ACCOUNTING
          _buildCategoryHeader('Finance & Performance'),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.payments_rounded,
            title: 'Payments & Invoices',
            subtitle: 'Ledger, deposits, refund settlements and PDF invoices',
            color: AppColors.success,
            onTap: () => _push(context, const PaymentsHubScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.receipt_long_rounded,
            title: 'Fleet Expenses & Receipts',
            subtitle: 'Track fuel bills, tolls, detailing and spare parts',
            color: AppColors.warning,
            onTap: () => _push(context, const ExpensesScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.insights_rounded,
            title: 'Reports & P&L Statement',
            subtitle: 'Revenue, fleet utilization % and net margins',
            color: const Color(0xFF0284C7),
            onTap: () => _push(context, const ReportsScreen()),
          ),
          const SizedBox(height: AppSpacing.xl),

          // 4. GROWTH & TEAM
          _buildCategoryHeader('Growth & Administration'),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.discount_rounded,
            title: 'Marketing & Coupons',
            subtitle: 'Promo codes, seasonal discounts and referral rules',
            color: const Color(0xFFEC4899),
            onTap: () => _push(context, const MarketingScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.admin_panel_settings_rounded,
            title: 'Staff, Roles & Audit Logs',
            subtitle: 'Team permissions, activity timeline and security audit',
            color: const Color(0xFF10B981),
            onTap: () => _push(context, const StaffHubScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.public_rounded,
            title: 'Online Booking Portal',
            subtitle: 'Customer self-service reservation site & showcase',
            color: AppColors.secondary,
            onTap: () => _push(context, const OnlinePortalScreen()),
          ),
          const SizedBox(height: AppSpacing.xl),

          // 5. SYSTEM & APPEARANCE
          _buildCategoryHeader('System & Appearance'),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.settings_rounded,
            title: 'System Settings & Theme',
            subtitle: 'Company profile, branches, rental rules & White Theme',
            color: AppColors.primary,
            onTap: () => _push(context, const SettingsScreen()),
          ),
          const SizedBox(height: AppSpacing.sm),
          _HubNavCard(
            icon: Icons.notifications_none_rounded,
            title: 'Notification Center',
            subtitle: 'View pending alerts, maintenance reminders and updates',
            color: AppColors.warning,
            onTap: () => _push(context, const NotificationsScreen()),
          ),
          const SizedBox(height: AppSpacing.xxl),

          // Sign Out Action
          DestructiveButton(
            label: 'Sign Out of Account',
            icon: Icons.logout_rounded,
            onPressed: () async {
              final confirmed = await ConfirmModalDialog.show(
                context: context,
                title: 'Sign Out',
                message: 'Are you sure you want to end your current session?',
                confirmLabel: 'Sign Out',
                isDestructive: true,
              );
              if (confirmed && context.mounted) {
                await context.read<AuthProvider>().logout();
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
          ),
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }

  void _push(BuildContext context, Widget screen) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
  }

  Widget _buildCategoryHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title.toUpperCase(),
        style: AppTypography.labelSmall.copyWith(
          color: AppColors.primary,
          letterSpacing: 1.1,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _HubNavCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _HubNavCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.lg,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: AppRadius.sm,
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600, color: AppColors.lightText)),
                    Text(
                      subtitle,
                      style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.lightTextMuted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
