class ExpenseModel {
  final String id;
  final String title;
  final String category; // Fuel, Maintenance, Insurance, Cleaning, Toll, Staff, Office, Other
  final double amount;
  final DateTime date;
  final String? vehicleId;
  final String? vehiclePlate;
  final String? vendor;
  final String? receiptUrl;
  final String? paymentMethod;
  final String? notes;
  final String status; // approved, pending, rejected
  final String? createdBy;

  ExpenseModel({
    required this.id,
    required this.title,
    required this.category,
    required this.amount,
    required this.date,
    this.vehicleId,
    this.vehiclePlate,
    this.vendor,
    this.receiptUrl,
    this.paymentMethod,
    this.notes,
    this.status = 'approved',
    this.createdBy,
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    return ExpenseModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? 'Expense',
      category: json['category'] ?? 'General',
      amount: (json['amount'] ?? 0).toDouble(),
      date: DateTime.tryParse(json['date'] ?? json['expense_date'] ?? '') ?? DateTime.now(),
      vehicleId: json['vehicle_id']?.toString(),
      vehiclePlate: json['vehicle_plate'] ?? json['registration_number'],
      vendor: json['vendor'],
      receiptUrl: json['receipt_url'],
      paymentMethod: json['payment_method'] ?? 'cash',
      notes: json['notes'],
      status: json['status'] ?? 'approved',
      createdBy: json['created_by_name'] ?? json['created_by'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'category': category,
    'amount': amount,
    'date': date.toIso8601String(),
    'vehicle_id': vehicleId,
    'vendor': vendor,
    'receipt_url': receiptUrl,
    'payment_method': paymentMethod,
    'notes': notes,
    'status': status,
  };
}
