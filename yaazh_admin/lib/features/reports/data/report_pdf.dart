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

String _money(double value) {
  if (value == value.roundToDouble()) return _inr.format(value);
  return _inrDec.format(value);
}

Future<String> exportReportPdf({
  required ReportsPayload data,
  required ReportDateRange range,
  required String period,
}) async {
  final doc = pw.Document();
  final periodLabel = switch (period) {
    'week' => 'Weekly',
    'month' => 'Monthly',
    _ => 'Daily',
  };
  final rangeLabel = '${_pretty.format(range.from)} – ${_pretty.format(range.to)}';
  final filename = 'Yaazh_Report_${_stamp.format(DateTime.now())}.pdf';

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.fromLTRB(36, 36, 36, 40),
      header: (context) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            'Yaazh Cabs',
            style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 2),
          pw.Text(
            '$periodLabel booking report',
            style: const pw.TextStyle(fontSize: 12, color: PdfColors.grey700),
          ),
          pw.SizedBox(height: 8),
          pw.Divider(color: PdfColors.grey400),
          pw.SizedBox(height: 8),
        ],
      ),
      footer: (context) => pw.Align(
        alignment: pw.Alignment.centerRight,
        child: pw.Text(
          'Page ${context.pageNumber} of ${context.pagesCount}',
          style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey600),
        ),
      ),
      build: (context) => [
        pw.Text('Date range: $rangeLabel', style: const pw.TextStyle(fontSize: 11)),
        pw.Text(
          'Generated ${_pretty.format(DateTime.now())}',
          style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
        ),
        pw.SizedBox(height: 16),
        pw.Text('Summary', style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 8),
        pw.TableHelper.fromTextArray(
          headers: const ['Metric', 'Value'],
          data: [
            ['Total bookings', '${data.counts.bookings}'],
            ['Completed', '${data.counts.completed}'],
            ['Pending', '${data.counts.pending}'],
            ['Cancelled', '${data.counts.cancelled}'],
            ['Revenue (completed)', _money(data.counts.revenue)],
          ],
          headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
          cellStyle: const pw.TextStyle(fontSize: 10),
          headerDecoration: const pw.BoxDecoration(color: PdfColors.grey300),
          cellAlignments: {
            0: pw.Alignment.centerLeft,
            1: pw.Alignment.centerRight,
          },
        ),
        pw.SizedBox(height: 18),
        pw.Text('Trend', style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 8),
        if (data.series.isEmpty)
          pw.Text('No booking activity in this period.', style: const pw.TextStyle(fontSize: 10))
        else
          pw.TableHelper.fromTextArray(
            headers: const ['Period', 'Bookings', 'Completed', 'Cancelled', 'Pending', 'Revenue'],
            data: [
              for (final row in data.series)
                [
                  row.label,
                  '${row.bookings}',
                  '${row.completed}',
                  '${row.cancelled}',
                  '${row.pending}',
                  _money(row.revenue),
                ],
            ],
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
            cellStyle: const pw.TextStyle(fontSize: 9),
            headerDecoration: const pw.BoxDecoration(color: PdfColors.grey300),
            cellAlignments: {
              0: pw.Alignment.centerLeft,
              1: pw.Alignment.centerRight,
              2: pw.Alignment.centerRight,
              3: pw.Alignment.centerRight,
              4: pw.Alignment.centerRight,
              5: pw.Alignment.centerRight,
            },
          ),
        pw.SizedBox(height: 18),
        pw.Text('Status mix', style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 8),
        if (data.byStatus.isEmpty)
          pw.Text('No status rows yet.', style: const pw.TextStyle(fontSize: 10))
        else
          pw.TableHelper.fromTextArray(
            headers: const ['Status', 'Count'],
            data: [
              for (final row in data.byStatus)
                [BookingStatus.label(row.status), '${row.count}'],
            ],
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
            cellStyle: const pw.TextStyle(fontSize: 10),
            headerDecoration: const pw.BoxDecoration(color: PdfColors.grey300),
            cellAlignments: {
              0: pw.Alignment.centerLeft,
              1: pw.Alignment.centerRight,
            },
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
  if (path.isNotEmpty && !path.contains(' ') == false) {
    try {
      if (await File(path).exists()) {
        await OpenFilex.open(path);
        return path;
      }
    } catch (_) {}
  }

  final dir = await getApplicationDocumentsDirectory();
  final file = File('${dir.path}/$filename');
  await file.writeAsBytes(bytes, flush: true);
  await OpenFilex.open(file.path);
  return file.path;
}
