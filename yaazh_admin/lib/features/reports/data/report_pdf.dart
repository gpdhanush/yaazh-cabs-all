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
final _pretty = DateFormat('dd MMM yyyy');
final _stamp = DateFormat('yyyyMMdd_HHmm');

const _brand = PdfColor.fromInt(0xFF4B49AC);
const _brandSoft = PdfColor.fromInt(0xFFEEEDF8);
const _ink = PdfColor.fromInt(0xFF1F1E39);
const _muted = PdfColor.fromInt(0xFF6B7289);
const _line = PdfColor.fromInt(0xFFE4E7F1);
const _success = PdfColor.fromInt(0xFF16A34A);
const _warning = PdfColor.fromInt(0xFFD97706);
const _danger = PdfColor.fromInt(0xFFDC2626);

String _money(double value) {
  if (value == value.roundToDouble()) return _inr.format(value);
  return _inrDec.format(value);
}

String _place(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return '—';
  final parts = trimmed
      .split(',')
      .map((part) => part.trim())
      .where((part) => part.isNotEmpty)
      .toList();
  final city = parts.isEmpty ? trimmed : parts.first;
  if (city.length <= 32) return city;
  return '${city.substring(0, 30)}…';
}

String _km(double? km) {
  if (km == null) return '—';
  if (km == km.roundToDouble()) return '${km.round()} km';
  return '${km.toStringAsFixed(1)} km';
}

PdfColor _statusColor(String status) {
  switch (status) {
    case 'completed':
      return _success;
    case 'cancelled':
    case 'rejected':
    case 'no_show':
      return _danger;
    case 'pending':
      return _warning;
    default:
      return _brand;
  }
}

Future<String> exportReportPdf({
  required ReportsPayload data,
  required ReportDateRange range,
  required String period,
}) async {
  final doc = pw.Document();
  final rangeLabel = '${_pretty.format(range.from)} – ${_pretty.format(range.to)}';
  final filename = 'Yaazh_Report_${_stamp.format(DateTime.now())}.pdf';
  final bookings = data.bookings;

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.fromLTRB(28, 24, 28, 32),
      header: (context) {
        if (context.pageNumber > 1) {
          return pw.Padding(
            padding: const pw.EdgeInsets.only(bottom: 12),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'Yaazh Cabs  ·  Booking list',
                  style: pw.TextStyle(
                    fontSize: 9,
                    fontWeight: pw.FontWeight.bold,
                    color: _brand,
                  ),
                ),
                pw.Text(
                  rangeLabel,
                  style: const pw.TextStyle(fontSize: 9, color: _muted),
                ),
              ],
            ),
          );
        }
        return pw.SizedBox();
      },
      footer: (context) => pw.Padding(
        padding: const pw.EdgeInsets.only(top: 10),
        child: pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text(
              'Yaazh Cabs  ·  Confidential',
              style: const pw.TextStyle(fontSize: 8, color: _muted),
            ),
            pw.Text(
              'Page ${context.pageNumber} of ${context.pagesCount}',
              style: const pw.TextStyle(fontSize: 8, color: _muted),
            ),
          ],
        ),
      ),
      build: (context) => [
        _cover(rangeLabel, data.counts),
        pw.SizedBox(height: 22),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text(
              'Booking list',
              style: pw.TextStyle(
                fontSize: 14,
                fontWeight: pw.FontWeight.bold,
                color: _ink,
              ),
            ),
            pw.Text(
              '${bookings.length} trip${bookings.length == 1 ? '' : 's'}',
              style: const pw.TextStyle(fontSize: 9, color: _muted),
            ),
          ],
        ),
        pw.SizedBox(height: 10),
        if (bookings.isEmpty)
          pw.Container(
            width: double.infinity,
            padding: const pw.EdgeInsets.symmetric(vertical: 28),
            decoration: pw.BoxDecoration(
              color: _brandSoft,
              borderRadius: pw.BorderRadius.circular(14),
            ),
            child: pw.Center(
              child: pw.Text(
                'No bookings in this date range.',
                style: const pw.TextStyle(fontSize: 11, color: _muted),
              ),
            ),
          )
        else
          ...bookings.map(_bookingCard),
      ],
    ),
  );

  final bytes = Uint8List.fromList(await doc.save());
  return _savePdf(filename, bytes);
}

