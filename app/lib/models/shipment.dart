/// The journey every shipment follows, in order. Matches STAGES in backend/src/services/shipments.js.
class ShipmentStage {
  const ShipmentStage(this.status, this.label, this.shortLabel);

  final String status;
  final String label;
  final String shortLabel;

  static const all = [
    ShipmentStage('received', 'Received at China warehouse', 'Received'),
    ShipmentStage('departed', 'Departed China', 'Departed'),
    ShipmentStage('in_transit', 'In transit', 'In transit'),
    ShipmentStage('arrived', 'Arrived at destination', 'Arrived'),
    ShipmentStage('ready_for_pickup', 'Ready for pickup', 'Ready'),
    ShipmentStage('delivered', 'Delivered', 'Delivered'),
  ];
}

class ShipmentEvent {
  const ShipmentEvent({
    required this.status,
    required this.statusLabel,
    required this.occurredAt,
    this.note,
    this.location,
  });

  final String status;
  final String statusLabel;
  final DateTime occurredAt;
  final String? note;
  final String? location;

  factory ShipmentEvent.fromJson(Map<String, dynamic> json) => ShipmentEvent(
        status: json['status'] as String,
        statusLabel: json['statusLabel'] as String,
        occurredAt: DateTime.parse(json['occurredAt'] as String),
        note: json['note'] as String?,
        location: json['location'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'status': status,
        'statusLabel': statusLabel,
        'occurredAt': occurredAt.toIso8601String(),
        'note': note,
        'location': location,
      };
}

class Shipment {
  const Shipment({
    required this.trackingNumber,
    required this.shippingMethod,
    required this.description,
    required this.status,
    required this.statusLabel,
    required this.progressStep,
    required this.createdAt,
    required this.updatedAt,
    this.packages,
    this.weightKg,
    this.volumeCbm,
    this.supplierTracking,
    this.estimatedArrival,
    this.events,
  });

  final String trackingNumber;

  /// 'air' or 'sea'
  final String shippingMethod;
  final String description;
  final String status;
  final String statusLabel;

  /// Index into [ShipmentStage.all] of the furthest stage reached. Stays put while on hold.
  final int progressStep;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int? packages;
  final double? weightKg;
  final double? volumeCbm;
  final String? supplierTracking;

  /// Date only, from the server as 2026-11-30.
  final DateTime? estimatedArrival;

  /// Tracking history, newest first. Only present on the detail endpoint.
  final List<ShipmentEvent>? events;

  bool get isDelivered => status == 'delivered';
  bool get isOnHold => status == 'on_hold';
  String get methodName => shippingMethod == 'sea' ? 'Sea freight' : 'Air freight';
  String get title => description.isEmpty ? 'Shipment $trackingNumber' : description;

  String? get weightText => weightKg == null ? null : '${_trim(weightKg!)} kg';
  String? get volumeText => volumeCbm == null ? null : '${_trim(volumeCbm!)} CBM';

  /// "3 packages · 42.5 kg · 0.35 CBM"
  String get measurements => [
        if (packages != null) '$packages ${packages == 1 ? 'package' : 'packages'}',
        if (weightText != null) weightText!,
        if (volumeText != null) volumeText!,
      ].join(' · ');

  static String _trim(double n) => n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toString();

  static double? _toDouble(Object? v) => v == null ? null : (v as num).toDouble();

  factory Shipment.fromJson(Map<String, dynamic> json) => Shipment(
        trackingNumber: json['trackingNumber'] as String,
        shippingMethod: json['shippingMethod'] as String,
        description: json['description'] as String? ?? '',
        status: json['status'] as String,
        statusLabel: json['statusLabel'] as String,
        progressStep: (json['progressStep'] as num?)?.toInt() ?? 0,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        packages: (json['packages'] as num?)?.toInt(),
        weightKg: _toDouble(json['weightKg']),
        volumeCbm: _toDouble(json['volumeCbm']),
        supplierTracking: json['supplierTracking'] as String?,
        estimatedArrival: json['estimatedArrival'] == null ? null : DateTime.parse(json['estimatedArrival'] as String),
        events: (json['events'] as List?)?.map((e) => ShipmentEvent.fromJson(e as Map<String, dynamic>)).toList(),
      );

  Map<String, dynamic> toJson() => {
        'trackingNumber': trackingNumber,
        'shippingMethod': shippingMethod,
        'description': description,
        'status': status,
        'statusLabel': statusLabel,
        'progressStep': progressStep,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'packages': packages,
        'weightKg': weightKg,
        'volumeCbm': volumeCbm,
        'supplierTracking': supplierTracking,
        'estimatedArrival': estimatedArrival?.toIso8601String().substring(0, 10),
        if (events != null) 'events': events!.map((e) => e.toJson()).toList(),
      };
}
