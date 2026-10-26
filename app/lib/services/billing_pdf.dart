import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../models/billing.dart';
import '../models/customer.dart';

const _navy = PdfColor.fromInt(0xFF17174A);
const _lime = PdfColor.fromInt(0xFFB5CF30);
const _limeTint = PdfColor.fromInt(0xFFF4F8E1);
const _muted = PdfColor.fromInt(0xFF5D5E80);
const _line = PdfColor.fromInt(0xFFE3E5EF);

final _date = DateFormat('d MMMM yyyy');

Future<(pw.ThemeData, pw.MemoryImage)> _setup() async {
  final logoBytes = await rootBundle.load('assets/images/logo_white.png');
  final logo = pw.MemoryImage(logoBytes.buffer.asUint8List());
  pw.ThemeData theme;
  try {
    theme = pw.ThemeData.withFont(
      base: await PdfGoogleFonts.notoSansRegular(),
      bold: await PdfGoogleFonts.notoSansBold(),
    );
  } catch (_) {
    theme = pw.ThemeData.base();
  }
  return (theme, logo);
}

pw.Widget _header(pw.MemoryImage logo, String kind, String number) => pw.Container(
      padding: const pw.EdgeInsets.fromLTRB(32, 26, 32, 22),
      decoration: const pw.BoxDecoration(
        color: _navy,
        border: pw.Border(bottom: pw.BorderSide(color: _lime, width: 4)),
      ),
      child: pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.center, children: [
        pw.Image(logo, width: 200),
        pw.Spacer(),
        pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.end, children: [
          pw.Text(kind.toUpperCase(),
              style: const pw.TextStyle(color: _lime, fontSize: 18, fontWeight: pw.FontWeight.bold, letterSpacing: 2)),
          pw.Text(number, style: const pw.TextStyle(color: PdfColors.white, fontSize: 11)),
        ]),
      ]),
    );

pw.Widget _label(String text) => pw.Text(text.toUpperCase(),
    style: const pw.TextStyle(fontSize: 8, color: _muted, fontWeight: pw.FontWeight.bold, letterSpacing: 1));

pw.Widget _row(String label, String value, {bool strong = false}) => pw.Container(
      padding: const pw.EdgeInsets.symmetric(vertical: 7),
      decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: _line))),
      child: pw.Row(children: [
        pw.Expanded(
            child: pw.Text(label,
                style: pw.TextStyle(fontSize: strong ? 12 : 10, color: strong ? _navy : _muted,
                    fontWeight: strong ? pw.FontWeight.bold : null))),
        pw.Text(value, style: pw.TextStyle(fontSize: strong ? 12 : 10, color: _navy, fontWeight: pw.FontWeight.bold)),
      ]),
    );

pw.Widget _footer(String? text) => pw.Container(
      padding: const pw.EdgeInsets.fromLTRB(32, 12, 32, 20),
      child: pw.Text(
        [if (text != null && text.isNotEmpty) text, 'VEN International Logistics Ltd'].join('  ·  '),
        style: const pw.TextStyle(fontSize: 9, color: _muted),
      ),
    );

