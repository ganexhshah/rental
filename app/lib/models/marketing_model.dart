class CouponModel {
  final String id;
  final String code;
  final String description;
  final String discountType; // percentage, fixed_amount
  final double discountValue;
  final double minRentalDays;
  final double minBookingAmount;
  final double? maxDiscountAmount;
  final DateTime validFrom;
  final DateTime validUntil;
  final int usageCount;
  final int? maxUsage;
  final bool isActive;

  CouponModel({
    required this.id,
    required this.code,
    required this.description,
    required this.discountType,
    required this.discountValue,
    this.minRentalDays = 1,
    this.minBookingAmount = 0,
    this.maxDiscountAmount,
    required this.validFrom,
    required this.validUntil,
    this.usageCount = 0,
    this.maxUsage,
    this.isActive = true,
  });

  factory CouponModel.fromJson(Map<String, dynamic> json) {
    return CouponModel(
      id: json['id']?.toString() ?? '',
      code: json['code'] ?? '',
      description: json['description'] ?? '',
      discountType: json['discount_type'] ?? 'percentage',
      discountValue: (json['discount_value'] ?? 0).toDouble(),
      minRentalDays: (json['min_rental_days'] ?? 1).toDouble(),
      minBookingAmount: (json['min_booking_amount'] ?? 0).toDouble(),
      maxDiscountAmount: json['max_discount_amount'] != null
          ? (json['max_discount_amount']).toDouble()
          : null,
      validFrom: DateTime.tryParse(json['valid_from'] ?? '') ?? DateTime.now(),
      validUntil: DateTime.tryParse(json['valid_until'] ?? '') ??
          DateTime.now().add(const Duration(days: 30)),
      usageCount: json['usage_count'] ?? 0,
      maxUsage: json['max_usage'],
      isActive: json['is_active'] ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'code': code,
    'description': description,
    'discount_type': discountType,
    'discount_value': discountValue,
    'min_rental_days': minRentalDays,
    'min_booking_amount': minBookingAmount,
    'max_discount_amount': maxDiscountAmount,
    'valid_from': validFrom.toIso8601String(),
    'valid_until': validUntil.toIso8601String(),
    'is_active': isActive,
  };

  bool get isExpired => DateTime.now().isAfter(validUntil);
}
