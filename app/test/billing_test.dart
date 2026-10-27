import 'package:flutter_test/flutter_test.dart';
import 'package:ven_shipping/models/billing.dart';

void main() {
  test('parses an invoice with items and payments from the API', () {
    final invoice = Invoice.fromJson({
      'invoiceNumber': 'INV-000001',
      'status': 'part_paid',
      'statusLabel': 'Part paid',
      'overdue': false,
      'currency': 'USD',
      'totalCents': 13375,
      'paidCents': 10000,
      'balanceCents': 3375,
      'issuedAt': '2026-10-26T21:00:00.000Z',
      'dueDate': '2026-11-09',
      'shipmentId': null,
      'itemCount': 2,
      'subtotalCents': 13375,
      'notes': null,
      'items': [
        {'description': 'Air freight', 'quantity': 12.5, 'unit': 'kg', 'unitPriceCents': 950, 'amountCents': 11875},
        {'description': 'Handling fee', 'quantity': 1, 'unit': null, 'unitPriceCents': 1500, 'amountCents': 1500},
      ],
      'payments': [
        {
          'receiptNumber': 'RCT-000001',
          'invoiceNumber': 'INV-000001',
          'currency': 'USD',
          'amountCents': 10000,
          'method': 'mobile_money',
          'methodLabel': 'Mobile money',
          'reference': 'MTN-123',
          'paidAt': '2026-10-26T22:00:00.000Z',
          'invoiceTotalCents': 13375,
          'paidToDateCents': 10000,
          'balanceAfterCents': 3375,
        },
      ],
      'billing': {
        'company': {'name': 'VEN International Logistics Ltd', 'addressLines': ['Accra, Ghana']},
        'paymentInstructions': ['Pay by mobile money'],
        'footer': 'Thanks',
      },
    });
    expect(invoice.isOpen, isTrue);
    expect(invoice.money(invoice.balanceCents), r'$33.75');
    expect(invoice.items.first.quantityText, '12.5 kg');
    expect(invoice.items.last.quantityText, '1');
    expect(invoice.payments.single.paidInFull, isFalse);
    expect(invoice.billing!.paymentInstructions, ['Pay by mobile money']);
    expect(invoice.dueDate, DateTime(2026, 11, 9));
  });

  test('parses the invoice list with outstanding totals', () {
    final list = InvoiceList.fromJson({
      'invoices': [],
      'outstanding': [
        {'currency': 'USD', 'amountCents': 2500},
      ],
    });
    expect(list.outstanding.single.formatted, r'$25.00');
  });
}
