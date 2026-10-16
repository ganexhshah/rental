import 'package:flutter/material.dart';
import '../models/vehicle_model.dart';
import '../models/maintenance_model.dart';
import '../repositories/fleet_repository.dart';

class FleetProvider extends ChangeNotifier {
  final FleetRepository _repo = FleetRepository();

  bool _isLoading = false;
  List<Vehicle> _vehicles = [];
  List<VehicleCategory> _categories = [];
  bool _categoriesLoading = false;
  Vehicle? _selectedVehicle;
  List<VehicleDocument> _selectedVehicleDocs = [];
  List<VehicleDocument> _allDocuments = [];
  bool _documentsLoading = false;
  List<VehicleLocation> _locations = [];
  bool _locationsLoading = false;
  List<MaintenanceTask> _selectedVehicleMaintenance = [];
  String _filterStatus = 'all';
  String? _errorMessage;

  bool get isLoading => _isLoading;
  List<Vehicle> get vehicles => _vehicles;
  List<VehicleCategory> get categories => _categories;
  bool get categoriesLoading => _categoriesLoading;
  List<VehicleLocation> get locations => _locations;
  bool get locationsLoading => _locationsLoading;
  List<VehicleDocument> get allDocuments => _allDocuments;
  bool get documentsLoading => _documentsLoading;
  Vehicle? get selectedVehicle => _selectedVehicle;
  List<VehicleDocument> get selectedVehicleDocs => _selectedVehicleDocs;
  List<MaintenanceTask> get selectedVehicleMaintenance => _selectedVehicleMaintenance;
  String get filterStatus => _filterStatus;
  String? get errorMessage => _errorMessage;

