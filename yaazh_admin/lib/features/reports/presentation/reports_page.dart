import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/reports/data/report_pdf.dart';
import 'package:yaazh_admin/features/reports/data/report_repository.dart';
import 'package:yaazh_admin/features/reports/domain/report.dart';

final _prettyDate = DateFormat('dd MMM yyyy');

class ReportsPage extends ConsumerStatefulWidget {
  const ReportsPage({super.key});

  @override
  ConsumerState<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends ConsumerState<ReportsPage> {
  bool _exporting = false;

  Future<void> _pickRange() async {
    final current = ref.read(reportDateRangeProvider);
    final from = await showDatePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDate: current.from,
      helpText: 'From date',
      cancelText: 'Cancel',
      confirmText: 'Next',
      fieldLabelText: 'From date',
      fieldHintText: 'From date',
    );
    if (from == null || !mounted) return;

    final to = await showDatePicker(
      context: context,
      firstDate: from,
      lastDate: DateTime.now(),
      initialDate: current.to.isBefore(from) ? from : current.to,
      helpText: 'To date',
      cancelText: 'Cancel',
      confirmText: 'Apply',
      fieldLabelText: 'To date',
      fieldHintText: 'To date',
    );
    if (to == null) return;

    ref.read(reportDateRangeProvider.notifier).state = ReportDateRange(
      from: DateTime(from.year, from.month, from.day),
      to: DateTime(to.year, to.month, to.day),
    );
  }

  void _applyPreset(int days) {
    ref.read(reportDateRangeProvider.notifier).state =
        ReportDateRange.lastDays(days);
  }

  Future<void> _exportPdf(ReportsPayload data) async {
    if (_exporting) return;
    setState(() => _exporting = true);
    try {
      final path = await exportReportPdf(
        data: data,
        range: ref.read(reportDateRangeProvider),
        period: ref.read(reportPeriodProvider),
      );
      showSuccessToast('Saved to Downloads\n$path');
    } catch (e) {
      showErrorToast(e.toString());
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final range = ref.watch(reportDateRangeProvider);
    final reports = ref.watch(reportsProvider);
    final theme = Theme.of(context);
    final days = range.to.difference(range.from).inDays + 1;

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Reports'),
          actions: [
            reports.maybeWhen(
              data: (data) => IconButton(
                tooltip: 'Export PDF',
                onPressed: _exporting ? null : () => _exportPdf(data),
                icon: _exporting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.ios_share_rounded),
              ),
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(reportsProvider);
            await ref.read(reportsProvider.future);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              _DateFilterBar(
                range: range,
                days: days,
                onPick: _pickRange,
                onPreset: _applyPreset,
              ),
              const SizedBox(height: 18),
              reports.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 64),
                  child: Center(child: YaLoader()),
                ),
                error: (err, _) => EmptyState(
                  title: 'Could not load reports',
                  subtitle: err.toString(),
                  icon: Icons.insights_outlined,
                ),
                data: (data) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _KpiGrid(counts: data.counts),
                    const SizedBox(height: 22),
                    Text('Status', style: theme.textTheme.titleMedium),
                    const SizedBox(height: 10),
                    if (data.byStatus.isEmpty)
                      _EmptyCard(
                        message: 'No bookings in this date range.',
                      )
                    else
                      _StatusList(rows: data.byStatus),
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: FilledButton.icon(
                        onPressed: _exporting ? null : () => _exportPdf(data),
                        icon: const Icon(Icons.picture_as_pdf_outlined),
                        label: Text(_exporting ? 'Saving PDF…' : 'Export PDF'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DateFilterBar extends StatelessWidget {
  final ReportDateRange range;
  final int days;
  final VoidCallback onPick;
  final ValueChanged<int> onPreset;

  const _DateFilterBar({
    required this.range,
    required this.days,
    required this.onPick,
    required this.onPreset,
  });

  int get _activePreset {
    if (days == 7) return 7;
    if (days == 14) return 14;
    if (days == 30) return 30;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Material(
          color: theme.colorScheme.surface,
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(
              color: theme.colorScheme.primary.withValues(alpha: 0.14),
            ),
          ),
          child: InkWell(
            onTap: onPick,
            borderRadius: BorderRadius.circular(20),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      Icons.calendar_month_rounded,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(
                          child: _DateHeader(
                            label: 'From date',
                            value: _prettyDate.format(range.from),
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 34,
                          margin: const EdgeInsets.symmetric(horizontal: 10),
                          color: theme.dividerColor,
                        ),
                        Expanded(
                          child: _DateHeader(
                            label: 'To date',
                            value: _prettyDate.format(range.to),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            _PresetChip(
              label: '1 week',
              selected: _activePreset == 7,
              onTap: () => onPreset(7),
            ),
            _PresetChip(
              label: '2 weeks',
              selected: _activePreset == 14,
              onTap: () => onPreset(14),
            ),
            _PresetChip(
              label: '1 month',
              selected: _activePreset == 30,
              onTap: () => onPreset(30),
            ),
          ],
        ),
      ],
    );
  }
}

class _DateHeader extends StatelessWidget {
  final String label;
  final String value;

  const _DateHeader({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.primary,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _PresetChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _PresetChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: selected
          ? theme.colorScheme.primary
          : theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(99),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(99),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(99),
            border: Border.all(
              color: selected
                  ? theme.colorScheme.primary
                  : theme.dividerColor,
            ),
          ),
          child: Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: selected
                  ? theme.colorScheme.onPrimary
                  : theme.colorScheme.onSurface,
            ),
          ),
        ),
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  final ReportCounts counts;

  const _KpiGrid({required this.counts});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.38,
      children: [
        _KpiCard(
          label: 'Bookings',
          value: '${counts.bookings}',
          icon: Icons.local_taxi_rounded,
          color: AppColors.primary,
        ),
        _KpiCard(
          label: 'Completed',
          value: '${counts.completed}',
          icon: Icons.check_circle_rounded,
          color: AppColors.success,
        ),
        _KpiCard(
          label: 'Pending',
          value: '${counts.pending}',
          icon: Icons.schedule_rounded,
          color: AppColors.warning,
        ),
        _KpiCard(
          label: 'Revenue',
          value: formatInr(counts.revenue),
          icon: Icons.payments_rounded,
          color: AppColors.supportPurple,
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: theme.dividerColor.withValues(alpha: 0.7),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const Spacer(),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final String message;

  const _EmptyCard({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 28),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.7)),
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: theme.textTheme.bodyMedium,
      ),
    );
  }
}

class _StatusList extends StatelessWidget {
  final List<ReportStatusCount> rows;

  const _StatusList({required this.rows});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = rows.fold<int>(0, (sum, row) => sum + row.count);
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.7)),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) Divider(height: 1, color: theme.dividerColor),
            _StatusRow(row: rows[i], total: total),
          ],
        ],
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final ReportStatusCount row;
  final int total;

  const _StatusRow({required this.row, required this.total});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = BookingStatus.color(row.status);
    final pct = total == 0 ? 0.0 : row.count / total;

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  BookingStatus.label(row.status),
                  style: theme.textTheme.titleSmall,
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: pct,
                    minHeight: 5,
                    color: color,
                    backgroundColor: color.withValues(alpha: 0.12),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${row.count}',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                '${(pct * 100).round()}%',
                style: theme.textTheme.labelSmall,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
