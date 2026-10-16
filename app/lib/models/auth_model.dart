class User {
  final String id;
  final String email;
  final String name;
  final String phone;
  final String role;
  final String status;
  final String? avatarUrl;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.phone = '',
    required this.role,
    this.status = 'active',
    this.avatarUrl,
    required this.createdAt,
  });

  bool get isAdmin => role == 'admin';
  bool get isManager => role == 'manager' || role == 'admin';
  bool get isStaff => role == 'staff' || isManager;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['full_name'] ?? json['name'] ?? (json['email'] ?? '').split('@').first,
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'staff',
      status: json['status'] ?? 'active',
      avatarUrl: json['avatar_url'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'full_name': name,
        'phone': phone,
        'role': role,
        'status': status,
        'avatar_url': avatarUrl,
        'created_at': createdAt.toIso8601String(),
      };
}

class Tenant {
  final String id;
  final String name;
  final String slug;
  final String currency;
  final String currencySymbol;
  final String timezone;
  final String plan;
  final String status;

  Tenant({
    required this.id,
    required this.name,
    required this.slug,
    this.currency = 'NPR',
    this.currencySymbol = 'Rs.',
    this.timezone = 'Asia/Kathmandu',
    this.plan = 'enterprise',
    this.status = 'active',
  });

  factory Tenant.fromJson(Map<String, dynamic> json) {
    return Tenant(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Himalayan Rides Nepal',
      slug: json['slug'] ?? 'himalayan-rides',
      currency: json['currency'] ?? 'NPR',
      currencySymbol: json['currency_symbol'] ?? 'Rs.',
      timezone: json['timezone'] ?? 'Asia/Kathmandu',
      plan: json['plan'] ?? 'enterprise',
      status: json['status'] ?? 'active',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'slug': slug,
        'currency': currency,
        'currency_symbol': currencySymbol,
        'timezone': timezone,
        'plan': plan,
        'status': status,
      };
}

class TokenPair {
  final String accessToken;
  final String refreshToken;
  final DateTime? expiresAt;

  TokenPair({
    required this.accessToken,
    required this.refreshToken,
    this.expiresAt,
  });

  factory TokenPair.fromJson(Map<String, dynamic> json) {
    return TokenPair(
      accessToken: json['access_token'] ?? '',
      refreshToken: json['refresh_token'] ?? '',
      expiresAt: json['expires_at'] != null ? DateTime.tryParse(json['expires_at']) : null,
    );
  }
}
