import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../models/customer.dart';
import '../models/warehouse_address.dart';

const _navy = PdfColor.fromInt(0xFF17174A);
const _lime = PdfColor.fromInt(0xFFB5CF30);
const _muted = PdfColor.fromInt(0xFF4A4B6E);

/// Builds a one-page PDF of the customer's China warehouse address and opens the
/// system share/save sheet (a download on web).
Future<void> downloadAddressPdf({
  required Customer customer,
  required WarehouseAddress address,
  List<String> instructions = const [],
}) async {
  final logoBytes = await rootBundle.load('assets/images/logo_dark.png');
  final logo = pw.MemoryImage(logoBytes.buffer.asUint8List());

  // Real warehouse addresses may include Chinese characters, which the built-in PDF fonts lack.
  pw.ThemeData theme;
  try {
    theme = pw.ThemeData.withFont(
      base: await PdfGoogleFonts.notoSansSCRegular(),
      bold: await PdfGoogleFonts.notoSansSCBold(),
    );
  } catch (_) {
    theme = pw.ThemeData.base();
  }

  pw.Widget field(String label, String value) => pw.Padding(
        padding: const pw.EdgeInsets.only(bottom: 10),
        child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          pw.Text(label.toUpperCase(), style: const pw.TextStyle(fontSize: 9, color: _muted)),
          pw.SizedBox(height: 2),
          pw.Text(value, style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: _navy)),
        ]),
      );

  final doc = pw.Document(theme: theme, title: 'VEN Shipping China warehouse address ${customer.customerId}');
  doc.addPage(pw.Page(
    pageFormat: PdfPageFormat.a4,
    margin: const pw.EdgeInsets.all(40),
    build: (context) => pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      pw.Image(logo, width: 220),
      pw.SizedBox(height: 28),
      pw.Text('OUR CHINA WAREHOUSE ADDRESS',
          style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold, color: _navy)),
      pw.SizedBox(height: 4),
      pw.Text('${address.label}${address.transitTime != null ? '  ·  ${address.transitTime}' : ''}',
          style: const pw.TextStyle(fontSize: 11, color: _muted)),
      pw.SizedBox(height: 16),
      pw.Container(
        width: double.infinity,
        padding: const pw.EdgeInsets.all(14),
        color: _lime,
        child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          pw.Text('SHIPPING MARK', style: const pw.TextStyle(fontSize: 9, color: _navy)),
          pw.Text(address.shippingMark,
              style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: _navy)),
        ]),
      ),
      pw.Container(
        width: double.infinity,
        padding: const pw.EdgeInsets.all(14),
        decoration: pw.BoxDecoration(border: pw.Border.all(color: _navy, width: 2)),
        child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          field('Recipient', address.recipient),
          field('Phone', address.phone),
          field('Address', address.addressLine),
          field('City', address.cityLine),
          field('Country', address.country),
        ]),
      ),
      pw.SizedBox(height: 20),
      pw.Text('Customer: ${customer.fullName}  ·  ID ${customer.customerId}',
          style: const pw.TextStyle(fontSize: 11, color: _navy)),
      if (instructions.isNotEmpty) ...[
        pw.SizedBox(height: 20),
        pw.Text('How to send goods to VEN Shipping',
            style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: _navy)),
        pw.SizedBox(height: 6),
        for (var i = 0; i < instructions.length; i++)
          pw.Padding(
            padding: const pw.EdgeInsets.only(bottom: 4),
            child: pw.Text('${i + 1}. ${instructions[i]}', style: const pw.TextStyle(fontSize: 11)),
          ),
      ],
      pw.Spacer(),
      pw.Text('Generated ${DateFormat.yMMMd().format(DateTime.now())} · VEN International Logistics Ltd',
          style: const pw.TextStyle(fontSize: 9, color: _muted)),
    ]),
  ));

  await Printing.sharePdf(
    bytes: await doc.save(),
    filename: 'VEN-${customer.customerId}-${address.method}-china-address.pdf',
  );
}
