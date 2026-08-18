import 'dart:io';
import 'dart:typed_data';

import 'package:file_saver/file_saver.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/features/reports/data/report_repository.dart';
import 'package:yaazh_admin/features/reports/domain/report.dart';

final _inr = NumberFormat.currency(locale: 'en_IN', symbol: 'Rs ', decimalDigits: 0);
final _inrDec = NumberFormat.currency(locale: 'en_IN', symbol: 'Rs ', decimalDigits: 2);
final _pretty = DateFormat('dd MMM yyyy', 'en');
final _stamp = DateFormat('yyyyMMdd_HHmm');

final _brand = PdfColor.fromHex('4B49AC');
final _headerBg = PdfColor.fromHex('EEEDF8');
final _ink = PdfColors.grey900;
final _muted = PdfColors.grey700;
final _line = PdfColors.grey300;

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
  if (parts.isEmpty) return text;
  final skip = RegExp(
    r'^(tamil nadu|india|tn|\d+|pin\s*\d+)$',
    caseSensitive: false,
  );
  final cities = parts.where((part) => !skip.hasMatch(part)).toList();
  final city = (cities.isNotEmpty ? cities.first : parts.first);
  if (city.length <= 36) return city;
  return '${city.substring(0, 34)}...';
}

String _route(ReportBooking booking) {
  return '${_place(booking.pickup)} to ${_place(booking.drop)}';
}

String _km(double? km) {
  if (km == null || km <= 0) return '-';
  if (km == km.roundToDouble()) return '${km.round()} km';
  return '${km.toStringAsFixed(1)} km';
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

  final headerStyle = pw.TextStyle(
    fontWeight: pw.FontWeight.bold,
    fontSize: 9,
    color: _ink,
  );
  const cellStyle = pw.TextStyle(fontSize: 9, color: PdfColors.grey900);

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
        pw.TableHelper.fromTextArray(
          headers: const [
            'Bookings',
            'Completed',
            'Pending',
            'Cancelled',
            'Revenue',
          ],
          data: [
            [
              '${counts.bookings}',
              '${counts.completed}',
              '${counts.pending}',
              '${counts.cancelled}',
              _money(counts.revenue),
            ],
          ],
          headerStyle: headerStyle,
          cellStyle: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
            color: _ink,
          ),
          headerDecoration: pw.BoxDecoration(color: _headerBg),
          border: pw.TableBorder.all(color: _line, width: 0.6),
          cellAlignments: {
            0: pw.Alignment.center,
            1: pw.Alignment.center,
            2: pw.Alignment.center,
            3: pw.Alignment.center,
            4: pw.Alignment.center,
          },
          cellPadding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 8),
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
        else
          pw.TableHelper.fromTextArray(
            headers: const ['Route', 'Status', 'Amount', 'KM'],
            data: [
              for (final booking in bookings)
                [
                  _route(booking),
                  BookingStatus.label(booking.status),
                  _money(booking.amount),
                  _km(booking.km),
                ],
            ],
            headerStyle: headerStyle,
            cellStyle: cellStyle,
            headerDecoration: pw.BoxDecoration(color: _headerBg),
            border: pw.TableBorder.all(color: _line, width: 0.6),
            columnWidths: {
              0: const pw.FlexColumnWidth(3.2),
              1: const pw.FlexColumnWidth(1.4),
              2: const pw.FlexColumnWidth(1.3),
              3: const pw.FlexColumnWidth(1),
            },
            cellAlignments: {
              0: pw.Alignment.centerLeft,
              1: pw.Alignment.centerLeft,
              2: pw.Alignment.centerRight,
              3: pw.Alignment.centerRight,
            },
            cellPadding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 7),
          ),
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
