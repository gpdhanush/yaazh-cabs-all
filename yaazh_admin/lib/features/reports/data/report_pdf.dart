import 'dart:io';
import 'dart:typed_data';

import 'package:file_saver/file_saver.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/features/reports/data/report_repository.dart';
import 'package:yaazh_admin/features/reports/domain/report.dart';

final _inr = NumberFormat.currency(locale: 'en_IN', symbol: 'Rs ', decimalDigits: 0);
final _inrDec = NumberFormat.currency(locale: 'en_IN', symbol: 'Rs ', decimalDigits: 2);
final _pretty = DateFormat('dd MMM yyyy');
final _stamp = DateFormat('yyyyMMdd_HHmm');

final _brand = PdfColor.fromHex('4B49AC');
final _headerBg = PdfColor.fromHex('EEEDF8');
final _ink = PdfColors.grey900;
final _muted = PdfColors.grey700;
final _line = PdfColors.grey300;
final _completed = PdfColor.fromHex('16A34A');
final _pending = PdfColor.fromHex('EA580C');
final _cancelled = PdfColor.fromHex('DC2626');

String _money(double value) {
  if (value == value.roundToDouble()) return _inr.format(value);
  return _inrDec.format(value);
}

String _place(String value) {
  var text = value.trim();
  if (text.isEmpty) return '-';
  text = text.replaceAll(RegExp(r'\s+'), ' ');
  final parts = text
      .split(',')
      .map((part) => part.trim())
      .where((part) => part.isNotEmpty)
      .toList();
  if (parts.isEmpty) return titleCase(text);
  final skip = RegExp(
    r'^(tamil nadu|india|tn|\d+|pin\s*\d+)$',
    caseSensitive: false,
  );
  final cities = parts.where((part) => !skip.hasMatch(part)).toList();
  final city = titleCase(cities.isNotEmpty ? cities.first : parts.first);
  if (city.length <= 36) return city;
  return '${city.substring(0, 34)}...';
}

String _route(ReportBooking booking) {
  return '${_place(booking.pickup)} To ${_place(booking.drop)}';
}

String _km(double? km) {
  if (km == null || km <= 0) return '-';
  if (km == km.roundToDouble()) return '${km.round()} km';
  return '${km.toStringAsFixed(1)} km';
}

PdfColor _statusColor(String status) {
  switch (status) {
    case 'completed':
      return _completed;
    case 'cancelled':
    case 'rejected':
    case 'no_show':
      return _cancelled;
    case 'pending':
      return _pending;
    default:
      return _ink;
  }
}

pw.Widget _routeCell(ReportBooking booking) {
  final customer = titleCase(booking.customerName);
  final driver = titleCase(booking.driverName);
  final id = booking.reference.trim();
  final detail = [
    if (customer.isNotEmpty) customer,
    if (driver.isNotEmpty) driver,
    if (id.isNotEmpty) id,
  ].join(' - ');

  return pw.Column(
    mainAxisSize: pw.MainAxisSize.min,
    crossAxisAlignment: pw.CrossAxisAlignment.start,
    children: [
      pw.Text(
        _route(booking),
        textAlign: pw.TextAlign.left,
        style: pw.TextStyle(
          fontSize: 9,
          fontWeight: pw.FontWeight.bold,
          color: _ink,
        ),
      ),
      if (detail.isNotEmpty) ...[
        pw.SizedBox(height: 2),
        pw.Text(
          detail,
          textAlign: pw.TextAlign.left,
          style: pw.TextStyle(fontSize: 8, color: _muted),
        ),
      ],
    ],
  );
}

pw.Widget _cellText(
  String text, {
  PdfColor? color,
  bool bold = false,
  double size = 9,
  pw.TextAlign align = pw.TextAlign.center,
}) {
  return pw.Text(
    text,
    textAlign: align,
    style: pw.TextStyle(
      fontSize: size,
      fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
      color: color ?? _ink,
    ),
  );
}

pw.Widget _gridCell(
  pw.Widget child, {
  int flex = 1,
  bool last = false,
  pw.Alignment align = pw.Alignment.center,
}) {
  return pw.Expanded(
    flex: flex,
    child: pw.Container(
      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 8),
      alignment: align,
      decoration: last
          ? null
          : pw.BoxDecoration(
              border: pw.Border(
                right: pw.BorderSide(color: _line, width: 0.6),
              ),
            ),
      child: child,
    ),
  );
}

pw.Widget _gridRow({
  required List<pw.Widget> cells,
  required List<int> flex,
  List<pw.Alignment>? alignments,
  PdfColor? color,
  bool top = false,
}) {
  return pw.Container(
    decoration: pw.BoxDecoration(
      color: color,
      border: pw.Border(
        left: pw.BorderSide(color: _line, width: 0.6),
        right: pw.BorderSide(color: _line, width: 0.6),
        bottom: pw.BorderSide(color: _line, width: 0.6),
        top: pw.BorderSide(color: _line, width: top ? 0.6 : 0),
      ),
    ),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.center,
      children: [
        for (var i = 0; i < cells.length; i++)
          _gridCell(
            cells[i],
            flex: flex[i],
            last: i == cells.length - 1,
            align: alignments?[i] ?? pw.Alignment.center,
          ),
      ],
    ),
  );
}

