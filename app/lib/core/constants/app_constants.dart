import 'package:flutter/foundation.dart';

class AppConstants {
  static const String appName = 'Himalayan Rides';
  static const String appSubtitle = 'Fleet & Rental Operations';
  static const String appVersion = '1.0.0';

  // Default Tenant & Currency Configuration
  static const String defaultTenantId = '78248f8f-e390-4f85-a03f-58e4974fa366';
  static const String defaultTenantSlug = 'himalayan-rides';
  static const String defaultTenantName = 'Himalayan Rides Nepal';
  static const String defaultCurrency = 'NPR';
  static const String defaultCurrencySymbol = 'Rs.';
  static const String defaultTimezone = 'Asia/Kathmandu';

  // Base API URL (defaults to localhost:8080 for web, windows, and android with adb reverse)
  static String get defaultBaseUrl => 'http://localhost:8080/api/v1';


  // Storage Keys
  static const String keyAuthToken = 'rental_auth_token';
  static const String keyRefreshToken = 'rental_refresh_token';
  static const String keyUserData = 'rental_user_data';
  static const String keyTenantData = 'rental_tenant_data';
  static const String keyBaseUrl = 'rental_custom_base_url';
  static const String keyThemeMode = 'rental_theme_mode';
}
