import 'package:flutter/material.dart';
import '../models/payment_model.dart';
import '../repositories/payment_repository.dart';

class PaymentProvider extends ChangeNotifier {
  final PaymentRepository _repo = PaymentRepository();

  bool _isLoading = false;
  List<PaymentTransaction> _payments = [];
  List<DepositRecord> _deposits = [];
  List<Invoice> _invoices = [];
  String? _errorMessage;

  bool get isLoading => _isLoading;
  List<PaymentTransaction> get payments => _payments;
  List<DepositRecord> get deposits => _deposits;
  List<Invoice> get invoices => _invoices;
  String? get errorMessage => _errorMessage;

  double get totalRevenue => _payments
      .where((p) => p.status == 'completed' || p.status == 'paid')
      .fold(0.0, (sum, p) => sum + p.amount);

  double get depositsHeld => _deposits
      .where((d) => d.status == 'held')
      .fold(0.0, (sum, d) => sum + d.amount);

  Future<void> loadFinancials({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final results = await Future.wait([
        _repo.fetchPayments(),
        _repo.fetchDeposits(),
        _repo.fetchInvoices(),
      ]);

      _payments = results[0] as List<PaymentTransaction>;
      _deposits = results[1] as List<DepositRecord>;
      _invoices = results[2] as List<Invoice>;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> recordPayment({
    required String bookingId,
    required double amount,
    required String method,
    String? category,
    String? notes,
  }) async {
    try {
      await _repo.recordPayment(
        bookingId: bookingId,
        amount: amount,
        method: method,
        category: category,
        notes: notes,
      );
      await loadFinancials(silent: true);
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }
}
