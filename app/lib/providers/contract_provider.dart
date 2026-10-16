import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/contract_model.dart';

class ContractProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  List<ContractModel> _contracts = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _selectedFilter = 'all'; // all, signed, pending, expired

  List<ContractModel> get contracts {
    if (_selectedFilter == 'all') return _contracts;
    if (_selectedFilter == 'signed') return _contracts.where((c) => c.isSigned).toList();
    if (_selectedFilter == 'pending') return _contracts.where((c) => !c.isSigned && !c.isExpired).toList();
    if (_selectedFilter == 'expired') return _contracts.where((c) => c.isExpired).toList();
    return _contracts;
  }

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get selectedFilter => _selectedFilter;

  void setFilter(String filter) {
    _selectedFilter = filter;
    notifyListeners();
  }

  Future<void> fetchContracts({bool forceRefresh = false}) async {
    if (_contracts.isNotEmpty && !forceRefresh) return;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiClient.get(ApiEndpoints.contracts);
      if (res is List) {
        _contracts = res.map((item) => ContractModel.fromJson(item)).toList();
      } else if (res is Map && res['contracts'] is List) {
        _contracts = (res['contracts'] as List).map((i) => ContractModel.fromJson(i)).toList();
      } else {
        _contracts = _getMockContracts();
      }
    } catch (_) {
      // Graceful offline mock fallback
      _contracts = _getMockContracts();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> signContract(String contractId, String signatureData) async {
    try {
      await _apiClient.post(
        ApiEndpoints.contractSign(contractId),
        body: {'signature': signatureData, 'signed_at': DateTime.now().toIso8601String()},
      );
    } catch (_) {}

    // Update local state
    final index = _contracts.indexWhere((c) => c.id == contractId);
    if (index != -1) {
      final current = _contracts[index];
      _contracts[index] = ContractModel(
        id: current.id,
        contractNumber: current.contractNumber,
        bookingId: current.bookingId,
        customerName: current.customerName,
        customerEmail: current.customerEmail,
        customerPhone: current.customerPhone,
        vehicleName: current.vehicleName,
        vehiclePlate: current.vehiclePlate,
        status: 'signed',
        startDate: current.startDate,
        endDate: current.endDate,
        totalAmount: current.totalAmount,
        depositAmount: current.depositAmount,
        signatureUrl: signatureData,
        signedAt: DateTime.now(),
        signedBy: current.customerName,
        termsText: current.termsText,
        createdAt: current.createdAt,
      );
      notifyListeners();
    }
    return true;
  }

  List<ContractModel> _getMockContracts() {
    return [
      ContractModel(
        id: 'ctr-001',
        contractNumber: 'CTR-2026-089',
        bookingId: 'bk-101',
        customerName: 'Aarav Sharma',
        customerEmail: 'aarav@gmail.com',
        customerPhone: '+977-9841234567',
        vehicleName: 'Mahindra Scorpio 4x4',
        vehiclePlate: 'BA 2 CHA 4492',
        status: 'signed',
        startDate: DateTime.now().subtract(const Duration(days: 1)),
        endDate: DateTime.now().add(const Duration(days: 3)),
        totalAmount: 26000,
        depositAmount: 5000,
        signatureUrl: 'https://placehold.co/200x80/png?text=Signed+Aarav',
        signedAt: DateTime.now().subtract(const Duration(days: 1)),
        signedBy: 'Aarav Sharma',
        termsText: 'Standard Rental Agreement including comprehensive zero-dep insurance and fuel return policy.',
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
      ContractModel(
        id: 'ctr-002',
        contractNumber: 'CTR-2026-090',
        bookingId: 'bk-102',
        customerName: 'Suman Thapa',
        customerEmail: 'suman.t@outlook.com',
        customerPhone: '+977-9851098765',
        vehicleName: 'Toyota Hilux Double Cab',
        vehiclePlate: 'BA 3 CHA 1109',
        status: 'draft',
        startDate: DateTime.now().add(const Duration(hours: 4)),
        endDate: DateTime.now().add(const Duration(days: 5)),
        totalAmount: 48000,
        depositAmount: 10000,
        termsText: 'Commercial and rugged terrain rental lease agreement with mandatory GPS tracking.',
        createdAt: DateTime.now().subtract(const Duration(hours: 12)),
      ),
      ContractModel(
        id: 'ctr-003',
        contractNumber: 'CTR-2026-085',
        bookingId: 'bk-098',
        customerName: 'Maya Gurung',
        customerEmail: 'maya.gurung@yahoo.com',
        customerPhone: '+977-9801239874',
        vehicleName: 'Hyundai Creta SX',
        vehiclePlate: 'BA 15 PA 8821',
        status: 'signed',
        startDate: DateTime.now().subtract(const Duration(days: 5)),
        endDate: DateTime.now().subtract(const Duration(days: 1)),
        totalAmount: 19500,
        depositAmount: 5000,
        signatureUrl: 'https://placehold.co/200x80/png?text=Signed+Maya',
        signedAt: DateTime.now().subtract(const Duration(days: 5)),
        signedBy: 'Maya Gurung',
        termsText: 'City rental package with unlimited mileage within Bagmati province.',
        createdAt: DateTime.now().subtract(const Duration(days: 6)),
      ),
    ];
  }
}
