class StaffMemberModel {
  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String role; // admin, fleet_manager, counter_staff, mechanic, accountant
  final String status; // active, suspended, pending
  final DateTime? lastLogin;
  final DateTime createdAt;

  StaffMemberModel({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    this.status = 'active',
    this.lastLogin,
    required this.createdAt,
  });

  factory StaffMemberModel.fromJson(Map<String, dynamic> json) {
    return StaffMemberModel(
      id: json['id']?.toString() ?? '',
      fullName: json['full_name'] ?? json['name'] ?? 'Staff User',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'counter_staff',
      status: json['status'] ?? 'active',
      lastLogin: json['last_login_at'] != null
          ? DateTime.tryParse(json['last_login_at'])
          : null,
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'full_name': fullName,
    'email': email,
    'phone': phone,
    'role': role,
    'status': status,
  };
}

class AuditLogModel {
  final String id;
  final String userId;
  final String userName;
  final String action; // CREATE, UPDATE, DELETE, PICKUP, RETURN, APPROVE_KYC
  final String resourceType; // booking, vehicle, customer, payment, settings
  final String resourceId;
  final String description;
  final DateTime timestamp;
  final String? ipAddress;

  AuditLogModel({
    required this.id,
    required this.userId,
    required this.userName,
    required this.action,
    required this.resourceType,
    required this.resourceId,
    required this.description,
    required this.timestamp,
    this.ipAddress,
  });

  factory AuditLogModel.fromJson(Map<String, dynamic> json) {
    return AuditLogModel(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      userName: json['user_name'] ?? 'System User',
      action: json['action'] ?? 'ACTION',
      resourceType: json['resource_type'] ?? 'entity',
      resourceId: json['resource_id']?.toString() ?? '',
      description: json['description'] ?? json['details'] ?? 'Performed system action',
      timestamp: DateTime.tryParse(json['created_at'] ?? json['timestamp'] ?? '') ?? DateTime.now(),
      ipAddress: json['ip_address'],
    );
  }
}
