import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/payment_model.dart';

class PaymentRepository {
  final ApiClient _client = ApiClient();

  Future<List<PaymentTransaction>> fetchPayments() async {
    final response = await _client.get(ApiEndpoints.payments);
    if (response is List) {
      return response.map((json) => PaymentTransaction.fromJson(json)).toList();
    }
    return [];
  }

  Future<List<DepositRecord>> fetchDeposits() async {
    final response = await _client.get(ApiEndpoints.deposits);
    if (response is List) {
      return response.map((json) => DepositRecord.fromJson(json)).toList();
    }
    return [];
  }

  Future<List<Invoice>> fetchInvoices() async {
    final response = await _client.get(ApiEndpoints.invoices);
    if (response is List) {
      return response.map((json) => Invoice.fromJson(json)).toList();
    }
    return [];
  }

  Future<void> recordPayment({
    required String bookingId,
    required double amount,
    required String method,
    String? category,
    String? notes,
  }) async {
    await _client.post(
      ApiEndpoints.payments,
      body: {
        'booking_id': bookingId,
        'amount': amount,
        'method': method,
        'category': category ?? 'rental',
        'notes': notes ?? '',
      },
    );
  }
}
