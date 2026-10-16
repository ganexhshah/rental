import 'package:flutter/material.dart';

/// Semantic colors and curated palette for Himalayan Rides Vehicle Rental SaaS
/// Designed with a crisp, modern White Theme as primary default
class AppColors {
  // Brand Primary (Automotive Teal / Emerald)
  static const Color primary = Color(0xFF0D9488); // Teal 600
  static const Color primaryDark = Color(0xFF0F766E); // Teal 700
  static const Color primaryLight = Color(0xFF14B8A6); // Teal 500
  static const Color primaryContainer = Color(0xFFCCFBF1); // Teal 100
  static const Color onPrimary = Colors.white;

  // Secondary & Accents
  static const Color secondary = Color(0xFF2563EB); // Blue 600
  static const Color secondaryDark = Color(0xFF1D4ED8);
  static const Color secondaryLight = Color(0xFF3B82F6);
  static const Color secondaryContainer = Color(0xFFDBEAFE);

  // Semantic Status Colors (High contrast, accessible, clear)
  static const Color success = Color(0xFF10B981); // Emerald 500
  static const Color successBg = Color(0xFFD1FAE5); // Emerald 100
  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color warningBg = Color(0xFFFEF3C7); // Amber 100
  static const Color error = Color(0xFFEF4444); // Red 500
  static const Color errorBg = Color(0xFFFEE2E2); // Red 100
  static const Color info = Color(0xFF0284C7); // Sky 600
  static const Color infoBg = Color(0xFFE0F2FE); // Sky 100

  // Neutral Palette - Light Mode (Default White Theme)
  static const Color lightCanvas = Color(0xFFFFFFFF); // Pure White
  static const Color lightSurface = Color(0xFFFFFFFF); // Pure White
  static const Color lightCard = Color(0xFFFFFFFF); // Pure White
  static const Color lightBorder = Color(0xFFE2E8F0); // Slate 200
  static const Color lightBorderLight = Color(0xFFF1F5F9); // Slate 100
  static const Color lightText = Color(0xFF0F172A); // Slate 900
  static const Color lightTextSecondary = Color(0xFF475569); // Slate 600
  static const Color lightTextMuted = Color(0xFF94A3B8); // Slate 400

  // Neutral Palette - Dark Mode (Fallback / Toggle)
  static const Color darkCanvas = Color(0xFFFFFFFF); // Keep white as requested
  static const Color darkSurface = Color(0xFFFFFFFF);
  static const Color darkCard = Color(0xFFFFFFFF);
  static const Color darkBorder = Color(0xFFE2E8F0);
  static const Color darkBorderLight = Color(0xFFF1F5F9);
  static const Color darkText = Color(0xFF0F172A);
  static const Color darkTextSecondary = Color(0xFF475569);
  static const Color darkTextMuted = Color(0xFF94A3B8);

  // Context-aware color helpers (pure clean white background)
  static Color canvas(BuildContext context) => Colors.white;
  static Color surface(BuildContext context) => Colors.white;
  static Color card(BuildContext context) => Colors.white;

  static Color border(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? darkBorder : lightBorder;

  static Color borderLight(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? darkBorderLight : lightBorderLight;

  static Color text(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? darkText : lightText;

  static Color textSecondary(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? darkTextSecondary : lightTextSecondary;

  static Color textMuted(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? darkTextMuted : lightTextMuted;

  // Status mapping
  static Color statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'active':
      case 'completed':
      case 'verified':
      case 'valid':
      case 'paid':
      case 'held':
      case 'approved':
      case 'signed':
        return success;
      case 'pending':
      case 'pending_verification':
      case 'pending_payment':
      case 'pickup_scheduled':
      case 'pickup_in_progress':
      case 'return_in_progress':
      case 'expiring_soon':
      case 'partially_paid':
      case 'maintenance':
      case 'reserved':
      case 'draft':
      case 'in_progress':
      case 'scheduled':
        return warning;
      case 'cancelled':
      case 'no_show':
      case 'expired':
      case 'rejected':
      case 'overdue':
      case 'suspended':
      case 'blacklisted':
      case 'failed':
      case 'unpaid':
        return error;
      default:
        return primary;
    }
  }

  static Color statusBgColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'active':
      case 'completed':
      case 'verified':
      case 'valid':
      case 'paid':
      case 'held':
      case 'approved':
      case 'signed':
        return successBg;
      case 'pending':
      case 'pending_verification':
      case 'pending_payment':
      case 'pickup_scheduled':
      case 'pickup_in_progress':
      case 'return_in_progress':
      case 'expiring_soon':
      case 'partially_paid':
      case 'maintenance':
      case 'reserved':
      case 'draft':
      case 'in_progress':
      case 'scheduled':
        return warningBg;
      case 'cancelled':
      case 'no_show':
      case 'expired':
      case 'rejected':
      case 'overdue':
      case 'suspended':
      case 'blacklisted':
      case 'failed':
      case 'unpaid':
        return errorBg;
      default:
        return primaryContainer;
    }
  }
}
