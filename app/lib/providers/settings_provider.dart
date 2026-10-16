import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/settings_model.dart';

class SettingsProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  CompanySettingsModel _settings = CompanySettingsModel(
    companyName: 'Himalayan Rides',
    legalBusinessName: 'Himalayan Rides Pvt. Ltd.',
    email: 'contact@himalayanrides.com',
    phone: '+977-1-4422331',
    address: 'Thamel Marg, Kathmandu, Nepal',
    panVatNumber: '609823145',
    currency: 'NPR',
    currencySymbol: 'Rs.',
    fuelPolicy: 'same_to_same',
    lateFeePerHour: 250,
    securityDepositDefault: 5000,
    minDriverAge: 21,
    enableOnlineBooking: true,
    requireKycBeforePickup: true,
  );

  List<BranchLocationModel> _locations = [];
  bool _isLoading = false;

  CompanySettingsModel get settings => _settings;
  List<BranchLocationModel> get locations => _locations;
  bool get isLoading => _isLoading;

  Future<void> fetchSettings({bool forceRefresh = false}) async {
    if (_locations.isNotEmpty && !forceRefresh) return;
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _apiClient.get(ApiEndpoints.settings);
      if (res is Map<String, dynamic>) {
        _settings = CompanySettingsModel.fromJson(res);
      }
    } catch (_) {}

    _locations = [
      BranchLocationModel(
        id: 'loc-01',
        name: 'Kathmandu Central - Thamel',
        address: 'Z-Street, Thamel, Kathmandu',
        phone: '+977-1-4422331',
        isAirportHub: false,
        activeVehicles: 18,
      ),
      BranchLocationModel(
        id: 'loc-02',
        name: 'Tribhuvan International Airport (TIA) Counter',
        address: 'Arrival Terminal Exit Gate, Ring Road',
        phone: '+977-1-4477889',
        isAirportHub: true,
        activeVehicles: 8,
      ),
      BranchLocationModel(
        id: 'loc-03',
        name: 'Pokhara Lakeside Branch',
        address: 'Lakeside-6, Baidam, Pokhara',
        phone: '+977-61-532144',
        isAirportHub: false,
        activeVehicles: 12,
      ),
    ];

    _isLoading = false;
    notifyListeners();
  }

  void updateCompanyInfo({
    required String name,
    required String phone,
    required String email,
    required String address,
    required String panVat,
  }) {
    _settings = CompanySettingsModel(
      companyName: name,
      legalBusinessName: _settings.legalBusinessName,
      email: email,
      phone: phone,
      address: address,
      panVatNumber: panVat,
      currency: _settings.currency,
      currencySymbol: _settings.currencySymbol,
      fuelPolicy: _settings.fuelPolicy,
      lateFeePerHour: _settings.lateFeePerHour,
      securityDepositDefault: _settings.securityDepositDefault,
      minDriverAge: _settings.minDriverAge,
      enableOnlineBooking: _settings.enableOnlineBooking,
      requireKycBeforePickup: _settings.requireKycBeforePickup,
    );
    notifyListeners();
  }

  void updateRentalRules({
    required String fuelPolicy,
    required double lateFee,
    required double deposit,
    required int minAge,
    required bool requireKyc,
    required bool onlineBooking,
  }) {
    _settings = CompanySettingsModel(
      companyName: _settings.companyName,
      legalBusinessName: _settings.legalBusinessName,
      email: _settings.email,
      phone: _settings.phone,
      address: _settings.address,
      panVatNumber: _settings.panVatNumber,
      currency: _settings.currency,
      currencySymbol: _settings.currencySymbol,
      fuelPolicy: fuelPolicy,
      lateFeePerHour: lateFee,
      securityDepositDefault: deposit,
      minDriverAge: minAge,
      enableOnlineBooking: onlineBooking,
      requireKycBeforePickup: requireKyc,
    );
    notifyListeners();
  }
}
