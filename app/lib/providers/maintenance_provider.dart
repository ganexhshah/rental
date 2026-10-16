import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/maintenance_model.dart';

class MaintenanceProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  List<MaintenanceTask> _tasks = [];
  List<MaintenanceVendor> _vendors = [];
  List<MaintenanceSchedule> _schedules = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _selectedTab = 'queue'; // queue, vendors, schedules

  List<MaintenanceTask> get tasks => _tasks;
  List<MaintenanceVendor> get vendors => _vendors;
  List<MaintenanceSchedule> get schedules => _schedules;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get selectedTab => _selectedTab;

  void setSelectedTab(String tab) {
    _selectedTab = tab;
    notifyListeners();
  }

  Future<void> fetchMaintenanceData({bool forceRefresh = false}) async {
    if (_tasks.isNotEmpty && !forceRefresh) return;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiClient.get(ApiEndpoints.maintenance);
      if (res is List) {
        _tasks = res.map((i) => MaintenanceTask.fromJson(i)).toList();
      } else if (res is Map && res['tasks'] is List) {
        _tasks = (res['tasks'] as List).map((i) => MaintenanceTask.fromJson(i)).toList();
      } else {
        _tasks = _getMockTasks();
      }
    } catch (_) {
      _tasks = _getMockTasks();
    }

    _vendors = _getMockVendors();
    _schedules = _getMockSchedules();

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> addTask({
    required String vehiclePlate,
    required String title,
    required String priority,
    required double cost,
    String? vendorName,
    required DateTime dueDate,
    String? description,
  }) async {
    final task = MaintenanceTask(
      id: 'mnt-${DateTime.now().millisecondsSinceEpoch}',
      vehicleId: 'veh-custom',
      vehiclePlate: vehiclePlate,
      title: title,
      status: 'scheduled',
      priority: priority,
      cost: cost,
      vendorName: vendorName,
      dueDate: dueDate,
      description: description,
    );

    _tasks.insert(0, task);
    notifyListeners();
    return true;
  }

  Future<void> completeTask(String id) async {
    final idx = _tasks.indexWhere((t) => t.id == id);
    if (idx != -1) {
      final t = _tasks[idx];
      _tasks[idx] = MaintenanceTask(
        id: t.id,
        vehicleId: t.vehicleId,
        vehiclePlate: t.vehiclePlate,
        title: t.title,
        status: 'completed',
        priority: t.priority,
        cost: t.cost,
        vendorName: t.vendorName,
        dueDate: t.dueDate,
        completedAt: DateTime.now(),
        description: t.description,
      );
      notifyListeners();
    }
  }

  List<MaintenanceTask> _getMockTasks() {
    return [
      MaintenanceTask(
        id: 'mnt-001',
        vehicleId: 'veh-01',
        vehiclePlate: 'BA 2 CHA 4492',
        title: '50,000 KM Major Servicing & Timing Belt',
        status: 'in_progress',
        priority: 'high',
        cost: 28500,
        vendorName: 'Mahindra Authorized Service - Balaju',
        dueDate: DateTime.now().add(const Duration(days: 1)),
        description: 'Check gearbox oil, replace air filter, fuel filter and adjust clutch cable.',
      ),
      MaintenanceTask(
        id: 'mnt-002',
        vehicleId: 'veh-02',
        vehiclePlate: 'BA 3 CHA 1109',
        title: 'Front Brake Pad Replacement & Alignment',
        status: 'scheduled',
        priority: 'medium',
        cost: 9500,
        vendorName: 'Highway Tyre & Alignment Center',
        dueDate: DateTime.now().add(const Duration(days: 3)),
        description: 'Slight vibration reported at 80 km/h during return inspection.',
      ),
      MaintenanceTask(
        id: 'mnt-003',
        vehicleId: 'veh-03',
        vehiclePlate: 'BA 15 PA 8821',
        title: 'Air Conditioning Refrigerant Recharge',
        status: 'completed',
        priority: 'low',
        cost: 4500,
        vendorName: 'Kathmandu AC Works',
        dueDate: DateTime.now().subtract(const Duration(days: 2)),
        completedAt: DateTime.now().subtract(const Duration(days: 1)),
        description: 'AC gas refill and cabin pollen filter replaced.',
      ),
    ];
  }

  List<MaintenanceVendor> _getMockVendors() {
    return [
      MaintenanceVendor(
        id: 'v-01',
        name: 'Mahindra Authorized Service Center',
        contactPerson: 'Ramesh Shrestha',
        phone: '+977-1-4355678',
        address: 'Balaju Industrial Area, Kathmandu',
        specialty: 'Engine & Suspension',
        rating: 4.9,
      ),
      MaintenanceVendor(
        id: 'v-02',
        name: 'Highway Tyre & Suspension Clinic',
        contactPerson: 'Sanjay Thapa',
        phone: '+977-9851088776',
        address: 'Ring Road, Gwarko, Lalitpur',
        specialty: 'Tyres & Wheel Alignment',
        rating: 4.7,
      ),
      MaintenanceVendor(
        id: 'v-03',
        name: 'Kathmandu Elite Detailing & Wash',
        contactPerson: 'Deepak Tamang',
        phone: '+977-9803322114',
        address: 'Bhatbhateni, Naxal',
        specialty: 'Interior & Exterior Detailing',
        rating: 4.8,
      ),
    ];
  }

  List<MaintenanceSchedule> _getMockSchedules() {
    return [
      MaintenanceSchedule(
        id: 'sch-01',
        serviceName: 'Engine Oil & Filter Service',
        intervalKm: 5000,
        intervalMonths: 3,
        description: 'Synthetic 5W-40 oil replacement and OEM oil filter check.',
      ),
      MaintenanceSchedule(
        id: 'sch-02',
        serviceName: 'Comprehensive Brake & Fluid Check',
        intervalKm: 15000,
        intervalMonths: 6,
        description: 'Brake pad thickness measurement, rotor disc inspection, DOT 4 fluid top-up.',
      ),
      MaintenanceSchedule(
        id: 'sch-03',
        serviceName: 'Transmission & Differential Fluid Flush',
        intervalKm: 40000,
        intervalMonths: 18,
        description: 'Crucial for 4x4 off-road SUV fleet longevity.',
      ),
    ];
  }
}
