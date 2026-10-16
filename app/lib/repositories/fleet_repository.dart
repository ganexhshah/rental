import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/vehicle_model.dart';
import '../models/maintenance_model.dart';

class FleetRepository {
  final ApiClient _client = ApiClient();

  Future<List<Vehicle>> fetchVehicles({
    String? status,
    String? categoryId,
  }) async {
    final queryParams = <String, dynamic>{};
    if (status != null && status != 'all') {
      queryParams['status'] = status;
    }
    if (categoryId != null) {
      queryParams['category_id'] = categoryId;
    }

    final response = await _client.get(
      ApiEndpoints.vehicles,
      queryParams: queryParams.isNotEmpty ? queryParams : null,
    );

    if (response is List) {
      return response.map((json) => Vehicle.fromJson(json)).toList();
    }
    return [];
  }

  Future<Vehicle> fetchVehicleDetail(String id) async {
    final response = await _client.get(ApiEndpoints.vehicleDetail(id));
    return Vehicle.fromJson(response);
  }

  Future<Vehicle> createVehicle(Map<String, dynamic> data) async {
    final response = await _client.post(ApiEndpoints.vehicles, body: data);
    return Vehicle.fromJson(response);
  }

  Future<Vehicle> updateVehicle(String id, Map<String, dynamic> data) async {
    final response = await _client.patch(ApiEndpoints.vehicleDetail(id), body: data);
    return Vehicle.fromJson(response);
  }

  Future<bool> deleteVehicle(String id) async {
    await _client.delete(ApiEndpoints.vehicleDetail(id));
    return true;
  }

  Future<List<VehicleDocument>> fetchVehicleDocuments(String vehicleId) async {
    try {
      final response = await _client.get(ApiEndpoints.vehicleDocuments(vehicleId));
      if (response is List) {
        return response.map((json) => VehicleDocument.fromJson(json)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<VehicleDocument>> fetchAllDocuments({String? status, String? docType, String? vehicleId, String? search}) async {
    final query = <String, dynamic>{};
    if (status != null && status != 'all') query['status'] = status;
    if (docType != null && docType != 'all') query['doc_type'] = docType;
    if (vehicleId != null && vehicleId != 'all') query['vehicle_id'] = vehicleId;
    if (search != null && search.isNotEmpty) query['search'] = search;

    try {
      final response = await _client.get(
        ApiEndpoints.vehicleDocumentsAll,
        queryParams: query.isNotEmpty ? query : null,
      );
      if (response is List) {
        return response.map((json) => VehicleDocument.fromJson(json)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<VehicleDocument> createVehicleDocument(VehicleDocument doc) async {
    final response = await _client.post(
      ApiEndpoints.vehicleDocumentsAll,
      body: doc.toJson(),
    );
    return VehicleDocument.fromJson(response);
  }

  Future<VehicleDocument> updateVehicleDocument(String docId, Map<String, dynamic> data) async {
    final response = await _client.patch(
      '${ApiEndpoints.vehicleDocumentsAll}/$docId',
      body: data,
    );
    return VehicleDocument.fromJson(response);
  }

  Future<VehicleDocument> verifyVehicleDocument(String docId, {required String status, String? notes}) async {
    final response = await _client.post(
      '${ApiEndpoints.vehicleDocumentsAll}/$docId/verify',
      body: {
        'verification_status': status,
        if (notes != null) 'auditor_notes': notes,
      },
    );
    return VehicleDocument.fromJson(response);
  }

  Future<bool> deleteVehicleDocument(String docId) async {
    await _client.delete('${ApiEndpoints.vehicleDocumentsAll}/$docId');
    return true;
  }

  Future<List<MaintenanceTask>> fetchVehicleMaintenance(String vehicleId) async {
    try {
      final response = await _client.get(ApiEndpoints.vehicleMaintenance(vehicleId));
      if (response is List) {
        return response.map((json) => MaintenanceTask.fromJson(json)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<bool> checkAvailability(String vehicleId, DateTime start, DateTime end) async {
    try {
      final response = await _client.get(
        ApiEndpoints.vehicleAvailability,
        queryParams: {
          'vehicle_id': vehicleId,
          'start_date': start.toIso8601String(),
          'end_date': end.toIso8601String(),
        },
      );
      if (response is Map<String, dynamic>) {
        return response['is_available'] ?? true;
      }
      return true;
    } catch (_) {
      return true;
    }
  }

  Future<List<VehicleCategory>> fetchCategories() async {
    final response = await _client.get(ApiEndpoints.vehicleCategories);
    if (response is List) {
      return response.map((json) => VehicleCategory.fromJson(json)).toList();
    }
    return [];
  }

  Future<VehicleCategory> createCategory(VehicleCategory category) async {
    final response = await _client.post(
      ApiEndpoints.vehicleCategories,
      body: category.toJson(),
    );
    return VehicleCategory.fromJson(response);
  }

  Future<VehicleCategory> updateCategory(VehicleCategory category) async {
    final response = await _client.patch(
      ApiEndpoints.vehicleCategoryDetail(category.id),
      body: category.toJson(),
    );
    return VehicleCategory.fromJson(response);
  }

  Future<bool> deleteCategory(String id) async {
    final response = await _client.delete(ApiEndpoints.vehicleCategoryDetail(id));
    if (response is Map<String, dynamic> && response['success'] == true) {
      return true;
    }
    return true;
  }

  // --- Locations ---

  Future<List<VehicleLocation>> fetchLocations() async {
    try {
      final response = await _client.get(ApiEndpoints.vehicleLocations);
      if (response is List) {
        return response.map((json) => VehicleLocation.fromJson(json)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<VehicleLocation> createLocation(VehicleLocation location) async {
    final response = await _client.post(
      ApiEndpoints.vehicleLocations,
      body: location.toJson(),
    );
    return VehicleLocation.fromJson(response);
  }

  Future<VehicleLocation> updateLocation(VehicleLocation location) async {
    final response = await _client.patch(
      ApiEndpoints.vehicleLocationDetail(location.id),
      body: location.toJson(),
    );
    return VehicleLocation.fromJson(response);
  }

  Future<bool> deleteLocation(String id) async {
    await _client.delete(ApiEndpoints.vehicleLocationDetail(id));
    return true;
  }
}
