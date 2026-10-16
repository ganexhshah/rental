import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/staff_model.dart';

class StaffProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  List<StaffMemberModel> _staff = [];
  List<AuditLogModel> _auditLogs = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<StaffMemberModel> get staff => _staff;
  List<AuditLogModel> get auditLogs => _auditLogs;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchStaff({bool forceRefresh = false}) async {
    if (_staff.isNotEmpty && !forceRefresh) return;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiClient.get(ApiEndpoints.users);
      if (res is List) {
        _staff = res.map((i) => StaffMemberModel.fromJson(i)).toList();
      } else if (res is Map && res['users'] is List) {
        _staff = (res['users'] as List).map((i) => StaffMemberModel.fromJson(i)).toList();
      } else {
        _staff = _getMockStaff();
      }
    } catch (_) {
      _staff = _getMockStaff();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchAuditLogs({bool forceRefresh = false}) async {
    if (_auditLogs.isNotEmpty && !forceRefresh) return;

    try {
      final res = await _apiClient.get(ApiEndpoints.auditLogs);
      if (res is List) {
        _auditLogs = res.map((i) => AuditLogModel.fromJson(i)).toList();
      } else {
        _auditLogs = _getMockLogs();
      }
    } catch (_) {
      _auditLogs = _getMockLogs();
    }
    notifyListeners();
  }

  Future<bool> inviteStaff({
    required String fullName,
    required String email,
    required String phone,
    required String role,
  }) async {
    final member = StaffMemberModel(
      id: 'usr-${DateTime.now().millisecondsSinceEpoch}',
      fullName: fullName,
      email: email,
      phone: phone,
      role: role,
      status: 'active',
      createdAt: DateTime.now(),
    );

    try {
      await _apiClient.post(ApiEndpoints.users, body: member.toJson());
    } catch (_) {}

    _staff.insert(0, member);
    notifyListeners();
    return true;
  }

  List<StaffMemberModel> _getMockStaff() {
    return [
      StaffMemberModel(
        id: 'usr-01',
        fullName: 'Bikash Adhikari',
        email: 'admin@himalayanrides.com',
        phone: '+977-9851122334',
        role: 'Admin',
        status: 'active',
        lastLogin: DateTime.now().subtract(const Duration(minutes: 15)),
        createdAt: DateTime.now().subtract(const Duration(days: 120)),
      ),
      StaffMemberModel(
        id: 'usr-02',
        fullName: 'Prashant Khadka',
        email: 'fleet@himalayanrides.com',
        phone: '+977-9841998877',
        role: 'Fleet Manager',
        status: 'active',
        lastLogin: DateTime.now().subtract(const Duration(hours: 2)),
        createdAt: DateTime.now().subtract(const Duration(days: 90)),
      ),
      StaffMemberModel(
        id: 'usr-03',
        fullName: 'Sunita Maharjan',
        email: 'counter@himalayanrides.com',
        phone: '+977-9860114455',
        role: 'Counter Staff',
        status: 'active',
        lastLogin: DateTime.now().subtract(const Duration(hours: 1)),
        createdAt: DateTime.now().subtract(const Duration(days: 60)),
      ),
    ];
  }

  List<AuditLogModel> _getMockLogs() {
    return [
      AuditLogModel(
        id: 'log-1',
        userId: 'usr-01',
        userName: 'Bikash Adhikari',
        action: 'CONFIRM_BOOKING',
        resourceType: 'Booking',
        resourceId: 'bk-102',
        description: 'Confirmed booking BK-102 for Toyota Hilux',
        timestamp: DateTime.now().subtract(const Duration(minutes: 35)),
      ),
      AuditLogModel(
        id: 'log-2',
        userId: 'usr-03',
        userName: 'Sunita Maharjan',
        action: 'PICKUP_COMPLETED',
        resourceType: 'Pickup',
        resourceId: 'pk-4492',
        description: 'Dispatched Mahindra Scorpio BA 2 CHA 4492 to Aarav Sharma',
        timestamp: DateTime.now().subtract(const Duration(hours: 3)),
      ),
      AuditLogModel(
        id: 'log-3',
        userId: 'usr-02',
        userName: 'Prashant Khadka',
        action: 'UPDATE_ODOMETER',
        resourceType: 'Vehicle',
        resourceId: 'veh-01',
        description: 'Logged return inspection odometer 34,250 km',
        timestamp: DateTime.now().subtract(const Duration(hours: 6)),
      ),
    ];
  }
}
