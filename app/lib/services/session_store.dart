import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/customer.dart';
import '../models/warehouse_address.dart';

/// Keeps the login token plus a copy of the customer's details and addresses on the device,
/// so the warehouse address opens instantly and still shows without a connection.
class SessionStore {
  SessionStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _tokenKey = 'token';
  static const _customerKey = 'customer';
  static const _addressesKey = 'warehouse_addresses';

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<Customer?> readCustomer() async {
    final raw = await _storage.read(key: _customerKey);
    if (raw == null) return null;
    try {
      return Customer.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<List<WarehouseAddress>?> readAddresses() async {
    final raw = await _storage.read(key: _addressesKey);
    if (raw == null) return null;
    try {
      return (jsonDecode(raw) as List).map((e) => WarehouseAddress.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> saveSession(String token, Customer customer) async {
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _customerKey, value: jsonEncode(customer.toJson()));
  }

  Future<void> saveCustomer(Customer customer) =>
      _storage.write(key: _customerKey, value: jsonEncode(customer.toJson()));

  Future<void> saveAddresses(List<WarehouseAddress> addresses) =>
      _storage.write(key: _addressesKey, value: jsonEncode(addresses.map((a) => a.toJson()).toList()));

  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _customerKey);
    await _storage.delete(key: _addressesKey);
  }
}
