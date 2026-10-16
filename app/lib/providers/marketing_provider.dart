import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/marketing_model.dart';

class MarketingProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  List<CouponModel> _coupons = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<CouponModel> get coupons => _coupons;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchCoupons({bool forceRefresh = false}) async {
    if (_coupons.isNotEmpty && !forceRefresh) return;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiClient.get(ApiEndpoints.coupons);
      if (res is List) {
        _coupons = res.map((i) => CouponModel.fromJson(i)).toList();
      } else if (res is Map && res['coupons'] is List) {
        _coupons = (res['coupons'] as List).map((i) => CouponModel.fromJson(i)).toList();
      } else {
        _coupons = _getMockCoupons();
      }
    } catch (_) {
      _coupons = _getMockCoupons();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createCoupon({
    required String code,
    required String description,
    required String discountType,
    required double discountValue,
    required double minRentalDays,
    required DateTime validUntil,
  }) async {
    final coupon = CouponModel(
      id: 'cp-${DateTime.now().millisecondsSinceEpoch}',
      code: code.toUpperCase().trim(),
      description: description,
      discountType: discountType,
      discountValue: discountValue,
      minRentalDays: minRentalDays,
      validFrom: DateTime.now(),
      validUntil: validUntil,
      usageCount: 0,
      isActive: true,
    );

    try {
      await _apiClient.post(ApiEndpoints.coupons, body: coupon.toJson());
    } catch (_) {}

    _coupons.insert(0, coupon);
    notifyListeners();
    return true;
  }

  Future<void> toggleCoupon(String id) async {
    final index = _coupons.indexWhere((c) => c.id == id);
    if (index != -1) {
      final c = _coupons[index];
      _coupons[index] = CouponModel(
        id: c.id,
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minRentalDays: c.minRentalDays,
        minBookingAmount: c.minBookingAmount,
        maxDiscountAmount: c.maxDiscountAmount,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
        usageCount: c.usageCount,
        maxUsage: c.maxUsage,
        isActive: !c.isActive,
      );
      notifyListeners();
    }
  }

  List<CouponModel> _getMockCoupons() {
    return [
      CouponModel(
        id: 'cp-01',
        code: 'HIMALAYA15',
        description: '15% Off on all 4x4 SUV rentals for 3+ days',
        discountType: 'percentage',
        discountValue: 15,
        minRentalDays: 3,
        minBookingAmount: 15000,
        validFrom: DateTime.now().subtract(const Duration(days: 10)),
        validUntil: DateTime.now().add(const Duration(days: 20)),
        usageCount: 18,
        isActive: true,
      ),
      CouponModel(
        id: 'cp-02',
        code: 'DASHIN2026',
        description: 'Rs. 2,000 Flat Festive Discount on weekly bookings',
        discountType: 'fixed_amount',
        discountValue: 2000,
        minRentalDays: 5,
        minBookingAmount: 25000,
        validFrom: DateTime.now().subtract(const Duration(days: 2)),
        validUntil: DateTime.now().add(const Duration(days: 45)),
        usageCount: 7,
        isActive: true,
      ),
      CouponModel(
        id: 'cp-03',
        code: 'FIRSTRENTAL',
        description: '10% Welcome discount for new verified customers',
        discountType: 'percentage',
        discountValue: 10,
        minRentalDays: 1,
        validFrom: DateTime.now().subtract(const Duration(days: 30)),
        validUntil: DateTime.now().add(const Duration(days: 90)),
        usageCount: 42,
        isActive: true,
      ),
    ];
  }
}
