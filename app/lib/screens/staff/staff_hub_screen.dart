import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../models/staff_model.dart';
import '../../providers/staff_provider.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class StaffHubScreen extends StatefulWidget {
  const StaffHubScreen({super.key});

  @override
  State<StaffHubScreen> createState() => _StaffHubScreenState();
}

class _StaffHubScreenState extends State<StaffHubScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final sp = context.read<StaffProvider>();
      sp.fetchStaff();
      sp.fetchAuditLogs();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showInviteStaffSheet() {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String role = 'Counter Staff';

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
                        Text('Add Team Member', style: AppTypography.headingMedium),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Full Name',
                        prefixIcon: Icon(Icons.person_rounded),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email Address',
                        prefixIcon: Icon(Icons.email_rounded),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    TextField(
                      controller: phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number',
                        prefixIcon: Icon(Icons.phone_rounded),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    DropdownButtonFormField<String>(
                      value: role,
                      decoration: const InputDecoration(labelText: 'Assigned Role'),
                      items: const [
                        DropdownMenuItem(value: 'Admin', child: Text('Admin (Full Access)')),
                        DropdownMenuItem(value: 'Fleet Manager', child: Text('Fleet Manager (Vehicles & Maintenance)')),
                        DropdownMenuItem(value: 'Counter Staff', child: Text('Counter Staff (Pickups & Returns)')),
                        DropdownMenuItem(value: 'Accountant', child: Text('Accountant (Finances & Invoices)')),
                      ],
                      onChanged: (v) => setSheetState(() => role = v ?? 'Counter Staff'),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    ElevatedButton(
                      onPressed: () async {
                        if (nameCtrl.text.isEmpty || emailCtrl.text.isEmpty) {
                          AppFeedback.showToast(
                            context,
                            message: 'Please provide full name and email',
                            type: ToastType.error,
                          );
                          return;
                        }
                        Navigator.pop(ctx);
                        await context.read<StaffProvider>().inviteStaff(
                              fullName: nameCtrl.text,
                              email: emailCtrl.text,
                              phone: phoneCtrl.text,
                              role: role,
                            );
                        if (mounted) {
                          AppFeedback.showToast(
                            context,
                            message: 'Invitation sent to ${nameCtrl.text}!',
                            type: ToastType.success,
                          );
                        }
                      },
                      child: const Text('Send Team Invite'),
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
    final staffProv = context.watch<StaffProvider>();

    return AppScaffold(
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_staff_hub',
        onPressed: _showInviteStaffSheet,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.person_add_rounded, color: Colors.white),
        label: const Text('Add Member', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          AppHeader(
            title: 'Staff & Security',
            subtitle: 'Team members, roles & audit activity logs',
            showBackButton: true,
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: () {
                  staffProv.fetchStaff(forceRefresh: true);
                  staffProv.fetchAuditLogs(forceRefresh: true);
                },
              ),
            ],
          ),

          // Tab Bar
          Container(
            color: AppColors.lightSurface,
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primaryDark,
              unselectedLabelColor: AppColors.lightTextMuted,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelStyle: AppTypography.labelMedium.copyWith(fontWeight: FontWeight.bold),
              tabs: [
                Tab(text: 'Members (${staffProv.staff.length})'),
                const Tab(text: 'Roles & Access'),
                Tab(text: 'Audit Logs (${staffProv.auditLogs.length})'),
              ],
            ),
          ),

          Expanded(
            child: staffProv.isLoading
                ? AppFeedback.loading(message: 'Loading staff directory...')
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildMembersTab(staffProv),
                      _buildRolesTab(),
                      _buildAuditLogsTab(staffProv),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildMembersTab(StaffProvider sp) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: sp.staff.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final member = sp.staff[index];
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
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.primaryContainer,
                child: Text(
                  member.fullName.substring(0, 1).toUpperCase(),
                  style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.bold, fontSize: 18),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(member.fullName, style: AppTypography.labelLarge),
                    const SizedBox(height: 2),
                    Text(member.email, style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.lightBorderLight,
                        borderRadius: AppRadius.xs,
                      ),
                      child: Text(
                        member.role.toUpperCase(),
                        style: AppTypography.labelSmall.copyWith(
                          color: AppColors.primaryDark,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.more_vert_rounded, color: AppColors.lightTextMuted),
                onPressed: () {
                  AppFeedback.showToast(
                    context,
                    message: 'Managing permissions for ${member.fullName}',
                    type: ToastType.info,
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRolesTab() {
    final roles = [
      {'name': 'Admin', 'desc': 'Complete access to financial reports, settings, staff and API keys', 'badge': 'FULL ACCESS'},
      {'name': 'Fleet Manager', 'desc': 'Manage vehicles, maintenance tasks, inspections and vendors', 'badge': 'FLEET'},
      {'name': 'Counter Staff', 'desc': 'Booking verification, pickup & return checklists, customer KYC', 'badge': 'OPERATIONS'},
      {'name': 'Accountant', 'desc': 'Invoices, payments, security deposit refunds and expense logs', 'badge': 'FINANCE'},
    ];

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: roles.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final r = roles[index];
        return Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.lightCard,
            borderRadius: AppRadius.lg,
            border: Border.all(color: AppColors.lightBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(r['name']!, style: AppTypography.headingSmall),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: AppRadius.xs,
                    ),
                    child: Text(
                      r['badge']!,
                      style: AppTypography.labelSmall.copyWith(color: AppColors.primaryDark, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                r['desc']!,
                style: AppTypography.bodySmall.copyWith(color: AppColors.lightTextSecondary),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAuditLogsTab(StaffProvider sp) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: sp.auditLogs.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final log = sp.auditLogs[index];
        return Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.lightCard,
            borderRadius: AppRadius.md,
            border: Border.all(color: AppColors.lightBorder),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 2),
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.lightBorderLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.shield_rounded, size: 16, color: AppColors.primary),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(log.userName, style: AppTypography.labelLarge),
                        Text(
                          log.timestamp.toString().substring(11, 16),
                          style: AppTypography.caption.copyWith(color: AppColors.lightTextMuted),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(log.description, style: AppTypography.bodySmall.copyWith(color: AppColors.lightTextSecondary)),
                    const SizedBox(height: 4),
                    Text(
                      'Action: ${log.action} • Resource: ${log.resourceType}',
                      style: AppTypography.caption.copyWith(color: AppColors.primary, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
