class PaymentTransaction {
  final String id;
  final String transactionNumber;
  final String bookingId;
  final String? bookingCode;
  final String customerId;
  final String customerName;
  final double amount;
  final String currency;
  final String category; // rental, deposit, deposit_refund, late_fee, damage_fee
  final String method; // cash, bank_transfer, card, esewa, khalti
  final String status; // completed, pending, failed, refunded
  final String? gatewayReference;
  final DateTime createdAt;

  PaymentTransaction({
    required this.id,
    required this.transactionNumber,
    required this.bookingId,
    this.bookingCode,
    required this.customerId,
    required this.customerName,
    required this.amount,
    this.currency = 'NPR',
    required this.category,
    required this.method,
    required this.status,
    this.gatewayReference,
    required this.createdAt,
  });

  factory PaymentTransaction.fromJson(Map<String, dynamic> json) {
    return PaymentTransaction(
      id: json['id'] ?? '',
      transactionNumber: json['transaction_number'] ?? 'TXN-000',
      bookingId: json['booking_id'] ?? '',
      bookingCode: json['booking_code'],
      customerId: json['customer_id'] ?? '',
      customerName: json['customer_name'] ?? 'Customer',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] ?? 'NPR',
      category: json['category'] ?? 'rental',
      method: json['method'] ?? 'cash',
      status: json['status'] ?? 'completed',
      gatewayReference: json['gateway_reference'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class DepositRecord {
  final String id;
  final String bookingId;
  final String bookingCode;
  final String customerId;
  final String customerName;
  final double amount;
  final String status; // held, released, partially_released, claimed
  final double releasedAmount;
  final double deductionsAmount;
  final String? deductionReason;
  final String method;
  final DateTime heldAt;
  final DateTime? releasedAt;

  DepositRecord({
    required this.id,
    required this.bookingId,
    required this.bookingCode,
    required this.customerId,
    required this.customerName,
    required this.amount,
    required this.status,
    this.releasedAmount = 0.0,
    this.deductionsAmount = 0.0,
    this.deductionReason,
    this.method = 'cash',
    required this.heldAt,
    this.releasedAt,
  });

  factory DepositRecord.fromJson(Map<String, dynamic> json) {
    return DepositRecord(
      id: json['id'] ?? '',
      bookingId: json['booking_id'] ?? '',
      bookingCode: json['booking_code'] ?? 'BK-DEPOSIT',
      customerId: json['customer_id'] ?? '',
      customerName: json['customer_name'] ?? 'Customer',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'held',
      releasedAmount: (json['released_amount'] as num?)?.toDouble() ?? 0.0,
      deductionsAmount: (json['deductions_amount'] as num?)?.toDouble() ?? 0.0,
      deductionReason: json['deduction_reason'],
      method: json['method'] ?? 'cash',
      heldAt: json['held_at'] != null
          ? DateTime.tryParse(json['held_at']) ?? DateTime.now()
          : DateTime.now(),
      releasedAt: json['released_at'] != null
          ? DateTime.tryParse(json['released_at'])
          : null,
    );
  }
}

class InvoiceItem {
  final String id;
  final String description;
  final int quantity;
  final double unitPrice;
  final double totalPrice;

  InvoiceItem({
    required this.id,
    required this.description,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
  });

  factory InvoiceItem.fromJson(Map<String, dynamic> json) {
    return InvoiceItem(
      id: json['id'] ?? '',
      description: json['description'] ?? 'Rental Item',
      quantity: json['quantity'] ?? 1,
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0.0,
      totalPrice: (json['total_price'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class Invoice {
  final String id;
  final String invoiceNumber;
  final String bookingId;
  final String bookingCode;
  final String customerId;
  final String customerName;
  final String status; // draft, issued, paid, overdue, void
  final double subtotal;
  final double taxAmount;
  final double discountAmount;
  final double totalAmount;
  final double paidAmount;
  final double balanceDue;
  final List<InvoiceItem> items;
  final DateTime issueDate;
  final DateTime dueDate;
  final String? pdfUrl;

  Invoice({
    required this.id,
    required this.invoiceNumber,
    required this.bookingId,
    required this.bookingCode,
    required this.customerId,
    required this.customerName,
    required this.status,
    required this.subtotal,
    this.taxAmount = 0.0,
    this.discountAmount = 0.0,
    required this.totalAmount,
    this.paidAmount = 0.0,
    required this.balanceDue,
    this.items = const [],
    required this.issueDate,
    required this.dueDate,
    this.pdfUrl,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) {
    var rawItems = json['items'];
    List<InvoiceItem> parsedItems = [];
    if (rawItems is List) {
      parsedItems = rawItems
          .map((i) => InvoiceItem.fromJson(i as Map<String, dynamic>))
          .toList();
    }

    return Invoice(
      id: json['id'] ?? '',
      invoiceNumber: json['invoice_number'] ?? 'INV-000',
      bookingId: json['booking_id'] ?? '',
      bookingCode: json['booking_code'] ?? 'BK-INV',
      customerId: json['customer_id'] ?? '',
      customerName: json['customer_name'] ?? 'Customer',
      status: json['status'] ?? 'issued',
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      taxAmount: (json['tax_amount'] as num?)?.toDouble() ?? 0.0,
      discountAmount: (json['discount_amount'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (json['paid_amount'] as num?)?.toDouble() ?? 0.0,
      balanceDue: (json['balance_due'] as num?)?.toDouble() ?? 0.0,
      items: parsedItems,
      issueDate: json['issue_date'] != null
          ? DateTime.tryParse(json['issue_date']) ?? DateTime.now()
          : DateTime.now(),
      dueDate: json['due_date'] != null
          ? DateTime.tryParse(json['due_date']) ?? DateTime.now()
          : DateTime.now(),
      pdfUrl: json['pdf_url'],
    );
  }
}
