import 'dart:io';
import 'package:flutter/material.dart';
import '../core/api/api_exception.dart';
import '../models/booking_model.dart';
import '../repositories/booking_repository.dart';

enum BookingLoadingState { initial, loading, loaded, error }

class BookingProvider extends ChangeNotifier {
  final BookingRepository _repo = BookingRepository();

  BookingLoadingState _state = BookingLoadingState.initial;
  List<Booking> _bookings = [];
  OperationsSummary _operationsSummary = OperationsSummary();
  Booking? _selectedBooking;
  List<Booking> _activeRentals = [];
  String _filterStatus = 'all';
  String? _filterPaymentStatus;
  String _searchQuery = '';
  String? _errorMessage;
  bool _isOfflineMode = false;

  BookingLoadingState get state => _state;
  bool get isLoading => _state == BookingLoadingState.loading;
  List<Booking> get bookings => _bookings;
  OperationsSummary get operationsSummary => _operationsSummary;
  Booking? get selectedBooking => _selectedBooking;
  List<Booking> get activeRentals => _activeRentals;
  String get filterStatus => _filterStatus;
  String? get filterPaymentStatus => _filterPaymentStatus;
  String get searchQuery => _searchQuery;
  String? get errorMessage => _errorMessage;
  bool get isOfflineMode => _isOfflineMode;

  Future<void> loadBookings({bool silent = false}) async {
    if (!silent) {
      _state = BookingLoadingState.loading;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final results = await Future.wait([
        _repo.fetchBookings(status: _filterStatus, search: _searchQuery),
        _repo.fetchOperationsSummary(),
      ]);

      _bookings = results[0] as List<Booking>;
      _operationsSummary = results[1] as OperationsSummary;
      _state = BookingLoadingState.loaded;
      _isOfflineMode = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      _state = BookingLoadingState.loaded;
      if (e is SocketException || (e is ApiException && (e.code == 'NETWORK_ERROR' || e.code == 'TIMEOUT'))) {
        _isOfflineMode = true;
      } else {
        _isOfflineMode = false;
      }
      notifyListeners();
    }
  }

  void setFilterStatus(String status, [String? paymentStatus]) {
    _filterStatus = status;
    _filterPaymentStatus = paymentStatus;
    loadBookings();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    loadBookings();
  }

  void resetFilters() {
    _filterStatus = 'all';
    _filterPaymentStatus = null;
    _searchQuery = '';
    loadBookings();
  }

  Future<Booking?> loadBookingDetail(String id) async {
    try {
      final booking = await _repo.fetchBookingDetail(id);
      _selectedBooking = booking;
      notifyListeners();
      return booking;
    } catch (e) {
      // If live detail fails, return existing item from list if present
      final local = _bookings.where((b) => b.id == id).firstOrNull;
      if (local != null) {
        _selectedBooking = local;
        notifyListeners();
        return local;
      }
      return null;
    }
  }

  Future<bool> executePickup({
    required String bookingId,
    required int odometer,
    required String fuelLevel,
    String? exteriorCondition,
    String? interiorCondition,
    List<String> photos = const [],
    String? notes,
    String? signature,
  }) async {
    try {
      await _repo.pickupBooking(
        bookingId,
        odometer: odometer,
        fuelLevel: fuelLevel,
        exteriorCondition: exteriorCondition,
        interiorCondition: interiorCondition,
        photos: photos,
        notes: notes,
        customerSignature: signature,
      );
      await loadBookings(silent: true);
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> executeReturn({
    required String bookingId,
    required int odometer,
    required String fuelLevel,
    String? exteriorCondition,
    String? interiorCondition,
    List<String> photos = const [],
    String? notes,
    String? signature,
    double additionalDamages = 0.0,
    double fuelCharge = 0.0,
    String? damageDescription,
    double depositDeduction = 0.0,
    String? depositRefundNote,
  }) async {
    try {
      await _repo.returnBooking(
        bookingId,
        odometer: odometer,
        fuelLevel: fuelLevel,
        exteriorCondition: exteriorCondition,
        interiorCondition: interiorCondition,
        photos: photos,
        notes: notes,
        customerSignature: signature,
        additionalDamages: additionalDamages,
        fuelCharge: fuelCharge,
        damageDescription: damageDescription,
        depositDeduction: depositDeduction,
        depositRefundNote: depositRefundNote,
      );
      await loadBookings(silent: true);
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> confirmBooking(String id) async {
    try {
      await _repo.confirmBooking(id);
      await loadBookings(silent: true);
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> cancelBooking(String id, {required String reason}) async {
    try {
      await _repo.cancelBooking(id, reason: reason);
      await loadBookings(silent: true);
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<Booking?> createBooking(Map<String, dynamic> payload) async {
    try {
      final b = await _repo.createBooking(payload);
      await loadBookings(silent: true);
      return b;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return null;
    }
  }

  Future<bool> extendBooking(String id, {required DateTime newEndDate, double extraFee = 0.0}) async {
    try {
      await _repo.extendBooking(id, newEndDate: newEndDate, extraFee: extraFee);
      await loadBookings(silent: true);
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> pickupBooking(
    String bookingId, {
    required int odometer,
    required String fuelLevel,
    String? exteriorCondition,
    String? interiorCondition,
    List<String> photos = const [],
    String? notes,
    String? signature,
  }) => executePickup(
    bookingId: bookingId,
    odometer: odometer,
    fuelLevel: fuelLevel,
    exteriorCondition: exteriorCondition,
    interiorCondition: interiorCondition,
    photos: photos,
    notes: notes,
    signature: signature,
  );

  Future<bool> returnBooking(
    String bookingId, {
    required int odometer,
    required String fuelLevel,
    String? exteriorCondition,
    String? interiorCondition,
    List<String> photos = const [],
    String? notes,
    String? signature,
    double additionalDamages = 0.0,
    double fuelCharge = 0.0,
    String? damageDescription,
    double depositDeduction = 0.0,
    String? depositRefundNote,
  }) => executeReturn(
    bookingId: bookingId,
    odometer: odometer,
    fuelLevel: fuelLevel,
    exteriorCondition: exteriorCondition,
    interiorCondition: interiorCondition,
    photos: photos,
    notes: notes,
    signature: signature,
    additionalDamages: additionalDamages,
    fuelCharge: fuelCharge,
    damageDescription: damageDescription,
    depositDeduction: depositDeduction,
    depositRefundNote: depositRefundNote,
  );
}
