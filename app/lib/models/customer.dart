class Customer {
  const Customer({
    required this.customerId,
    required this.shippingMark,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.deliveryDestination,
    required this.preferredShippingMethod,
    required this.registeredAt,
  });

  final String customerId;
  final String shippingMark;
  final String fullName;
  final String email;
  final String phone;
  final String deliveryDestination;
  final String preferredShippingMethod;
  final DateTime registeredAt;

  String get firstName => fullName.split(' ').first;

  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '';
    final first = parts.first[0];
    final last = parts.length > 1 ? parts.last[0] : '';
    return (first + last).toUpperCase();
  }

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        customerId: json['customerId'] as String,
        shippingMark: json['shippingMark'] as String,
        fullName: json['fullName'] as String,
        email: json['email'] as String,
        phone: json['phone'] as String,
        deliveryDestination: json['deliveryDestination'] as String,
        preferredShippingMethod: json['preferredShippingMethod'] as String,
        registeredAt: DateTime.parse(json['registeredAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'customerId': customerId,
        'shippingMark': shippingMark,
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'deliveryDestination': deliveryDestination,
        'preferredShippingMethod': preferredShippingMethod,
        'registeredAt': registeredAt.toIso8601String(),
      };
}
