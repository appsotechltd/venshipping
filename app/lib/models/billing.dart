import 'package:intl/intl.dart';

/// Amounts come from the API in minor units (cents) so they add up exactly.
String formatMoney(int cents, String currency) {
  try {
    return NumberFormat.simpleCurrency(name: currency).format(cents / 100);
  } catch (_) {
    return '$currency ${(cents / 100).toStringAsFixed(2)}';
  }
}

DateTime? _date(Object? value) => value == null ? null : DateTime.parse(value as String).toLocal();

class InvoiceItem {
  const InvoiceItem({
    required this.description,
    required this.quantity,
    required this.unit,
    required this.unitPriceCents,
    required this.amountCents,
  });

  final String description;
  final num quantity;
  final String? unit;
  final int unitPriceCents;
  final int amountCents;

  String get quantityText {
    final q = quantity == quantity.roundToDouble() ? quantity.toInt().toString() : quantity.toString();
    return unit == null ? q : '$q $unit';
  }

  factory InvoiceItem.fromJson(Map<String, dynamic> json) => InvoiceItem(
        description: json['description'] as String,
        quantity: json['quantity'] as num,
        unit: json['unit'] as String?,
        unitPriceCents: json['unitPriceCents'] as int,
        amountCents: json['amountCents'] as int,
      );
}

class BillingInfo {
  const BillingInfo({required this.companyName, required this.companyAddress, required this.paymentInstructions, this.footer});

  final String companyName;
  final List<String> companyAddress;
  final List<String> paymentInstructions;
  final String? footer;

  factory BillingInfo.fromJson(Map<String, dynamic>? json) {
    final company = json?['company'] as Map<String, dynamic>? ?? const {};
    return BillingInfo(
      companyName: company['name'] as String? ?? 'VEN International Logistics Ltd',
      companyAddress: (company['addressLines'] as List? ?? const []).cast<String>(),
      paymentInstructions: (json?['paymentInstructions'] as List? ?? const []).cast<String>(),
      footer: json?['footer'] as String?,
    );
  }
}

class Invoice {
  const Invoice({
    required this.invoiceNumber,
    required this.status,
    required this.statusLabel,
    required this.overdue,
    required this.currency,
    required this.totalCents,
    required this.paidCents,
    required this.balanceCents,
    required this.issuedAt,
    required this.dueDate,
    required this.itemCount,
    this.subtotalCents,
    this.notes,
    this.items = const [],
    this.payments = const [],
    this.billing,
  });

  final String invoiceNumber;

  /// unpaid, part_paid, paid or void
  final String status;
  final String statusLabel;
  final bool overdue;
  final String currency;
  final int totalCents;
  final int paidCents;
  final int balanceCents;
  final DateTime issuedAt;
  final DateTime? dueDate;
  final int itemCount;

  // Only on the detail view.
  final int? subtotalCents;
  final String? notes;
  final List<InvoiceItem> items;
  final List<Receipt> payments;
  final BillingInfo? billing;

  bool get isOpen => status == 'unpaid' || status == 'part_paid';

  String money(int cents) => formatMoney(cents, currency);

  factory Invoice.fromJson(Map<String, dynamic> json) => Invoice(
        invoiceNumber: json['invoiceNumber'] as String,
        status: json['status'] as String,
        statusLabel: json['statusLabel'] as String,
        overdue: json['overdue'] as bool? ?? false,
        currency: json['currency'] as String,
        totalCents: json['totalCents'] as int,
        paidCents: json['paidCents'] as int,
        balanceCents: json['balanceCents'] as int,
        issuedAt: _date(json['issuedAt'])!,
        dueDate: json['dueDate'] == null ? null : DateTime.parse(json['dueDate'] as String),
        itemCount: json['itemCount'] as int? ?? 0,
        subtotalCents: json['subtotalCents'] as int?,
        notes: json['notes'] as String?,
        items: (json['items'] as List? ?? const [])
            .map((e) => InvoiceItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        payments: (json['payments'] as List? ?? const [])
            .map((e) => Receipt.fromJson(e as Map<String, dynamic>))
            .toList(),
        billing: json['billing'] == null ? null : BillingInfo.fromJson(json['billing'] as Map<String, dynamic>),
      );
}

class Receipt {
  const Receipt({
    required this.receiptNumber,
    required this.invoiceNumber,
    required this.currency,
    required this.amountCents,
    required this.method,
    required this.methodLabel,
    required this.reference,
    required this.paidAt,
    required this.invoiceTotalCents,
    required this.paidToDateCents,
    required this.balanceAfterCents,
  });

  final String receiptNumber;
  final String invoiceNumber;
  final String currency;
  final int amountCents;
  final String method;
  final String methodLabel;
  final String? reference;
  final DateTime paidAt;
  final int invoiceTotalCents;
  final int paidToDateCents;
  final int balanceAfterCents;

  bool get paidInFull => balanceAfterCents == 0;

  String money(int cents) => formatMoney(cents, currency);

  factory Receipt.fromJson(Map<String, dynamic> json) => Receipt(
        receiptNumber: json['receiptNumber'] as String,
        invoiceNumber: json['invoiceNumber'] as String,
        currency: json['currency'] as String,
        amountCents: json['amountCents'] as int,
        method: json['method'] as String,
        methodLabel: json['methodLabel'] as String? ?? json['method'] as String,
        reference: json['reference'] as String?,
        paidAt: _date(json['paidAt'])!,
        invoiceTotalCents: json['invoiceTotalCents'] as int,
        paidToDateCents: json['paidToDateCents'] as int,
        balanceAfterCents: json['balanceAfterCents'] as int,
      );
}

class Outstanding {
  const Outstanding(this.currency, this.amountCents);

  final String currency;
  final int amountCents;

  String get formatted => formatMoney(amountCents, currency);
}

class InvoiceList {
  const InvoiceList({required this.invoices, required this.outstanding});

  final List<Invoice> invoices;
  final List<Outstanding> outstanding;

  factory InvoiceList.fromJson(Map<String, dynamic> json) => InvoiceList(
        invoices: (json['invoices'] as List? ?? const [])
            .map((e) => Invoice.fromJson(e as Map<String, dynamic>))
            .toList(),
        outstanding: (json['outstanding'] as List? ?? const [])
            .map((e) => Outstanding((e as Map)['currency'] as String, e['amountCents'] as int))
            .toList(),
      );
}
