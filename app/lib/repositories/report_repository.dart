import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/report_model.dart';

class ReportRepository {
  final ApiClient _client = ApiClient();

  Future<DashboardSummary> fetchDashboardSummary() async {
    final response = await _client.get(ApiEndpoints.dashboardSummary);
    if (response is Map<String, dynamic>) {
      return DashboardSummary.fromJson(response);
    }
    return DashboardSummary();
  }
}
