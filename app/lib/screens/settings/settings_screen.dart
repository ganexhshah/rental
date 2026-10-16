import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../providers/settings_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SettingsProvider>().fetchSettings();
    });
  }

  void _editCompanyProfile(SettingsProvider sp) {
    final nameCtrl = TextEditingController(text: sp.settings.companyName);
    final phoneCtrl = TextEditingController(text: sp.settings.phone);
    final emailCtrl = TextEditingController(text: sp.settings.email);
    final addrCtrl = TextEditingController(text: sp.settings.address);
    final panCtrl = TextEditingController(text: sp.settings.panVatNumber);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.lightSurface,
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.topXl),
      builder: (ctx) {
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
                    Text('Edit Company Profile', style: AppTypography.headingMedium),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Company Trading Name')),
                const SizedBox(height: AppSpacing.md),
                TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Official Contact Phone')),
                const SizedBox(height: AppSpacing.md),
                TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'Billing / Contact Email')),
                const SizedBox(height: AppSpacing.md),
                TextField(controller: addrCtrl, decoration: const InputDecoration(labelText: 'Headquarters Address')),
                const SizedBox(height: AppSpacing.md),
                TextField(controller: panCtrl, decoration: const InputDecoration(labelText: 'PAN / VAT Registration Number')),
                const SizedBox(height: AppSpacing.lg),
                ElevatedButton(
                  onPressed: () {
                    sp.updateCompanyInfo(
                      name: nameCtrl.text,
                      phone: phoneCtrl.text,
                      email: emailCtrl.text,
                      address: addrCtrl.text,
                      panVat: panCtrl.text,
                    );
                    Navigator.pop(ctx);
                    AppFeedback.showToast(context, message: 'Company settings saved!', type: ToastType.success);
                  },
                  child: const Text('Update Profile'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _editRentalRules(SettingsProvider sp) {
    String fuel = sp.settings.fuelPolicy;
    final lateFeeCtrl = TextEditingController(text: sp.settings.lateFeePerHour.toStringAsFixed(0));
    final depositCtrl = TextEditingController(text: sp.settings.securityDepositDefault.toStringAsFixed(0));
    final ageCtrl = TextEditingController(text: sp.settings.minDriverAge.toString());

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
                        Text('Edit Rental Rules', style: AppTypography.headingMedium),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    DropdownButtonFormField<String>(
                      value: fuel,
                      decoration: const InputDecoration(labelText: 'Fuel Return Policy'),
                      items: const [
                        DropdownMenuItem(value: 'same_to_same', child: Text('Same-to-Same (Match pickup level)')),
                        DropdownMenuItem(value: 'full_to_full', child: Text('Full-to-Full (Always returned full)')),
                      ],
                      onChanged: (v) => setSheetState(() => fuel = v ?? 'same_to_same'),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: depositCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Default Security Deposit (Rs.)'),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: lateFeeCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Late Return Fee Per Hour (Rs.)'),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: ageCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Minimum Driver Age Requirement'),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    ElevatedButton(
                      onPressed: () {
                        sp.updateRentalRules(
                          fuelPolicy: fuel,
                          lateFee: double.tryParse(lateFeeCtrl.text) ?? 250,
                          deposit: double.tryParse(depositCtrl.text) ?? 5000,
                          minAge: int.tryParse(ageCtrl.text) ?? 21,
                          requireKyc: sp.settings.requireKycBeforePickup,
                          onlineBooking: sp.settings.enableOnlineBooking,
                        );
                        Navigator.pop(ctx);
                        AppFeedback.showToast(context, message: 'Rental rules updated!', type: ToastType.success);
                      },
                      child: const Text('Save Rules'),
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
    final sp = context.watch<SettingsProvider>();
    final themeProv = context.watch<ThemeProvider>();
    final isDark = themeProv.isDarkMode;

    return AppScaffold(
      body: Column(
        children: [
          const AppHeader(
            title: 'System Settings',
            subtitle: 'Company profile, branches, rental rules & app theme',
            showBackButton: true,
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Theme Switcher Card (Highlighted)
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: AppColors.lightCard,
                      borderRadius: AppRadius.lg,
                      border: Border.all(color: AppColors.primary.withOpacity(0.4)),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.06),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.primaryContainer,
                            borderRadius: AppRadius.md,
                          ),
                          child: Icon(
                            isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                            color: AppColors.primaryDark,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isDark ? 'Dark Theme Active' : 'White Theme Active',
                                style: AppTypography.labelLarge.copyWith(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                isDark ? 'Switch to clean, modern White Theme' : 'Clean, high-contrast white aesthetic',
                                style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary),
                              ),
                            ],
                          ),
                        ),
                        Switch.adaptive(
                          value: !isDark, // True = White Theme
                          activeColor: AppColors.primary,
                          onChanged: (isWhite) {
                            themeProv.toggleTheme(!isWhite);
                            AppFeedback.showToast(
                              context,
                              message: isWhite ? 'Switched to White Theme' : 'Switched to Dark Theme',
                              type: ToastType.success,
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Company Profile Section
                  _buildSectionHeader('Company Profile', onEdit: () => _editCompanyProfile(sp)),
                  const SizedBox(height: AppSpacing.sm),
                  _buildSettingCard([
                    _buildRow('Company Name', sp.settings.companyName),
                    _buildRow('PAN / VAT', sp.settings.panVatNumber),
                    _buildRow('Official Phone', sp.settings.phone),
                    _buildRow('Official Email', sp.settings.email),
                    _buildRow('Head Office', sp.settings.address),
                  ]),
                  const SizedBox(height: AppSpacing.xl),

                  // Rental Rules Section
                  _buildSectionHeader('Rental Rules & Policy', onEdit: () => _editRentalRules(sp)),
                  const SizedBox(height: AppSpacing.sm),
                  _buildSettingCard([
                    _buildRow('Fuel Policy', sp.settings.fuelPolicy == 'same_to_same' ? 'Same-to-Same' : 'Full-to-Full'),
                    _buildRow('Default Deposit', 'Rs. ${sp.settings.securityDepositDefault.toStringAsFixed(0)}'),
                    _buildRow('Late Return Fee', 'Rs. ${sp.settings.lateFeePerHour.toStringAsFixed(0)} / hr'),
                    _buildRow('Minimum Driver Age', '${sp.settings.minDriverAge} Years'),
                    _buildRow('Mandatory KYC', sp.settings.requireKycBeforePickup ? 'Enforced' : 'Optional'),
                  ]),
                  const SizedBox(height: AppSpacing.xl),

                  // Branch Locations
                  _buildSectionHeader('Branches & Hubs'),
                  const SizedBox(height: AppSpacing.sm),
                  ...sp.locations.map((loc) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.lightCard,
                        borderRadius: AppRadius.md,
                        border: Border.all(color: AppColors.lightBorder),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            loc.isAirportHub ? Icons.flight_takeoff_rounded : Icons.store_rounded,
                            color: AppColors.primary,
                            size: 20,
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(loc.name, style: AppTypography.labelLarge),
                                Text(loc.address, style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary)),
                              ],
                            ),
                          ),
                          Text(
                            '${loc.activeVehicles} cars',
                            style: AppTypography.labelSmall.copyWith(color: AppColors.primaryDark, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: AppSpacing.xl),

                  // Payment Gateways
                  _buildSectionHeader('Payment Gateway Integrations'),
                  const SizedBox(height: AppSpacing.sm),
                  _buildSettingCard([
                    _buildGatewayRow('eSewa Mobile Wallet', 'Connected', true),
                    _buildGatewayRow('Khalti Digital Wallet', 'Connected', true),
                    _buildGatewayRow('Stripe International Cards', 'Connected (USD/EUR)', true),
                    _buildGatewayRow('Cash on Pickup / POS', 'Active', true),
                  ]),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, {VoidCallback? onEdit}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: AppTypography.headingMedium),
        if (onEdit != null)
          TextButton.icon(
            onPressed: onEdit,
            icon: const Icon(Icons.edit_rounded, size: 15),
            label: const Text('Edit'),
            style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
          ),
      ],
    );
  }

  Widget _buildSettingCard(List<Widget> rows) {
    return Container(
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
      child: Column(children: rows),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.bodySmall.copyWith(color: AppColors.lightTextMuted)),
          Text(value, style: AppTypography.labelMedium.copyWith(color: AppColors.lightText, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildGatewayRow(String name, String status, bool enabled) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle_rounded, size: 16, color: AppColors.success),
              const SizedBox(width: 8),
              Text(name, style: AppTypography.bodyMedium),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: AppColors.successBg, borderRadius: AppRadius.xs),
            child: Text(
              status,
              style: AppTypography.labelSmall.copyWith(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 10),
            ),
          ),
        ],
      ),
    );
  }
}
