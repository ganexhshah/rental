import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/customer_model.dart';
import '../models/booking_model.dart';

class CustomerRepository {
  final ApiClient _client = ApiClient();

  Future<List<Customer>> fetchCustomers({String? search}) async {
    final queryParams = <String, dynamic>{};
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    final response = await _client.get(
      ApiEndpoints.customers,
      queryParams: queryParams.isNotEmpty ? queryParams : null,
    );

    if (response is List) {
      return response.map((json) => Customer.fromJson(json)).toList();
    }
    return [];
  }

  Future<Customer> fetchCustomerDetail(String id) async {
    final response = await _client.get(ApiEndpoints.customerDetail(id));
    return Customer.fromJson(response);
  }

  Future<List<CustomerDocument>> fetchCustomerDocuments(String customerId) async {
    try {
      final response = await _client.get(ApiEndpoints.customerDocuments(customerId));
      if (response is List) {
        return response.map((json) => CustomerDocument.fromJson(json)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<Booking>> fetchCustomerRentals(String customerId) async {
    try {
      final response = await _client.get(
        ApiEndpoints.bookings,
        queryParams: {'customer_id': customerId},
      );
      if (response is List) {
        return response.map((json) => Booking.fromJson(json)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<Customer> createCustomer(Map<String, dynamic> data) async {
    final response = await _client.post(
      ApiEndpoints.customers,
      body: data,
    );
    return Customer.fromJson(response);
  }
}
