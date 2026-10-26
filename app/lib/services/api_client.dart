import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/customer.dart';
import '../models/warehouse_address.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.fields = const {}});

  final String message;
  final int? statusCode;

  /// Per-field messages from the server, keyed by request field name (e.g. 'email').
  final Map<String, String> fields;

  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() => message;
}

class AuthResult {
  const AuthResult({required this.token, required this.customer, this.addresses});

  final String token;
  final Customer customer;
  final List<WarehouseAddress>? addresses;
}

class RegistrationRequest {
  const RegistrationRequest({
    required this.fullName,
    required this.email,
    required this.phone,
    required this.password,
    required this.deliveryDestination,
    required this.preferredShippingMethod,
  });

  final String fullName;
  final String email;
  final String phone;
  final String password;
  final String deliveryDestination;
  final String preferredShippingMethod;

  Map<String, dynamic> toJson() => {
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'password': password,
        'deliveryDestination': deliveryDestination,
        'preferredShippingMethod': preferredShippingMethod,
      };
}

class ApiClient {
  ApiClient({http.Client? client, this.baseUrl = apiBaseUrl}) : _client = client ?? http.Client();

  final http.Client _client;
  final String baseUrl;

  Future<AuthResult> register(RegistrationRequest request) async {
    final json = await _send('POST', '/api/auth/register', body: request.toJson());
    return AuthResult(
      token: json['token'] as String,
      customer: Customer.fromJson(json['customer'] as Map<String, dynamic>),
      addresses: _addresses(json),
    );
  }

  Future<AuthResult> login(String email, String password) async {
    final json = await _send('POST', '/api/auth/login', body: {'email': email, 'password': password});
    return AuthResult(
      token: json['token'] as String,
      customer: Customer.fromJson(json['customer'] as Map<String, dynamic>),
    );
  }

  Future<Customer> me(String token) async {
    final json = await _send('GET', '/api/me', token: token);
    return Customer.fromJson(json['customer'] as Map<String, dynamic>);
  }

  Future<List<WarehouseAddress>> warehouseAddresses(String token) async {
    final json = await _send('GET', '/api/me/warehouse-addresses', token: token);
    return _addresses(json)!;
  }

  Future<ShippingInstructions> shippingInstructions() async {
    final json = await _send('GET', '/api/shipping-instructions');
    return ShippingInstructions.fromJson(json);
  }

  List<WarehouseAddress>? _addresses(Map<String, dynamic> json) {
    final list = json['warehouseAddresses'] as List?;
    return list?.map((e) => WarehouseAddress.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> _send(String method, String path, {Map<String, dynamic>? body, String? token}) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'));
    request.headers['Accept'] = 'application/json';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    if (token != null) request.headers['Authorization'] = 'Bearer $token';

    http.Response response;
    try {
      response = await http.Response.fromStream(await _client.send(request).timeout(const Duration(seconds: 20)));
    } catch (_) {
      throw ApiException('Could not reach VEN Shipping. Check your internet connection and try again.');
    }

    Map<String, dynamic> json = const {};
    if (response.body.isNotEmpty) {
      try {
        json = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (_) {}
    }
    if (response.statusCode >= 200 && response.statusCode < 300) return json;

    final fields = (json['fields'] as Map<String, dynamic>? ?? const {}).map((k, v) => MapEntry(k, v.toString()));
    throw ApiException(
      json['error'] as String? ?? 'Something went wrong. Please try again.',
      statusCode: response.statusCode,
      fields: fields,
    );
  }
}
