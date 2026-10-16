import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../core/constants/app_constants.dart';
import '../models/auth_model.dart';

class AuthRepository {
  final ApiClient _client = ApiClient();

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? companySlug,
  }) async {
    final response = await _client.post(
      ApiEndpoints.login,
      body: {
        'email': email.trim(),
        'password': password,
        'company_slug': companySlug ?? AppConstants.defaultTenantSlug,
      },
    );

    final user = User.fromJson(response['user']);
    final tenant = Tenant.fromJson(response['tenant']);
    final tokens = TokenPair.fromJson(response['tokens']);

    _client.setAuth(
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tenantId: tenant.id,
    );

    // Cache user & tenant locally
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.keyUserData, jsonEncode(user.toJson()));
    await prefs.setString(AppConstants.keyTenantData, jsonEncode(tenant.toJson()));

    return {
      'user': user,
      'tenant': tenant,
      'tokens': tokens,
    };
  }

  Future<void> logout() async {
    try {
      await _client.post(ApiEndpoints.logout);
    } catch (_) {}
    _client.clearAuth();
  }

  Future<User?> getCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString(AppConstants.keyUserData);
    if (userStr != null) {
      try {
        return User.fromJson(jsonDecode(userStr));
      } catch (_) {}
    }
    return null;
  }

  Future<Tenant?> getCachedTenant() async {
    final prefs = await SharedPreferences.getInstance();
    final tenantStr = prefs.getString(AppConstants.keyTenantData);
    if (tenantStr != null) {
      try {
        return Tenant.fromJson(jsonDecode(tenantStr));
      } catch (_) {}
    }
    return null;
  }
}