/// A branded A4 invoice, opened in the system share/save sheet.
Future<void> shareInvoicePdf({required Customer customer, required Invoice invoice}) async {
  final (theme, logo) = await _setup();
  final billing = invoice.billing;
  final doc = pw.Document(theme: theme, title: 'Invoice ${invoice.invoiceNumber}');
  doc.addPage(pw.Page(
    pageFormat: PdfPageFormat.a4,
    margin: pw.EdgeInsets.zero,
    build: (context) => pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.stretch, children: [
      _header(logo, 'Invoice', invoice.invoiceNumber),
      pw.Padding(
        padding: const pw.EdgeInsets.fromLTRB(32, 24, 32, 0),
        child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.stretch, children: [
          pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
            pw.Expanded(
              child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                _label('Billed to'),
                pw.SizedBox(height: 4),
                pw.Text(customer.fullName, style: const pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: _navy)),
                pw.Text('${customer.customerId}\n${customer.email}\n${customer.phone}\n${customer.deliveryDestination}',
                    style: const pw.TextStyle(fontSize: 10, lineSpacing: 2)),
              ]),
            ),
            pw.Expanded(
              child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                _label('From'),
                pw.SizedBox(height: 4),
                pw.Text(billing?.companyName ?? 'VEN International Logistics Ltd',
                    style: const pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: _navy)),
                pw.Text((billing?.companyAddress ?? const []).join('\n'), style: const pw.TextStyle(fontSize: 10)),
                pw.SizedBox(height: 10),
                pw.Text('Issued ${_date.format(invoice.issuedAt)}', style: const pw.TextStyle(fontSize: 10)),
                if (invoice.dueDate != null)
                  pw.Text('Due ${_date.format(invoice.dueDate!)}', style: const pw.TextStyle(fontSize: 10)),
                pw.Text('Status: ${invoice.overdue ? 'Overdue' : invoice.statusLabel}',
                    style: const pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
              ]),
            ),
          ]),
          pw.SizedBox(height: 24),
          pw.TableHelper.fromTextArray(
            headers: ['Description', 'Qty', 'Unit price', 'Amount'],
            data: [
              for (final item in invoice.items)
                [item.description, item.quantityText, invoice.money(item.unitPriceCents), invoice.money(item.amountCents)],
            ],
            border: null,
            headerStyle: const pw.TextStyle(fontSize: 9, color: PdfColors.white, fontWeight: pw.FontWeight.bold),
            headerDecoration: const pw.BoxDecoration(color: _navy),
            cellStyle: const pw.TextStyle(fontSize: 10),
            rowDecoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: _line))),
            cellPadding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            columnWidths: {
              0: const pw.FlexColumnWidth(4),
              1: const pw.FlexColumnWidth(1.3),
              2: const pw.FlexColumnWidth(1.6),
              3: const pw.FlexColumnWidth(1.6),
            },
            cellAlignments: {1: pw.Alignment.centerRight, 2: pw.Alignment.centerRight, 3: pw.Alignment.centerRight},
          ),
          pw.SizedBox(height: 12),
          pw.Row(children: [
            pw.Spacer(flex: 3),
            pw.Expanded(
              flex: 2,
              child: pw.Column(children: [
                _row('Subtotal', invoice.money(invoice.subtotalCents ?? invoice.totalCents)),
                if (invoice.paidCents > 0) _row('Paid', '-${invoice.money(invoice.paidCents)}'),
                pw.Container(
                  color: _navy,
                  padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  margin: const pw.EdgeInsets.only(top: 6),
                  child: pw.Row(children: [
                    pw.Expanded(
                        child: pw.Text(invoice.status == 'void' ? 'Cancelled' : 'Balance due',
                            style: const pw.TextStyle(color: PdfColors.white, fontSize: 11, fontWeight: pw.FontWeight.bold))),
                    pw.Text(invoice.money(invoice.balanceCents),
                        style: const pw.TextStyle(color: _lime, fontSize: 13, fontWeight: pw.FontWeight.bold)),
                  ]),
                ),
              ]),
            ),
          ]),
          if (invoice.notes != null) ...[
            pw.SizedBox(height: 18),
            pw.Container(
              padding: const pw.EdgeInsets.all(10),
              decoration: const pw.BoxDecoration(
                color: _limeTint,
                border: pw.Border(left: pw.BorderSide(color: _lime, width: 3)),
              ),
              child: pw.Text(invoice.notes!, style: const pw.TextStyle(fontSize: 10)),
            ),
          ],
          if (invoice.isOpen && (billing?.paymentInstructions.isNotEmpty ?? false)) ...[
            pw.SizedBox(height: 18),
            _label('How to pay'),
            pw.SizedBox(height: 6),
            for (final line in billing!.paymentInstructions) pw.Text(line, style: const pw.TextStyle(fontSize: 10)),
            pw.SizedBox(height: 4),
            pw.Text('Payment reference: ${invoice.invoiceNumber}',
                style: const pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
          ],
        ]),
      ),
      pw.Spacer(),
      _footer(billing?.footer),
    ]),
  ));
  await Printing.sharePdf(bytes: await doc.save(), filename: 'VEN-${invoice.invoiceNumber}.pdf');
}

/// A branded A4 payment receipt.
Future<void> shareReceiptPdf({required Customer customer, required Receipt receipt}) async {
  final (theme, logo) = await _setup();
  final doc = pw.Document(theme: theme, title: 'Receipt ${receipt.receiptNumber}');
  doc.addPage(pw.Page(
    pageFormat: PdfPageFormat.a4,
    margin: pw.EdgeInsets.zero,
    build: (context) => pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.stretch, children: [
      _header(logo, 'Receipt', receipt.receiptNumber),
      pw.Padding(
        padding: const pw.EdgeInsets.fromLTRB(32, 28, 32, 0),
        child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.stretch, children: [
          pw.Container(
            padding: const pw.EdgeInsets.all(18),
            color: _navy,
            child: pw.Column(children: [
              pw.Text('AMOUNT PAID', style: const pw.TextStyle(color: PdfColors.white, fontSize: 9, letterSpacing: 1.5)),
              pw.SizedBox(height: 4),
              pw.Text(receipt.money(receipt.amountCents),
                  style: const pw.TextStyle(color: _lime, fontSize: 28, fontWeight: pw.FontWeight.bold)),
              pw.Text(receipt.paidInFull ? 'Invoice ${receipt.invoiceNumber} paid in full' : 'Part payment',
                  style: const pw.TextStyle(color: PdfColors.white, fontSize: 10)),
            ]),
          ),
          pw.SizedBox(height: 20),
          _row('Received from', '${customer.fullName} (${customer.customerId})'),
          _row('Receipt number', receipt.receiptNumber),
          _row('Payment date', DateFormat('d MMMM yyyy, HH:mm').format(receipt.paidAt)),
          _row('Payment method', receipt.methodLabel),
          if (receipt.reference != null) _row('Reference', receipt.reference!),
          _row('For invoice', receipt.invoiceNumber),
          _row('Invoice total', receipt.money(receipt.invoiceTotalCents)),
          _row('Paid to date', receipt.money(receipt.paidToDateCents)),
          _row('Balance remaining', receipt.money(receipt.balanceAfterCents), strong: true),
          pw.SizedBox(height: 24),
          pw.Text('Thank you for shipping with VEN Shipping.',
              style: const pw.TextStyle(fontSize: 12, color: _navy, fontWeight: pw.FontWeight.bold)),
        ]),
      ),
      pw.Spacer(),
      _footer(null),
    ]),
  ));
  await Printing.sharePdf(bytes: await doc.save(), filename: 'VEN-${receipt.receiptNumber}.pdf');
}
