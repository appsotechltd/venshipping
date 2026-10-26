class WarehouseAddress {
  const WarehouseAddress({
    required this.method,
    required this.label,
    required this.shippingMark,
    required this.recipient,
    required this.phone,
    required this.addressLine,
    required this.city,
    required this.province,
    required this.postalCode,
    required this.country,
    required this.transitTime,
    required this.notes,
    required this.fullText,
  });

  /// 'air' or 'sea'
  final String method;
  final String label;
  final String shippingMark;
  final String recipient;
  final String phone;
  final String addressLine;
  final String city;
  final String province;
  final String postalCode;
  final String country;
  final String? transitTime;
  final List<String> notes;

  /// Ready-to-paste address, as the backend formats it.
  final String fullText;

  String get methodName => method == 'sea' ? 'Sea freight' : 'Air freight';

  String get cityLine => '$city, $province $postalCode'.trim();

  factory WarehouseAddress.fromJson(Map<String, dynamic> json) => WarehouseAddress(
        method: json['method'] as String,
        label: json['label'] as String,
        shippingMark: json['shippingMark'] as String,
        recipient: json['recipient'] as String,
        phone: json['phone'] as String,
        addressLine: json['addressLine'] as String,
        city: json['city'] as String,
        province: json['province'] as String,
        postalCode: json['postalCode'] as String,
        country: json['country'] as String,
        transitTime: json['transitTime'] as String?,
        notes: (json['notes'] as List? ?? const []).cast<String>(),
        fullText: json['fullText'] as String,
      );

  Map<String, dynamic> toJson() => {
        'method': method,
        'label': label,
        'shippingMark': shippingMark,
        'recipient': recipient,
        'phone': phone,
        'addressLine': addressLine,
        'city': city,
        'province': province,
        'postalCode': postalCode,
        'country': country,
        'transitTime': transitTime,
        'notes': notes,
        'fullText': fullText,
      };
}

class ShippingInstructions {
  const ShippingInstructions({required this.steps, required this.supportEmail, this.supportPhone});

  final List<String> steps;
  final String supportEmail;
  final String? supportPhone;

  factory ShippingInstructions.fromJson(Map<String, dynamic> json) {
    final support = json['support'] as Map<String, dynamic>? ?? const {};
    return ShippingInstructions(
      steps: (json['steps'] as List? ?? const []).cast<String>(),
      supportEmail: support['email'] as String? ?? '',
      supportPhone: support['phone'] as String?,
    );
  }
}
