class MaintenanceTask {
  final String id;
  final String vehicleId;
  final String vehiclePlate;
  final String title;
  final String status; // scheduled, in_progress, completed, overdue
  final String priority; // low, medium, high, urgent
  final double cost;
  final String? vendorName;
  final DateTime dueDate;
  final DateTime? completedAt;
  final String? description;
  final int? odometer;

  MaintenanceTask({
    required this.id,
    required this.vehicleId,
    required this.vehiclePlate,
    required this.title,
    required this.status,
    this.priority = 'medium',
    this.cost = 0.0,
    this.vendorName,
    required this.dueDate,
    this.completedAt,
    this.description,
    this.odometer,
  });

  factory MaintenanceTask.fromJson(Map<String, dynamic> json) {
    return MaintenanceTask(
      id: json['id']?.toString() ?? '',
      vehicleId: json['vehicle_id']?.toString() ?? '',
      vehiclePlate: json['vehicle_plate'] ?? json['registration_number'] ?? '—',
      title: json['title'] ?? 'Scheduled Maintenance',
      status: json['status'] ?? 'scheduled',
      priority: json['priority'] ?? 'medium',
      cost: (json['cost'] as num?)?.toDouble() ?? 0.0,
      vendorName: json['vendor_name'] ?? json['vendor'],
      dueDate: json['due_date'] != null
          ? DateTime.tryParse(json['due_date']) ?? DateTime.now()
          : DateTime.now(),
      completedAt: json['completed_at'] != null
          ? DateTime.tryParse(json['completed_at'])
          : null,
      description: json['description'],
      odometer: json['odometer_at_service'],
    );
  }
}

class MaintenanceVendor {
  final String id;
  final String name;
  final String contactPerson;
  final String phone;
  final String address;
  final String specialty; // General, Tyres, Engine, Electrical, Bodywork
  final double rating;

  MaintenanceVendor({
    required this.id,
    required this.name,
    required this.contactPerson,
    required this.phone,
    required this.address,
    required this.specialty,
    this.rating = 4.8,
  });

  factory MaintenanceVendor.fromJson(Map<String, dynamic> json) {
    return MaintenanceVendor(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? 'Authorized Workshop',
      contactPerson: json['contact_person'] ?? 'Service Advisor',
      phone: json['phone'] ?? '+977-1-4200000',
      address: json['address'] ?? 'Kathmandu',
      specialty: json['specialty'] ?? 'Full Service',
      rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
    );
  }
}

class MaintenanceSchedule {
  final String id;
  final String serviceName;
  final int intervalKm;
  final int intervalMonths;
  final String description;

  MaintenanceSchedule({
    required this.id,
    required this.serviceName,
    required this.intervalKm,
    required this.intervalMonths,
    required this.description,
  });

  factory MaintenanceSchedule.fromJson(Map<String, dynamic> json) {
    return MaintenanceSchedule(
      id: json['id']?.toString() ?? '',
      serviceName: json['service_name'] ?? json['name'] ?? 'Regular Service',
      intervalKm: json['interval_km'] ?? 5000,
      intervalMonths: json['interval_months'] ?? 6,
      description: json['description'] ?? 'Oil and filter replacement',
    );
  }
}