Future<String> exportReportPdf({
  required ReportsPayload data,
  required ReportDateRange range,
  required String period,
}) async {
  final doc = pw.Document();
  final rangeLabel =
      '${_pretty.format(range.from)} to ${_pretty.format(range.to)}';
  final filename = 'Yaazh_Report_${_stamp.format(DateTime.now())}.pdf';
  final bookings = data.bookings;
  final counts = data.counts;

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.fromLTRB(32, 28, 32, 32),
      footer: (context) => pw.Padding(
        padding: const pw.EdgeInsets.only(top: 8),
        child: pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text(
              'Yaazh Cabs | Confidential',
              style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600),
            ),
            pw.Text(
              'Page ${context.pageNumber} of ${context.pagesCount}',
              style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600),
            ),
          ],
        ),
      ),
      build: (context) => [
        pw.Container(
          width: double.infinity,
          color: _brand,
          padding: const pw.EdgeInsets.fromLTRB(16, 14, 16, 14),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                'YAAZH CABS',
                style: pw.TextStyle(
                  fontSize: 9,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.white,
                ),
              ),
              pw.SizedBox(height: 4),
              pw.Text(
                'Booking report',
                style: pw.TextStyle(
                  fontSize: 18,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.white,
                ),
              ),
              pw.SizedBox(height: 4),
              pw.Text(
                '$rangeLabel  |  Generated ${_pretty.format(DateTime.now())}',
                style: const pw.TextStyle(fontSize: 10, color: PdfColors.white),
              ),
            ],
          ),
        ),
        pw.SizedBox(height: 18),
        pw.Text(
          'Status summary',
          style: pw.TextStyle(
            fontSize: 12,
            fontWeight: pw.FontWeight.bold,
            color: _ink,
          ),
        ),
        pw.SizedBox(height: 8),
        _gridRow(
          top: true,
          color: _headerBg,
          flex: const [1, 1, 1, 1, 1],
          cells: [
            _cellText('Bookings', bold: true),
            _cellText('Completed', bold: true, color: _completed),
            _cellText('Pending', bold: true, color: _pending),
            _cellText('Cancelled', bold: true, color: _cancelled),
            _cellText('Revenue', bold: true),
          ],
        ),
        _gridRow(
          flex: const [1, 1, 1, 1, 1],
          cells: [
            _cellText('${counts.bookings}', bold: true, size: 11),
            _cellText('${counts.completed}', bold: true, size: 11, color: _completed),
            _cellText('${counts.pending}', bold: true, size: 11, color: _pending),
            _cellText('${counts.cancelled}', bold: true, size: 11, color: _cancelled),
            _cellText(_money(counts.revenue), bold: true, size: 11),
          ],
        ),
        pw.Container(
          width: double.infinity,
          padding: const pw.EdgeInsets.fromLTRB(8, 8, 8, 8),
          decoration: pw.BoxDecoration(
            border: pw.Border(
              left: pw.BorderSide(color: _line, width: 0.6),
              right: pw.BorderSide(color: _line, width: 0.6),
              bottom: pw.BorderSide(color: _line, width: 0.6),
            ),
          ),
          child: pw.RichText(
            text: pw.TextSpan(
              children: [
                pw.TextSpan(
                  text: 'Revenue in words: ',
                  style: pw.TextStyle(
                    fontSize: 9,
                    fontWeight: pw.FontWeight.bold,
                    color: _ink,
                  ),
                ),
                pw.TextSpan(
                  text: amountInWords(counts.revenue),
                  style: pw.TextStyle(fontSize: 9, color: _muted),
                ),
              ],
            ),
          ),
        ),
        pw.SizedBox(height: 18),
        pw.Text(
          'Booking list (${bookings.length})',
          style: pw.TextStyle(
            fontSize: 12,
            fontWeight: pw.FontWeight.bold,
            color: _ink,
          ),
        ),
        pw.SizedBox(height: 8),
        if (bookings.isEmpty)
          pw.Text(
            'No bookings in this date range.',
            style: pw.TextStyle(fontSize: 10, color: _muted),
          )
        else ...[
          _gridRow(
            top: true,
            color: _headerBg,
            flex: const [32, 14, 13, 10],
            cells: [
              _cellText('Route', bold: true, size: 10),
              _cellText('Status', bold: true, size: 10),
              _cellText('Amount', bold: true, size: 10),
              _cellText('KM', bold: true, size: 10),
            ],
          ),
          for (final booking in bookings)
            _gridRow(
              flex: const [32, 14, 13, 10],
              alignments: const [
                pw.Alignment.centerLeft,
                pw.Alignment.center,
                pw.Alignment.centerRight,
                pw.Alignment.centerRight,
              ],
              cells: [
                _routeCell(booking),
                _cellText(
                  BookingStatus.label(booking.status),
                  bold: true,
                  color: _statusColor(booking.status),
                ),
                _cellText(
                  _money(booking.amount),
                  align: pw.TextAlign.right,
                ),
                _cellText(
                  _km(booking.km),
                  align: pw.TextAlign.right,
                ),
              ],
            ),
        ],
      ],
    ),
  );

  final bytes = Uint8List.fromList(await doc.save());
  return _savePdf(filename, bytes);
}

Future<String> _savePdf(String filename, Uint8List bytes) async {
  if (Platform.isAndroid) {
    final downloads = Directory('/storage/emulated/0/Download');
    if (await downloads.exists()) {
      try {
        final file = File('${downloads.path}/$filename');
        await file.writeAsBytes(bytes, flush: true);
        await OpenFilex.open(file.path);
        return file.path;
      } catch (_) {}
    }
  }

  final saved = await FileSaver.instance.saveFile(
    name: filename.replaceAll('.pdf', ''),
    bytes: bytes,
    ext: 'pdf',
    mimeType: MimeType.pdf,
  );

  final path = saved.trim();
  if (path.isNotEmpty) {
    final file = File(path);
    if (await file.exists()) {
      await OpenFilex.open(file.path);
      return file.path;
    }
  }

  final dir = await getApplicationDocumentsDirectory();
  final file = File('${dir.path}/$filename');
  await file.writeAsBytes(bytes, flush: true);
  await OpenFilex.open(file.path);
  return file.path;
}
