class ContractModel {
  final String id;
  final String contractNumber;
  final String bookingId;
  final String customerName;
  final String customerEmail;
  final String customerPhone;
  final String vehicleName;
  final String vehiclePlate;
  final String status; // draft, sent, signed, expired, terminated
  final DateTime startDate;
  final DateTime endDate;
  final double totalAmount;
  final double depositAmount;
  final String? signatureUrl;
  final DateTime? signedAt;
  final String? signedBy;
  final String? termsText;
  final DateTime createdAt;

  ContractModel({
    required this.id,
    required this.contractNumber,
    required this.bookingId,
    required this.customerName,
    required this.customerEmail,
    required this.customerPhone,
    required this.vehicleName,
    required this.vehiclePlate,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.totalAmount,
    required this.depositAmount,
    this.signatureUrl,
    this.signedAt,
    this.signedBy,
    this.termsText,
    required this.createdAt,
  });

  factory ContractModel.fromJson(Map<String, dynamic> json) {
    return ContractModel(
      id: json['id']?.toString() ?? '',
      contractNumber: json['contract_number'] ?? json['contractNumber'] ?? 'CTR-0001',
      bookingId: json['booking_id'] ?? json['bookingId'] ?? '',
      customerName: json['customer_name'] ?? json['customerName'] ?? 'Customer',
      customerEmail: json['customer_email'] ?? json['customerEmail'] ?? '',
      customerPhone: json['customer_phone'] ?? json['customerPhone'] ?? '',
      vehicleName: json['vehicle_name'] ?? json['vehicleName'] ?? 'Vehicle',
      vehiclePlate: json['vehicle_plate'] ?? json['vehiclePlate'] ?? '',
      status: json['status'] ?? 'draft',
      startDate: DateTime.tryParse(json['start_date'] ?? json['startDate'] ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(json['end_date'] ?? json['endDate'] ?? '') ?? DateTime.now().add(const Duration(days: 3)),
      totalAmount: (json['total_amount'] ?? json['totalAmount'] ?? 0).toDouble(),
      depositAmount: (json['deposit_amount'] ?? json['depositAmount'] ?? 0).toDouble(),
      signatureUrl: json['signature_url'] ?? json['signatureUrl'],
      signedAt: json['signed_at'] != null ? DateTime.tryParse(json['signed_at']) : null,
      signedBy: json['signed_by'] ?? json['signedBy'],
      termsText: json['terms_text'] ?? json['termsText'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'contract_number': contractNumber,
    'booking_id': bookingId,
    'customer_name': customerName,
    'vehicle_name': vehicleName,
    'status': status,
    'start_date': startDate.toIso8601String(),
    'end_date': endDate.toIso8601String(),
    'total_amount': totalAmount,
    'deposit_amount': depositAmount,
    'signature_url': signatureUrl,
    'signed_at': signedAt?.toIso8601String(),
  };

  bool get isSigned => status == 'signed' || signatureUrl != null;
  bool get isExpired => status == 'expired' || DateTime.now().isAfter(endDate);
}
