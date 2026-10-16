import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/validators.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/dialogs/confirm_dialog.dart';
import '../../widgets/inputs/app_inputs.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _submitted = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    final email = _emailController.text.trim();
    if (Validators.email(email) != null) {
      AppToast.showError(context, 'Please enter a valid email address');
      return;
    }
    setState(() => _submitted = true);
    AppToast.showSuccess(context, 'Reset instructions dispatched to $email');
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: const AppHeader(title: 'Reset Password'),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.lock_reset_rounded, size: 56, color: AppColors.primary),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Forgot your password?',
              style: AppTypography.headingMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Enter your registered email address and we will send password recovery instructions.',
              style: AppTypography.bodyMedium.copyWith(color: AppColors.darkTextMuted),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xxl),
            if (!_submitted) ...[
              AppTextField(
                label: 'Email Address',
                hint: 'user@company.com',
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                prefixIcon: const Icon(Icons.alternate_email_rounded, size: 20),
              ),
              const SizedBox(height: AppSpacing.xl),
              PrimaryButton(
                label: 'Send Recovery Email',
                onPressed: _handleSubmit,
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.successBg,
                  borderRadius: AppRadius.md,
                ),
                child: Column(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 36),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Recovery Email Sent',
                      style: AppTypography.headingSmall.copyWith(color: AppColors.success),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Please check your inbox or contact your organization admin.',
                      textAlign: TextAlign.center,
                      style: AppTypography.bodySmall.copyWith(color: Colors.black87),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              SecondaryButton(
                label: 'Back to Login',
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