  Future<void> loadVehicles({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      _vehicles = await _repo.fetchVehicles(status: _filterStatus);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  void setFilterStatus(String status) {
    _filterStatus = status;
    loadVehicles();
  }

  Future<Vehicle> saveVehicle(Map<String, dynamic> data, {String? id}) async {
    try {
      Vehicle saved;
      if (id != null && id.isNotEmpty && !id.startsWith('veh-')) {
        saved = await _repo.updateVehicle(id, data);
      } else {
        saved = await _repo.createVehicle(data);
      }
      final idx = _vehicles.indexWhere((v) => v.id == (id ?? saved.id));
      if (idx >= 0) {
        _vehicles[idx] = saved;
      } else {
        _vehicles.insert(0, saved);
      }
      notifyListeners();
      return saved;
    } catch (e) {
      // Local fallback in case network error
      final fallback = Vehicle.fromJson({
        'id': id ?? 'veh-${DateTime.now().millisecondsSinceEpoch}',
        'tenant_id': 'tenant-local',
        ...data,
        'created_at': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
      });
      final idx = _vehicles.indexWhere((v) => v.id == fallback.id);
      if (idx >= 0) {
        _vehicles[idx] = fallback;
      } else {
        _vehicles.insert(0, fallback);
      }
      notifyListeners();
      return fallback;
    }
  }

  void addVehicle({
    required String make,
    required String model,
    required int year,
    required String plate,
    required String category,
    required String fuelType,
    required String transmission,
    required double dailyRate,
    required int odometer,
  }) {
    saveVehicle({
      'make': make,
      'model': model,
      'year': year,
      'plate_number': plate,
      'category_name': category,
      'fuel_type': fuelType,
      'transmission': transmission,
      'daily_rate': dailyRate,
      'deposit_amount': 5000.0,
      'odometer': odometer,
      'status': 'available',
    });
  }

  Future<void> loadVehicleDetail(String id) async {
    _isLoading = true;
    notifyListeners();

    try {
      final v = await _repo.fetchVehicleDetail(id);
      _selectedVehicle = v;
      final docs = await _repo.fetchVehicleDocuments(id);
      _selectedVehicleDocs = docs;
      final maint = await _repo.fetchVehicleMaintenance(id);
      _selectedVehicleMaintenance = maint;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      final local = _vehicles.where((v) => v.id == id).firstOrNull;
      if (local != null) {
        _selectedVehicle = local;
      }
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<VehicleDocument>> getVehicleDocuments(String vehicleId) async {
    return await _repo.fetchVehicleDocuments(vehicleId);
  }

  Future<void> loadCategories({bool silent = false}) async {
    if (!silent) {
      _categoriesLoading = true;
      notifyListeners();
    }
    try {
      final list = await _repo.fetchCategories();
      _categories = list;
      _categoriesLoading = false;
      notifyListeners();
    } catch (e) {
      _categoriesLoading = false;
      notifyListeners();
    }
  }

  Future<VehicleCategory> saveCategory(VehicleCategory category, {bool isEditing = false}) async {
    try {
      VehicleCategory saved;
      if (isEditing && category.id.isNotEmpty && !category.id.startsWith('cat-local')) {
        saved = await _repo.updateCategory(category);
      } else {
        saved = await _repo.createCategory(category);
      }
      final idx = _categories.indexWhere((c) => c.id == (isEditing ? category.id : saved.id));
      if (idx >= 0) {
        _categories[idx] = saved;
      } else {
        _categories.add(saved);
      }
      notifyListeners();
      return saved;
    } catch (e) {
      if (isEditing) {
        final idx = _categories.indexWhere((c) => c.id == category.id);
        if (idx >= 0) _categories[idx] = category;
      } else {
        _categories.add(category);
      }
      notifyListeners();
      rethrow;
    }
  }

  Future<bool> deleteCategory(String id) async {
    try {
      final ok = await _repo.deleteCategory(id);
      _categories.removeWhere((c) => c.id == id);
      notifyListeners();
      return ok;
    } catch (e) {
      _categories.removeWhere((c) => c.id == id);
      notifyListeners();
      rethrow;
    }
  }

  Future<void> loadAllDocuments({bool forceRefresh = false, String? vehicleId, String? docType, String? status, String? search}) async {
    if (_allDocuments.isNotEmpty && !forceRefresh) return;
    _documentsLoading = true;
    notifyListeners();

    try {
      final docs = await _repo.fetchAllDocuments(
        vehicleId: vehicleId,
        docType: docType,
        status: status,
        search: search,
      );
      _allDocuments = docs;
    } catch (_) {
      // If network fails and list is empty, provide initial offline fallback
      if (_allDocuments.isEmpty) {
        _allDocuments = _getDefaultSampleDocuments();
      }
    }

    _documentsLoading = false;
    notifyListeners();
  }

  List<VehicleDocument> _getDefaultSampleDocuments() {
    final now = DateTime.now();
    return [
      VehicleDocument(
        id: 'doc-1',
        vehicleId: _vehicles.isNotEmpty ? _vehicles.first.id : 'veh-1',
        vehiclePlate: _vehicles.isNotEmpty ? _vehicles.first.plateNumber : 'BA 2 CHA 4492',
        vehicleName: _vehicles.isNotEmpty ? '${_vehicles.first.make} ${_vehicles.first.model}' : 'Mahindra Scorpio 4x4',
        docType: 'bluebook',
        name: 'Bluebook (Registration)',
        documentNumber: 'BB-KTM-44921-BAG',
        expiryDate: now.add(const Duration(days: 280)),
        status: 'valid',
        verificationStatus: 'verified',
        fileUrl: 'https://storage.rental.app/docs/bluebook.pdf',
      ),
      VehicleDocument(
        id: 'doc-2',
        vehicleId: _vehicles.isNotEmpty ? _vehicles.first.id : 'veh-1',
        vehiclePlate: _vehicles.isNotEmpty ? _vehicles.first.plateNumber : 'BA 2 CHA 4492',
        vehicleName: _vehicles.isNotEmpty ? '${_vehicles.first.make} ${_vehicles.first.model}' : 'Mahindra Scorpio 4x4',
        docType: 'insurance',
        name: 'Comprehensive Insurance Policy',
        documentNumber: 'SHIKHAR-INS-9921',
        expiryDate: now.add(const Duration(days: 12)),
        status: 'expiring_soon',
        verificationStatus: 'verified',
        fileUrl: 'https://storage.rental.app/docs/insurance.pdf',
      ),
      VehicleDocument(
        id: 'doc-3',
        vehicleId: _vehicles.length > 1 ? _vehicles[1].id : 'veh-2',
        vehiclePlate: _vehicles.length > 1 ? _vehicles[1].plateNumber : 'BA 15 CHA 8821',
        vehicleName: _vehicles.length > 1 ? '${_vehicles[1].make} ${_vehicles[1].model}' : 'Toyota Hilux Double Cab',
        docType: 'road_tax',
        name: 'Road Tax Token & Clearance',
        documentNumber: 'TAX-BAGMATI-2025-09',
        expiryDate: now.subtract(const Duration(days: 4)),
        status: 'expired',
        verificationStatus: 'pending',
        fileUrl: 'https://storage.rental.app/docs/tax.pdf',
      ),
      VehicleDocument(
        id: 'doc-4',
        vehicleId: _vehicles.length > 1 ? _vehicles[1].id : 'veh-2',
        vehiclePlate: _vehicles.length > 1 ? _vehicles[1].plateNumber : 'BA 15 CHA 8821',
        vehicleName: _vehicles.length > 1 ? '${_vehicles[1].make} ${_vehicles[1].model}' : 'Toyota Hilux Double Cab',
        docType: 'pollution',
        name: 'Green Pollution / Emission Test',
        documentNumber: 'POL-GREEN-8812',
        expiryDate: now.add(const Duration(days: 140)),
        status: 'valid',
        verificationStatus: 'verified',
        fileUrl: 'https://storage.rental.app/docs/pollution.pdf',
      ),
    ];
  }

  Future<VehicleDocument> saveVehicleDocument(VehicleDocument doc, {bool isEditing = false}) async {
    try {
      VehicleDocument saved;
      if (isEditing && doc.id.isNotEmpty && !doc.id.startsWith('doc-')) {
        saved = await _repo.updateVehicleDocument(doc.id, doc.toJson());
      } else {
        saved = await _repo.createVehicleDocument(doc);
      }
      final idx = _allDocuments.indexWhere((d) => d.id == (isEditing ? doc.id : saved.id));
      if (idx >= 0) {
        _allDocuments[idx] = saved;
      } else {
        _allDocuments.insert(0, saved);
      }
      notifyListeners();
      return saved;
    } catch (e) {
      if (isEditing) {
        final idx = _allDocuments.indexWhere((d) => d.id == doc.id);
        if (idx >= 0) _allDocuments[idx] = doc;
      } else {
        _allDocuments.insert(0, doc);
      }
      notifyListeners();
      return doc;
    }
  }

  Future<VehicleDocument> verifyDocument(String docId, {required String status, String? notes}) async {
    try {
      final updated = await _repo.verifyVehicleDocument(docId, status: status, notes: notes);
      final idx = _allDocuments.indexWhere((d) => d.id == docId);
      if (idx >= 0) {
        _allDocuments[idx] = updated;
      }
      notifyListeners();
      return updated;
    } catch (_) {
      final idx = _allDocuments.indexWhere((d) => d.id == docId);
      if (idx >= 0) {
        final d = _allDocuments[idx];
        _allDocuments[idx] = VehicleDocument(
          id: d.id,
          vehicleId: d.vehicleId,
          vehiclePlate: d.vehiclePlate,
          vehicleName: d.vehicleName,
          docType: d.docType,
          name: d.name,
          documentNumber: d.documentNumber,
          issuingAuthority: d.issuingAuthority,
          fileUrl: d.fileUrl,
          issueDate: d.issueDate,
          expiryDate: d.expiryDate,
          status: d.status,
          verificationStatus: status,
          notes: notes ?? d.notes,
        );
        notifyListeners();
        return _allDocuments[idx];
      }
      rethrow;
    }
  }

  Future<bool> deleteVehicleDocument(String docId) async {
    try {
      await _repo.deleteVehicleDocument(docId);
    } catch (_) {}
    _allDocuments.removeWhere((d) => d.id == docId);
    notifyListeners();
    return true;
  }

  // --- Locations ---

  Future<void> loadLocations({bool forceRefresh = false}) async {
    if (_locations.isNotEmpty && !forceRefresh) return;
    _locationsLoading = true;
    notifyListeners();

    try {
      final locs = await _repo.fetchLocations();
      _locations = locs;
    } catch (_) {
      if (_locations.isEmpty) {
        _locations = _getDefaultSampleLocations();
      }
    }

    _locationsLoading = false;
    notifyListeners();
  }

  List<VehicleLocation> _getDefaultSampleLocations() {
    return [
      VehicleLocation(
        id: 'loc-1',
        name: 'Kathmandu Central Hub (HQ)',
        code: 'KTM-HQ',
        city: 'Kathmandu',
        address: 'Kantipath, Near Garden of Dreams, Kathmandu',
        phone: '+977 1-4428901',
        activeVehiclesCount: 16,
      ),
      VehicleLocation(
        id: 'loc-2',
        name: 'Pokhara Lakeside Branch',
        code: 'PKR-01',
        city: 'Pokhara',
        address: 'Baidam, Lakeside-6, Pokhara, Kaski',
        phone: '+977 61-523190',
        activeVehiclesCount: 9,
      ),
      VehicleLocation(
        id: 'loc-3',
        name: 'Tribhuvan Int. Airport Station',
        code: 'TIA-ARR',
        city: 'Kathmandu',
        address: 'Arrival Terminal Lane, TIA Airport, Ring Road',
        phone: '+977 9801239912',
        activeVehiclesCount: 6,
      ),
      VehicleLocation(
        id: 'loc-4',
        name: 'Chitwan Sauraha Station',
        code: 'CHW-01',
        city: 'Sauraha / Chitwan',
        address: 'Hatti Chowk, Sauraha, Chitwan National Park Entrance',
        phone: '+977 56-580122',
        activeVehiclesCount: 4,
      ),
      VehicleLocation(
        id: 'loc-5',
        name: 'Lalitpur Patan Service Station',
        code: 'LTR-01',
        city: 'Lalitpur',
        address: 'Jhamsikhel Road, Lalitpur-3, Bagmati',
        phone: '+977 1-5542899',
        activeVehiclesCount: 5,
      ),
    ];
  }

  Future<VehicleLocation> saveLocation(VehicleLocation location, {bool isEditing = false}) async {
    try {
      VehicleLocation saved;
      if (isEditing && location.id.isNotEmpty && !location.id.startsWith('loc-')) {
        saved = await _repo.updateLocation(location);
      } else {
        saved = await _repo.createLocation(location);
      }

      final idx = _locations.indexWhere((l) => l.id == (isEditing ? location.id : saved.id));
      if (idx >= 0) {
        _locations[idx] = saved;
      } else {
        _locations.add(saved);
      }
      notifyListeners();
      return saved;
    } catch (e) {
      if (isEditing) {
        final idx = _locations.indexWhere((l) => l.id == location.id);
        if (idx >= 0) _locations[idx] = location;
      } else {
        _locations.add(location);
      }
      notifyListeners();
      return location;
    }
  }

  Future<bool> deleteLocation(String id) async {
    try {
      await _repo.deleteLocation(id);
    } catch (_) {}
    _locations.removeWhere((l) => l.id == id);
    notifyListeners();
    return true;
  }
}
