import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/booking_model.dart';

class BookingRepository {
  final ApiClient _client = ApiClient();

  Future<List<Booking>> fetchBookings({
    String? status,
    String? search,
  }) async {
    final queryParams = <String, dynamic>{};
    if (status != null && status != 'all') {
      queryParams['status'] = status;
    }
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    final response = await _client.get(
      ApiEndpoints.bookings,
      queryParams: queryParams.isNotEmpty ? queryParams : null,
    );

    if (response is List) {
      return response.map((json) => Booking.fromJson(json)).toList();
    }
    return [];
  }

  Future<OperationsSummary> fetchOperationsSummary() async {
    final response = await _client.get(ApiEndpoints.bookingOperationsSummary);
    if (response is Map<String, dynamic>) {
      return OperationsSummary.fromJson(response);
    }
    return OperationsSummary();
  }

  Future<Booking> fetchBookingDetail(String id) async {
    final response = await _client.get(ApiEndpoints.bookingDetail(id));
    return Booking.fromJson(response);
  }

  Future<List<Booking>> fetchActiveRentals() async {
    final response = await _client.get(ApiEndpoints.activeRentals);
    if (response is List) {
      return response.map((json) => Booking.fromJson(json)).toList();
    }
    return [];
  }

  Future<RentalChecklist> pickupBooking(
    String id, {
    required int odometer,
    required String fuelLevel,
    String? exteriorCondition,
    String? interiorCondition,
    List<String> photos = const [],
    String? notes,
    String? customerSignature,
  }) async {
    final response = await _client.post(
      ApiEndpoints.bookingPickup(id),
      body: {
        'odometer': odometer,
        'fuel_level': fuelLevel,
        'exterior_condition': exteriorCondition ?? 'Clean and checked',
        'interior_condition': interiorCondition ?? 'Clean and checked',
        'photos': photos,
        'notes': notes ?? 'Pickup inspected and handed over',
        'customer_signature': customerSignature ?? 'signature_recorded',
      },
    );
    return RentalChecklist.fromJson(response);
  }

  Future<RentalChecklist> returnBooking(
    String id, {
    required int odometer,
    required String fuelLevel,
    String? exteriorCondition,
    String? interiorCondition,
    List<String> photos = const [],
    String? notes,
    String? customerSignature,
    double additionalDamages = 0.0,
    double fuelCharge = 0.0,
    String? damageDescription,
    double depositDeduction = 0.0,
    String? depositRefundNote,
  }) async {
    final response = await _client.post(
      ApiEndpoints.bookingReturn(id),
      body: {
        'odometer': odometer,
        'fuel_level': fuelLevel,
        'exterior_condition': exteriorCondition ?? 'Clean and checked',
        'interior_condition': interiorCondition ?? 'Clean and checked',
        'photos': photos,
        'notes': notes ?? 'Return inspection completed',
        'customer_signature': customerSignature ?? 'signature_recorded',
        'additional_damages': additionalDamages,
        'fuel_charge': fuelCharge,
        'damage_description': damageDescription ?? '',
        'deposit_deduction': depositDeduction,
        'deposit_refund_note': depositRefundNote ?? '',
      },
    );
    return RentalChecklist.fromJson(response);
  }

  Future<void> confirmBooking(String id) async {
    await _client.post(ApiEndpoints.bookingConfirm(id));
  }

  Future<void> cancelBooking(String id, {required String reason, double fee = 0.0}) async {
    await _client.post(
      ApiEndpoints.bookingCancel(id),
      body: {'reason': reason, 'fee': fee},
    );
  }

  Future<void> extendBooking(String id, {required DateTime newEndDate, double extraFee = 0.0}) async {
    await _client.post(
      ApiEndpoints.bookingExtend(id),
      body: {
        'new_end_date': newEndDate.toIso8601String(),
        'extra_fee': extraFee,
      },
    );
  }

  Future<Booking> createBooking(Map<String, dynamic> payload) async {
    final response = await _client.post(
      ApiEndpoints.bookings,
      body: payload,
    );
    return Booking.fromJson(response);
  }

  Future<List<RentalChecklist>> fetchChecklists(String id) async {
    final response = await _client.get(ApiEndpoints.bookingChecklists(id));
    if (response is List) {
      return response.map((j) => RentalChecklist.fromJson(j)).toList();
    }
    return [];
  }
}
