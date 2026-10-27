import 'package:flutter_test/flutter_test.dart';
import 'package:ven_shipping/models/customer.dart';
import 'package:ven_shipping/models/warehouse_address.dart';

void main() {
  test('parses a customer from the API', () {
    final customer = Customer.fromJson({
      'customerId': 'FWB2423-0001',
      'shippingMark': 'FWB2423-0001 (VEN SHIPPING)',
      'fullName': 'Ama Kofi Mensah',
      'email': 'ama@example.com',
      'phone': '+233 20 123 4567',
      'deliveryDestination': 'Accra, Ghana',
      'preferredShippingMethod': 'sea',
      'registeredAt': '2026-10-26T21:00:00.000Z',
    });
    expect(customer.firstName, 'Ama');
    expect(customer.initials, 'AM');
    expect(Customer.fromJson(customer.toJson()).customerId, 'FWB2423-0001');
  });

  test('parses a warehouse address from the API', () {
    final address = WarehouseAddress.fromJson({
      'method': 'air',
      'label': 'Air Freight Warehouse',
      'shippingMark': 'FWB2423-0001 (VEN SHIPPING)',
      'recipient': 'FWB2423-0001 (VEN SHIPPING)',
      'phone': '+86 000',
      'addressLine': 'Room 1 (FWB2423-0001 (VEN SHIPPING))',
      'city': 'Guangzhou',
      'province': 'Guangdong',
      'postalCode': '510000',
      'country': 'China',
      'transitTime': '7 to 14 days',
      'notes': ['note'],
      'fullText': 'Recipient: FWB2423-0001 (VEN SHIPPING)',
    });
    expect(address.methodName, 'Air freight');
    expect(address.cityLine, 'Guangzhou, Guangdong 510000');
    expect(WarehouseAddress.fromJson(address.toJson()).notes, ['note']);
  });
}
