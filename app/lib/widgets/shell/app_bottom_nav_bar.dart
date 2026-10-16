import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Navigation item model for [AppBottomNavBar]
class AppBottomNavItem {
  final IconData unselectedIcon;
  final IconData selectedIcon;
  final String label;

  const AppBottomNavItem({
    required this.unselectedIcon,
    required this.selectedIcon,
    required this.label,
  });
}

/// A sleek, modern bottom navigation bar matching our theme
/// Features:
/// - Crisp white background with subtle top divider
/// - Outlined icons for inactive states with muted grey typography
/// - Solid filled icons for active states with brand primary color
/// - Zero bulky background pills or shadows
/// - Compact 58px bar height with safe area adaptation
class AppBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onItemSelected;
  final List<AppBottomNavItem> items;

  const AppBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onItemSelected,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final backgroundColor = isDark ? AppColors.darkSurface : Colors.white;
    final selectedColor = isDark ? AppColors.primaryLight : AppColors.primary;
    final unselectedColor = isDark ? AppColors.darkTextMuted : const Color(0xFF94A3B8);

    return Container(
      decoration: BoxDecoration(
        color: backgroundColor,
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 66.0,
          child: Row(
            children: List.generate(items.length, (index) {
              final item = items[index];
              final isSelected = index == currentIndex;
              final currentColor = isSelected ? selectedColor : unselectedColor;

              return Expanded(
                child: InkResponse(
                  onTap: () => onItemSelected(index),
                  containedInkWell: true,
                  highlightColor: Colors.transparent,
                  splashColor: selectedColor.withOpacity(0.08),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isSelected ? item.selectedIcon : item.unselectedIcon,
                          size: 26.5,
                          color: currentColor,
                        ),
                        const SizedBox(height: 4.0),
                        Text(
                          item.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            color: currentColor,
                            letterSpacing: -0.1,
                            height: 1.1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

