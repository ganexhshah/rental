import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/date_formatter.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/data/app_data_display.dart';
import '../../widgets/dialogs/confirm_dialog.dart';
import '../../widgets/inputs/app_inputs.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  final ApiClient _client = ApiClient();
  late TextEditingController _urlController;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: _client.baseUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  void _saveBaseUrl() {
    final url = _urlController.text.trim();
    if (url.isNotEmpty) {
      _client.setBaseUrl(url);
      AppToast.showSuccess(context, 'Base URL updated to: $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser;
    final tenant = auth.currentTenant;

    return AppScaffold(
      appBar: const AppHeader(
        title: 'Staff Profile & Settings',
        subtitle: 'Tenant configuration & active session',
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // Operator Profile Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Row(
                children: [
                  AppAvatar(name: user?.name ?? 'Admin', size: 54),
                  const SizedBox(width: AppSpacing.lg),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.name ?? 'Operator', style: AppTypography.headingMedium),
                        Text(user?.email ?? '', style: AppTypography.bodySmall),
                        const SizedBox(height: AppSpacing.xs),
                        Row(
                          children: [
                            StatusChip(status: user?.role ?? 'admin'),
                            const SizedBox(width: AppSpacing.sm),
                            StatusChip(status: user?.status ?? 'active'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Organization / Tenant Info
          const SectionHeader(title: 'Tenant Organization', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(label: 'Company Name', value: tenant?.name ?? 'Himalayan Rides'),
                  KeyValueRow(label: 'Tenant Slug', value: tenant?.slug ?? 'himalayan-rides'),
                  KeyValueRow(label: 'Default Currency', value: '${tenant?.currency ?? "NPR"} (${tenant?.currencySymbol ?? "Rs."})'),
                  KeyValueRow(label: 'Timezone', value: tenant?.timezone ?? 'Asia/Kathmandu'),
                  KeyValueRow(label: 'Plan Tier', value: (tenant?.plan ?? 'enterprise').toUpperCase()),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // API Server Connection
          const SectionHeader(title: 'Backend API Connection', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppTextField(
                    label: 'Server Endpoint Base URL',
                    controller: _urlController,
                    hint: 'http://localhost:8080/api/v1',
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ElevatedButton(
                    onPressed: _saveBaseUrl,
                    child: const Text('Save & Reconnect Server'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Session & Device Security
          const SectionHeader(title: 'Session & Security', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  KeyValueRow(label: 'Session Status', value: 'Active / Valid JWT Token'),
                  KeyValueRow(label: 'Token Type', value: 'Bearer Token'),
                  KeyValueRow(label: 'Created Timestamp', value: DateFormatter.formatDateTime(user?.createdAt)),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }
}
