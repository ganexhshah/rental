class DocumentModel {
  final String id;
  final String title;
  final String documentType; // insurance, bluebook, pollution, road_tax, driving_license, passport, citizenship, contract
  final String? relatedEntityType; // vehicle, customer, booking
  final String? relatedEntityId;
  final String? fileUrl;
  final String? documentNumber;
  final DateTime? expiryDate;
  final String status; // valid, expiring_soon, expired, pending_review
  final DateTime createdAt;

  DocumentModel({
    required this.id,
    required this.title,
    required this.documentType,
    this.relatedEntityType,
    this.relatedEntityId,
    this.fileUrl,
    this.documentNumber,
    this.expiryDate,
    required this.status,
    required this.createdAt,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) {
    return DocumentModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? json['document_name'] ?? 'Document',
      documentType: json['document_type'] ?? 'general',
      relatedEntityType: json['related_entity_type'] ?? json['entity_type'],
      relatedEntityId: json['related_entity_id']?.toString() ?? json['entity_id']?.toString(),
      fileUrl: json['file_url'] ?? json['url'],
      documentNumber: json['document_number'] ?? json['number'],
      expiryDate: json['expiry_date'] != null ? DateTime.tryParse(json['expiry_date']) : null,
      status: json['status'] ?? 'valid',
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  bool get isExpired => expiryDate != null && DateTime.now().isAfter(expiryDate!);
  bool get isExpiringSoon {
    if (expiryDate == null) return false;
    final days = expiryDate!.difference(DateTime.now()).inDays;
    return days >= 0 && days <= 30;
  }
}
