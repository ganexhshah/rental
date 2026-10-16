import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';
import 'api_exception.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  String _baseUrl = AppConstants.defaultBaseUrl;
  String? _token;
  String? _refreshToken;
  String _tenantId = AppConstants.defaultTenantId;
  VoidCallback? onSessionExpired;

  String get baseUrl => _baseUrl;
  String? get token => _token;
  String get tenantId => _tenantId;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(AppConstants.keyAuthToken);
    _refreshToken = prefs.getString(AppConstants.keyRefreshToken);
    _baseUrl = prefs.getString(AppConstants.keyBaseUrl) ?? AppConstants.defaultBaseUrl;
  }

  void setBaseUrl(String url) {
    _baseUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString(AppConstants.keyBaseUrl, _baseUrl);
    });
  }

  void setAuth({
    required String token,
    String? refreshToken,
    String? tenantId,
  }) {
    _token = token;
    if (refreshToken != null) _refreshToken = refreshToken;
    if (tenantId != null) _tenantId = tenantId;

    SharedPreferences.getInstance().then((prefs) {
      prefs.setString(AppConstants.keyAuthToken, token);
      if (refreshToken != null) {
        prefs.setString(AppConstants.keyRefreshToken, refreshToken);
      }
    });
  }

  void clearAuth() {
    _token = null;
    _refreshToken = null;
    SharedPreferences.getInstance().then((prefs) {
      prefs.remove(AppConstants.keyAuthToken);
      prefs.remove(AppConstants.keyRefreshToken);
      prefs.remove(AppConstants.keyUserData);
    });
  }

  Map<String, String> _buildHeaders([Map<String, String>? extra]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    if (extra != null) {
      headers.addAll(extra);
    }
    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '$_baseUrl$cleanPath';

    if (queryParams != null && queryParams.isNotEmpty) {
      final sanitized = queryParams.map(
        (key, value) => MapEntry(key, value.toString()),
      );
      return Uri.parse(fullUrl).replace(queryParameters: sanitized);
    }
    return Uri.parse(fullUrl);
  }

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
  }) async {
    final uri = _buildUri(path, queryParams);
    try {
      final response = await http
          .get(uri, headers: _buildHeaders(headers))
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } on SocketException catch (e) {
      throw ApiException(
        message: 'Unable to connect to server: ${e.message}',
        code: 'NETWORK_ERROR',
      );
    } on TimeoutException {
      throw ApiException(
        message: 'Request timed out. Please check connection.',
        code: 'TIMEOUT',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: e.toString(), code: 'UNKNOWN_ERROR');
    }
  }

  Future<dynamic> post(
    String path, {
    dynamic body,
    Map<String, String>? headers,
  }) async {
    final uri = _buildUri(path);
    try {
      final response = await http
          .post(
            uri,
            headers: _buildHeaders(headers),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 20));
      return _handleResponse(response);
    } on SocketException catch (e) {
      throw ApiException(
        message: 'Unable to connect to server: ${e.message}',
        code: 'NETWORK_ERROR',
      );
    } on TimeoutException {
      throw ApiException(
        message: 'Request timed out. Please check connection.',
        code: 'TIMEOUT',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: e.toString(), code: 'UNKNOWN_ERROR');
    }
  }

  Future<dynamic> patch(
    String path, {
    dynamic body,
    Map<String, String>? headers,
  }) async {
    final uri = _buildUri(path);
    try {
      final response = await http
          .patch(
            uri,
            headers: _buildHeaders(headers),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 20));
      return _handleResponse(response);
    } on SocketException catch (e) {
      throw ApiException(
        message: 'Unable to connect to server: ${e.message}',
        code: 'NETWORK_ERROR',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: e.toString(), code: 'UNKNOWN_ERROR');
    }
  }

  Future<dynamic> delete(
    String path, {
    Map<String, String>? headers,
  }) async {
    final uri = _buildUri(path);
    try {
      final response = await http
          .delete(uri, headers: _buildHeaders(headers))
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: e.toString(), code: 'UNKNOWN_ERROR');
    }
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode == 401) {
      onSessionExpired?.call();
      throw ApiException(
        message: 'Session expired. Please log in again.',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      );
    }

    dynamic decodedBody;
    try {
      decodedBody = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (_) {
      decodedBody = response.body;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (decodedBody is Map<String, dynamic> && decodedBody.containsKey('data')) {
        return decodedBody['data'];
      }
      return decodedBody;
    }

    String errorMessage = 'Request failed';
    String? errorCode;
    dynamic details;

    if (decodedBody is Map<String, dynamic>) {
      if (decodedBody.containsKey('error')) {
        final err = decodedBody['error'];
        if (err is Map<String, dynamic>) {
          errorMessage = err['message'] ?? errorMessage;
          errorCode = err['code'];
          details = err['details'];
        } else if (err is String) {
          errorMessage = err;
        }
      } else if (decodedBody.containsKey('message')) {
        errorMessage = decodedBody['message'];
      }
    }

    throw ApiException(
      message: errorMessage,
      statusCode: response.statusCode,
      code: errorCode,
      details: details,
    );
  }
}

typedef VoidCallback = void Function();
