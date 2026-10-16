import 'package:flutter/material.dart';
import '../models/report_model.dart';
import '../repositories/report_repository.dart';

class ReportProvider extends ChangeNotifier {
  final ReportRepository _repo = ReportRepository();

  bool _isLoading = false;
  DashboardSummary _summary = DashboardSummary();
  String? _errorMessage;

  bool get isLoading => _isLoading;
  DashboardSummary get summary => _summary;
  String? get errorMessage => _errorMessage;

  Future<void> loadDashboardMetrics({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      _summary = await _repo.fetchDashboardSummary();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }
}
