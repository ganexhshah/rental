import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/validators.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/dialogs/confirm_dialog.dart';
import '../../widgets/inputs/app_inputs.dart';
import '../home/main_navigation_shell.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'admin@himalayanrides.com');
  final _passwordController = TextEditingController(text: 'Password123!');
  final _slugController = TextEditingController(text: 'himalayan-rides');
  bool _rememberMe = true;
  bool _isPasswordVisible = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _slugController.dispose();
    super.dispose();
  }

  void _selectDemoAccount(String email, String role) {
    setState(() {
      _emailController.text = email;
      _passwordController.text = 'Password123!';
    });
    AppToast.showInfo(context, 'Selected $role account ($email)');
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final success = await auth.login(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      companySlug: _slugController.text.trim(),
    );

    if (!mounted) return;

    if (success) {
      AppToast.showSuccess(context, 'Welcome back, ${auth.currentUser?.name}!');
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNavigationShell()),
      );
    } else {
      AppToast.showError(context, auth.errorMessage ?? 'Authentication failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.xxl),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Icon & Brand
                  Center(
                    child: Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: AppRadius.lg,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.35),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.directions_car_filled_rounded,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    AppConstants.appName,
                    textAlign: TextAlign.center,
                    style: AppTypography.displayMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.lightText,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Operational Rental Client • Mobile Edition',
                    textAlign: TextAlign.center,
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.lightTextMuted,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  // Demo Quick-Fill Chips
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: AppRadius.md,
                      border: Border.all(
                        color: AppColors.lightBorder,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.flash_on_rounded, size: 14, color: AppColors.warning),
                            const SizedBox(width: 4),
                            Text(
                              'QUICK DEMO ROLES (TAP TO SWITCH)',
                              style: AppTypography.labelSmall.copyWith(
                                fontSize: 10,
                                color: AppColors.lightTextMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Wrap(
                          spacing: AppSpacing.sm,
                          runSpacing: AppSpacing.xs,
                          children: [
                            ActionChip(
                              avatar: const Icon(Icons.shield_rounded, size: 14),
                              label: const Text('Admin'),
                              onPressed: () => _selectDemoAccount(
                                'admin@himalayanrides.com',
                                'Admin',
                              ),
                            ),
                            ActionChip(
                              avatar: const Icon(Icons.manage_accounts_rounded, size: 14),
                              label: const Text('Manager'),
                              onPressed: () => _selectDemoAccount(
                                'manager.test@himalayanrides.com',
                                'Manager (Bikash)',
                              ),
                            ),
                            ActionChip(
                              avatar: const Icon(Icons.badge_rounded, size: 14),
                              label: const Text('Staff'),
                              onPressed: () => _selectDemoAccount(
                                'staff@himalayanrides.com',
                                'Staff (Sunil)',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Error notification if present
                  if (auth.errorMessage != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.errorBg,
                        borderRadius: AppRadius.md,
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              auth.errorMessage!,
                              style: AppTypography.bodySmall.copyWith(color: AppColors.error),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Email input
                  AppTextField(
                    label: 'Email Address',
                    hint: 'operator@himalayanrides.com',
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    prefixIcon: const Icon(Icons.alternate_email_rounded, size: 20),
                    validator: Validators.email,
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Password input
                  AppTextField(
                    label: 'Password',
                    hint: '••••••••••••',
                    controller: _passwordController,
                    obscureText: !_isPasswordVisible,
                    prefixIcon: const Icon(Icons.lock_rounded, size: 20),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _isPasswordVisible
                            ? Icons.visibility_off_rounded
                            : Icons.visibility_rounded,
                        size: 20,
                      ),
                      onPressed: () => setState(() => _isPasswordVisible = !_isPasswordVisible),
                    ),
                    validator: Validators.password,
                  ),
                  const SizedBox(height: AppSpacing.sm),

                  // Remember me & Forgot Password
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Checkbox(
                            value: _rememberMe,
                            activeColor: AppColors.primary,
                            onChanged: (v) => setState(() => _rememberMe = v ?? true),
                          ),
                          Text('Remember me', style: AppTypography.bodySmall),
                        ],
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                          );
                        },
                        child: Text(
                          'Forgot Password?',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.primaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Sign In Button
                  PrimaryButton(
                    label: 'Sign In to Operations',
                    icon: Icons.login_rounded,
                    isLoading: auth.status == AuthStatus.authenticating,
                    onPressed: _handleLogin,
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Server config info footer
                  Center(
                    child: Text(
                      'Connected to: http://localhost:8080/api/v1',
                      style: AppTypography.labelSmall.copyWith(
                        color: AppColors.lightTextMuted,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
