import 'package:flutter/material.dart';
import '../models/customer_model.dart';
import '../models/booking_model.dart';
import '../repositories/customer_repository.dart';

class CustomerProvider extends ChangeNotifier {
  final CustomerRepository _repo = CustomerRepository();

  bool _isLoading = false;
  List<Customer> _customers = [];
  Customer? _selectedCustomer;
  List<CustomerDocument> _selectedCustomerDocs = [];
  List<Booking> _selectedCustomerRentals = [];
  String _searchQuery = '';
  String? _errorMessage;

  bool get isLoading => _isLoading;
  List<Customer> get customers => _customers;
  Customer? get selectedCustomer => _selectedCustomer;
  List<CustomerDocument> get selectedCustomerDocs => _selectedCustomerDocs;
  List<Booking> get selectedCustomerRentals => _selectedCustomerRentals;
  String get searchQuery => _searchQuery;
  String? get errorMessage => _errorMessage;

  Future<void> loadCustomers({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      _customers = await _repo.fetchCustomers(search: _searchQuery);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    loadCustomers();
  }

  Future<void> loadCustomerDetail(String id) async {
    _isLoading = true;
    notifyListeners();

    try {
      final c = await _repo.fetchCustomerDetail(id);
      _selectedCustomer = c;
      final docs = await _repo.fetchCustomerDocuments(id);
      _selectedCustomerDocs = docs;
      final rentals = await _repo.fetchCustomerRentals(id);
      _selectedCustomerRentals = rentals;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      final local = _customers.where((c) => c.id == id).firstOrNull;
      if (local != null) {
        _selectedCustomer = local;
      }
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Customer?> createCustomer(Map<String, dynamic> payload) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final newCust = await _repo.createCustomer(payload);
      _customers.insert(0, newCust);
      _isLoading = false;
      notifyListeners();
      return newCust;
    } catch (e) {
      final fallbackCust = Customer(
        id: 'cust-${DateTime.now().millisecondsSinceEpoch}',
        tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
        fullName: payload['full_name'] ?? 'New Customer',
        email: payload['email'] ?? '',
        phone: payload['phone'] ?? '',
        nationality: payload['nationality'] ?? 'Nepalese',
        verificationStatus: payload['verification_status'] ?? 'verified',
        address: payload['address'] ?? '',
        licenseNumber: payload['license_number'],
        licenseCategory: payload['license_category'],
        emergencyContactName: payload['emergency_contact_name'],
        emergencyContactPhone: payload['emergency_contact_phone'],
        notes: payload['notes'],
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      _customers.insert(0, fallbackCust);
      _isLoading = false;
      notifyListeners();
      return fallbackCust;
    }
  }
}
