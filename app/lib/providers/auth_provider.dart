import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../models/auth_model.dart';
import '../repositories/auth_repository.dart';

enum AuthStatus { initial, authenticated, unauthenticated, authenticating, sessionExpired }

class AuthProvider extends ChangeNotifier {
  final AuthRepository _repo = AuthRepository();
  final ApiClient _client = ApiClient();

  AuthStatus _status = AuthStatus.initial;
  User? _currentUser;
  Tenant? _currentTenant;
  String? _errorMessage;

  AuthStatus get status => _status;
  bool get isAuthenticated => _status == AuthStatus.authenticated && _currentUser != null;
  User? get currentUser => _currentUser;
  Tenant? get currentTenant => _currentTenant;
  String? get errorMessage => _errorMessage;

  AuthProvider() {
    _client.onSessionExpired = () {
      _status = AuthStatus.sessionExpired;
      notifyListeners();
    };
  }

  Future<void> init() async {
    await _client.init();
    final cachedUser = await _repo.getCachedUser();
    final cachedTenant = await _repo.getCachedTenant();

    if (_client.isAuthenticated && cachedUser != null) {
      _currentUser = cachedUser;
      _currentTenant = cachedTenant;
      _status = AuthStatus.authenticated;
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login({
    required String email,
    required String password,
    String? companySlug,
  }) async {
    _status = AuthStatus.authenticating;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _repo.login(
        email: email,
        password: password,
        companySlug: companySlug,
      );

      _currentUser = res['user'] as User;
      _currentTenant = res['tenant'] as Tenant;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    _currentUser = null;
    _currentTenant = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void clearSessionExpired() {
    _status = AuthStatus.unauthenticated;
    _client.clearAuth();
    _currentUser = null;
    notifyListeners();
  }
}
