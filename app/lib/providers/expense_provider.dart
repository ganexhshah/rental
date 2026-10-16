import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/expense_model.dart';

class ExpenseProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  List<ExpenseModel> _expenses = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _selectedCategory = 'All';

  List<ExpenseModel> get expenses {
    if (_selectedCategory == 'All') return _expenses;
    return _expenses.where((e) => e.category.toLowerCase() == _selectedCategory.toLowerCase()).toList();
  }

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get selectedCategory => _selectedCategory;

  double get totalExpenses => _expenses.fold(0.0, (sum, e) => sum + e.amount);

  double get fuelExpenses => _expenses
      .where((e) => e.category.toLowerCase() == 'fuel')
      .fold(0.0, (sum, e) => sum + e.amount);

  double get maintenanceExpenses => _expenses
      .where((e) => e.category.toLowerCase() == 'maintenance')
      .fold(0.0, (sum, e) => sum + e.amount);

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  Future<void> fetchExpenses({bool forceRefresh = false}) async {
    if (_expenses.isNotEmpty && !forceRefresh) return;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiClient.get(ApiEndpoints.expenses);
      if (res is List) {
        _expenses = res.map((item) => ExpenseModel.fromJson(item)).toList();
      } else if (res is Map && res['expenses'] is List) {
        _expenses = (res['expenses'] as List).map((i) => ExpenseModel.fromJson(i)).toList();
      } else {
        _expenses = _getMockExpenses();
      }
    } catch (_) {
      _expenses = _getMockExpenses();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addExpense({
    required String title,
    required String category,
    required double amount,
    String? vehiclePlate,
    String? vendor,
    String? notes,
  }) async {
    final newExpense = ExpenseModel(
      id: 'exp-${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      category: category,
      amount: amount,
      date: DateTime.now(),
      vehiclePlate: vehiclePlate,
      vendor: vendor,
      notes: notes,
      status: 'approved',
      createdBy: 'Admin',
    );

    try {
      await _apiClient.post(ApiEndpoints.expenses, body: newExpense.toJson());
    } catch (_) {}

    _expenses.insert(0, newExpense);
    notifyListeners();
    return true;
  }

  List<ExpenseModel> _getMockExpenses() {
    return [
      ExpenseModel(
        id: 'exp-001',
        title: 'Diesel Refuel - Fleet Run',
        category: 'Fuel',
        amount: 8500,
        date: DateTime.now().subtract(const Duration(hours: 4)),
        vehiclePlate: 'BA 2 CHA 4492',
        vendor: 'Sajha Petrol Pump',
        paymentMethod: 'Corporate Card',
        status: 'approved',
      ),
      ExpenseModel(
        id: 'exp-002',
        title: 'Brake Pad Replacement & Fluid',
        category: 'Maintenance',
        amount: 14200,
        date: DateTime.now().subtract(const Duration(days: 1)),
        vehiclePlate: 'BA 3 CHA 1109',
        vendor: 'Kathmandu Auto Care',
        paymentMethod: 'Bank Transfer',
        status: 'approved',
      ),
      ExpenseModel(
        id: 'exp-003',
        title: 'Deep Interior Cleaning & Detailing',
        category: 'Cleaning',
        amount: 2500,
        date: DateTime.now().subtract(const Duration(days: 2)),
        vehiclePlate: 'BA 15 PA 8821',
        vendor: 'Sparkle Car Wash',
        paymentMethod: 'Cash',
        status: 'approved',
      ),
      ExpenseModel(
        id: 'exp-004',
        title: 'Annual Comprehensive Vehicle Insurance',
        category: 'Insurance',
        amount: 45000,
        date: DateTime.now().subtract(const Duration(days: 5)),
        vehiclePlate: 'BA 2 CHA 4492',
        vendor: 'Sagarmatha Insurance',
        paymentMethod: 'Cheque',
        status: 'approved',
      ),
    ];
  }
}