pw.Widget _cover(String rangeLabel, ReportCounts counts) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.fromLTRB(22, 20, 22, 18),
    decoration: pw.BoxDecoration(
      color: _brand,
      borderRadius: pw.BorderRadius.circular(18),
    ),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'YAAZH CABS',
          style: pw.TextStyle(
            fontSize: 9,
            letterSpacing: 1.4,
            fontWeight: pw.FontWeight.bold,
            color: PdfColors.white,
          ),
        ),
        pw.SizedBox(height: 6),
        pw.Text(
          'Booking report',
          style: pw.TextStyle(
            fontSize: 22,
            fontWeight: pw.FontWeight.bold,
            color: PdfColors.white,
          ),
        ),
        pw.SizedBox(height: 4),
        pw.Text(
          '$rangeLabel   ·   Generated ${_pretty.format(DateTime.now())}',
          style: const pw.TextStyle(fontSize: 10, color: PdfColors.white),
        ),
        pw.SizedBox(height: 16),
        pw.Row(
          children: [
            _kpi('Bookings', '${counts.bookings}'),
            pw.SizedBox(width: 8),
            _kpi('Completed', '${counts.completed}'),
            pw.SizedBox(width: 8),
            _kpi('Pending', '${counts.pending}'),
            pw.SizedBox(width: 8),
            _kpi('Cancelled', '${counts.cancelled}'),
            pw.SizedBox(width: 8),
            _kpi('Revenue', _money(counts.revenue)),
          ],
        ),
      ],
    ),
  );
}

pw.Widget _kpi(String label, String value) {
  return pw.Expanded(
    child: pw.Container(
      padding: const pw.EdgeInsets.fromLTRB(10, 10, 10, 9),
      decoration: pw.BoxDecoration(
        color: PdfColor.fromInt(0x33FFFFFF),
        borderRadius: pw.BorderRadius.circular(12),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            label.toUpperCase(),
            style: pw.TextStyle(
              fontSize: 7,
              letterSpacing: 0.4,
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
            ),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            value,
            style: pw.TextStyle(
              fontSize: 11,
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
            ),
          ),
        ],
      ),
    ),
  );
}

pw.Widget _bookingCard(ReportBooking booking) {
  final color = _statusColor(booking.status);
  return pw.Container(
    margin: const pw.EdgeInsets.only(bottom: 8),
    padding: const pw.EdgeInsets.fromLTRB(12, 11, 12, 11),
    decoration: pw.BoxDecoration(
      border: pw.Border.all(color: _line),
      borderRadius: pw.BorderRadius.circular(12),
    ),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.center,
      children: [
        pw.Container(
          width: 4,
          height: 38,
          decoration: pw.BoxDecoration(
            color: color,
            borderRadius: pw.BorderRadius.circular(99),
          ),
        ),
        pw.SizedBox(width: 10),
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                '${_place(booking.pickup)}  to  ${_place(booking.drop)}',
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: _ink,
                ),
              ),
              pw.SizedBox(height: 4),
              pw.Row(
                children: [
                  _pill(BookingStatus.label(booking.status), color),
                  if (booking.reference.isNotEmpty) ...[
                    pw.SizedBox(width: 8),
                    pw.Text(
                      booking.reference,
                      style: const pw.TextStyle(fontSize: 8, color: _muted),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
        pw.SizedBox(width: 10),
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text(
              _money(booking.amount),
              style: pw.TextStyle(
                fontSize: 11,
                fontWeight: pw.FontWeight.bold,
                color: _ink,
              ),
            ),
            pw.SizedBox(height: 3),
            pw.Text(
              _km(booking.km),
              style: const pw.TextStyle(fontSize: 9, color: _muted),
            ),
          ],
        ),
      ],
    ),
  );
}

pw.Widget _pill(String label, PdfColor color) {
  return pw.Container(
    padding: const pw.EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: pw.BoxDecoration(
      color: PdfColor(color.red, color.green, color.blue, 0.12),
      borderRadius: pw.BorderRadius.circular(99),
    ),
    child: pw.Text(
      label,
      style: pw.TextStyle(
        fontSize: 8,
        fontWeight: pw.FontWeight.bold,
        color: color,
      ),
    ),
  );
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
