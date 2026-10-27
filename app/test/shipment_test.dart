import 'package:flutter_test/flutter_test.dart';
import 'package:ven_shipping/models/shipment.dart';

void main() {
  final json = {
    'trackingNumber': 'VEN-100001',
    'shippingMethod': 'sea',
    'description': '3 cartons of shoes',
    'packages': 3,
    'weightKg': 42.5,
    'volumeCbm': 0.35,
    'supplierTracking': null,
    'status': 'on_hold',
    'statusLabel': 'On hold',
    'progressStep': 1,
    'isDelivered': false,
    'estimatedArrival': '2026-12-02',
    'createdAt': '2026-10-26T21:00:00.000Z',
    'updatedAt': '2026-10-27T09:30:00.000Z',
    'events': [
      {'status': 'on_hold', 'statusLabel': 'On hold', 'note': 'Customs inspection', 'location': null, 'occurredAt': '2026-10-27T09:30:00.000Z'},
      {'status': 'departed', 'statusLabel': 'Departed China', 'note': null, 'location': 'Nansha port', 'occurredAt': '2026-10-26T22:00:00.000Z'},
    ],
  };

  test('parses a shipment with its timeline from the API', () {
    final s = Shipment.fromJson(json);
    expect(s.isOnHold, isTrue);
    expect(s.isDelivered, isFalse);
    expect(s.progressStep, 1);
    expect(s.methodName, 'Sea freight');
    expect(s.measurements, '3 packages · 42.5 kg · 0.35 CBM');
    expect(s.estimatedArrival, DateTime(2026, 12, 2));
    expect(s.events!.first.note, 'Customs inspection');
    expect(s.events!.last.location, 'Nansha port');
  });

  test('round-trips through the device cache', () {
    final s = Shipment.fromJson(Shipment.fromJson(json).toJson());
    expect(s.trackingNumber, 'VEN-100001');
    expect(s.estimatedArrival, DateTime(2026, 12, 2));
    expect(s.events!.length, 2);
  });

  test('handles whole numbers and missing details', () {
    final s = Shipment.fromJson({...json, 'description': '', 'weightKg': 6, 'volumeCbm': null, 'packages': 1, 'events': null});
    expect(s.title, 'Shipment VEN-100001');
    expect(s.measurements, '1 package · 6 kg');
    expect(s.events, isNull);
  });

  test('stages run from China warehouse to delivered', () {
    expect(ShipmentStage.all.first.status, 'received');
    expect(ShipmentStage.all.last.status, 'delivered');
  });
}
