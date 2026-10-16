import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';

class AppScaffold extends StatelessWidget {
  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? bottomNavigationBar;
  final Widget? bottomSheet;
  final Widget? floatingActionButton;
  final Widget? stickyBottomAction;
  final bool isOffline;
  final VoidCallback? onRetryOffline;
  final EdgeInsetsGeometry? padding;
  final bool resizeToAvoidBottomInset;

  const AppScaffold({
    super.key,
    this.appBar,
    required this.body,
    this.bottomNavigationBar,
    this.bottomSheet,
    this.floatingActionButton,
    this.stickyBottomAction,
    this.isOffline = false,
    this.onRetryOffline,
    this.padding,
    this.resizeToAvoidBottomInset = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: appBar,
      bottomNavigationBar: bottomNavigationBar,
      bottomSheet: bottomSheet,
      floatingActionButton: floatingActionButton,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      body: SafeArea(
        top: appBar == null,
        bottom: stickyBottomAction == null && bottomNavigationBar == null,
        child: Column(
          children: [
            // Offline banner if disconnected
            if (isOffline)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.sm,
                ),
                color: AppColors.warning,
                child: Row(
                  children: [
                    const Icon(Icons.wifi_off_rounded, size: 18, color: Colors.black87),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        'Offline Mode — cached data displayed. Live actions queued.',
                        style: AppTypography.labelSmall.copyWith(color: Colors.black87),
                      ),
                    ),
                    if (onRetryOffline != null)
                      TextButton(
                        onPressed: onRetryOffline,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                          minimumSize: const Size(40, 28),
                          foregroundColor: Colors.black,
                        ),
                        child: const Text('RETRY', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
              ),

            // Main body area
            Expanded(
              child: padding != null
                  ? Padding(padding: padding!, child: body)
                  : body,
            ),

            // Sticky Bottom Action bar (for primary workflows like Pickup, Return, Submit)
            if (stickyBottomAction != null)
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                  border: Border(
                    top: BorderSide(
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      offset: const Offset(0, -2),
                      blurRadius: 10,
                    ),
                  ],
                ),
                child: stickyBottomAction!,
              ),
          ],
        ),
      ),
    );
  }
}
