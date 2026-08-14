import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';
import 'package:yaazh_admin/features/home/domain/dashboard_stats.dart';
import 'package:yaazh_admin/features/reports/data/report_repository.dart';
import 'package:yaazh_admin/features/reports/domain/report.dart';

class ReportsPage extends ConsumerWidget {
  const ReportsPage({super.key});

  String _hint(String period) {
    return switch (period) {
      'week' => 'Last 12 weeks',
      'month' => 'Last 12 months',
      _ => 'Last 14 days',
    };
  }

  String _trendTitle(String period) {
    return switch (period) {
      'week' => 'Weekly trend',
      'month' => 'Monthly trend',
      _ => 'Daily trend',
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final period = ref.watch(reportPeriodProvider);
    final reports = ref.watch(reportsProvider);
    final stats = ref.watch(dashboardStatsProvider);
    final theme = Theme.of(context);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Reports'),
          actions: [
            IconButton(
              tooltip: 'Open bookings',
              onPressed: () => context.go('/bookings'),
              icon: const Icon(Icons.local_taxi_rounded),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(reportsProvider);
            ref.invalidate(dashboardStatsProvider);
            await Future.wait([
              ref.read(reportsProvider.future),
              ref.read(dashboardStatsProvider.future),
            ]);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            children: [
              Text(
                'Booking trends and live counts.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.textTheme.bodySmall?.color,
                ),
              ),
              const SizedBox(height: 12),
              _PeriodTabs(
                value: period,
                onChanged: (next) =>
                    ref.read(reportPeriodProvider.notifier).state = next,
              ),
              const SizedBox(height: 16),
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
                    _KpiGrid(counts: data.counts, hint: _hint(period)),
                    const SizedBox(height: 16),
                    _Panel(
                      title: _trendTitle(period),
                      subtitle: 'Bookings vs completed',
                      child: data.series.every((p) => p.bookings == 0 && p.completed == 0)
                          ? Text(
                              'No booking activity in this period.',
                              style: theme.textTheme.bodySmall,
                            )
                          : _GroupedBarChart(points: data.series),
                    ),
                    const SizedBox(height: 12),
                    _Panel(
                      title: 'Status mix',
                      subtitle: 'All-time booking counts',
                      child: data.byStatus.isEmpty
                          ? Text('No status rows yet.', style: theme.textTheme.bodySmall)
                          : _StatusMix(rows: data.byStatus),
                    ),
                    const SizedBox(height: 12),
                    stats.when(
                      loading: () => const SizedBox.shrink(),
                      error: (_, _) => const SizedBox.shrink(),
                      data: (dash) => _Panel(
                        title: 'Volume pulse',
                        subtitle: 'Today · pending · fleet · customers',
                        child: _VolumeBars(stats: dash),
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

class _PeriodTabs extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const _PeriodTabs({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const items = [
      ('day', 'Day'),
      ('week', 'Week'),
      ('month', 'Month'),
    ];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppConstants.radiusM),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Row(
        children: [
          for (final item in items)
            Expanded(
              child: Material(
                color: value == item.$1
                    ? theme.colorScheme.primary
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  onTap: () => onChanged(item.$1),
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Text(
                      item.$2,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: value == item.$1
                            ? theme.colorScheme.onPrimary
                            : theme.colorScheme.onSurface,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  final ReportCounts counts;
  final String hint;

  const _KpiGrid({required this.counts, required this.hint});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _KpiCard(
                label: 'Total bookings',
                value: '${counts.bookings}',
                hint: hint,
                icon: Icons.local_taxi_rounded,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _KpiCard(
                label: 'Completed',
                value: '${counts.completed}',
                hint: hint,
                icon: Icons.check_circle_rounded,
                color: AppColors.success,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _KpiCard(
                label: 'Pending',
                value: '${counts.pending}',
                hint: hint,
                icon: Icons.schedule_rounded,
                color: AppColors.warning,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _KpiCard(
                label: 'Revenue',
                value: formatInr(counts.revenue),
                hint: 'Completed trips',
                icon: Icons.payments_rounded,
                color: AppColors.supportPurple,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String hint;
  final IconData icon;
  final Color color;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.hint,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 10),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(value, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(hint, style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;

  const _Panel({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.titleMedium),
          const SizedBox(height: 2),
          Text(subtitle, style: theme.textTheme.bodySmall),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _StatusMix extends StatelessWidget {
  final List<ReportStatusCount> rows;

  const _StatusMix({required this.rows});

  @override
  Widget build(BuildContext context) {
    final max = rows.fold<int>(0, (m, r) => r.count > m ? r.count : m);
    final theme = Theme.of(context);
    return Column(
      children: [
        for (final row in rows)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        BookingStatus.label(row.status),
                        style: theme.textTheme.titleSmall,
                      ),
                    ),
                    Text('${row.count}', style: theme.textTheme.titleSmall),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: max == 0 ? 0 : row.count / max,
                    minHeight: 8,
                    color: BookingStatus.color(row.status),
                    backgroundColor: theme.dividerColor.withValues(alpha: 0.35),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _VolumeBars extends StatelessWidget {
  final DashboardStats stats;

  const _VolumeBars({required this.stats});

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Today', stats.bookingsToday, AppColors.primary),
      ('Pending', stats.pendingBookings, AppColors.warning),
      ('Drivers', stats.activeDrivers, AppColors.success),
      ('Customers', stats.customers, AppColors.supportPurple),
      ('Enquiries', stats.enquiries, AppColors.salmon),
    ];
    final max = items.fold<int>(1, (m, i) => i.$2 > m ? i.$2 : m);
    return SizedBox(
      height: 160,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final item in items)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Column(
                  children: [
                    Text('${item.$2}', style: Theme.of(context).textTheme.labelSmall),
                    const SizedBox(height: 6),
                    Expanded(
                      child: Align(
                        alignment: Alignment.bottomCenter,
                        child: FractionallySizedBox(
                          heightFactor: (item.$2 / max).clamp(0.06, 1),
                          widthFactor: 0.62,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: item.$3,
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      item.$1,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _GroupedBarChart extends StatelessWidget {
  final List<ReportSeriesPoint> points;

  const _GroupedBarChart({required this.points});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final max = points.fold<int>(1, (m, p) {
      final local = p.bookings > p.completed ? p.bookings : p.completed;
      return local > m ? local : m;
    });
    final showEvery = points.length > 8 ? 2 : 1;

    return Column(
      children: [
        Row(
          children: [
            _LegendDot(color: theme.colorScheme.primary, label: 'Bookings'),
            const SizedBox(width: 12),
            const _LegendDot(color: AppColors.success, label: 'Completed'),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 180,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (var i = 0; i < points.length; i++)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Column(
                      children: [
                        Expanded(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Expanded(
                                child: FractionallySizedBox(
                                  heightFactor: (points[i].bookings / max).clamp(0.04, 1),
                                  alignment: Alignment.bottomCenter,
                                  child: DecoratedBox(
                                    decoration: BoxDecoration(
                                      color: theme.colorScheme.primary,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 2),
                              Expanded(
                                child: FractionallySizedBox(
                                  heightFactor: (points[i].completed / max).clamp(0.04, 1),
                                  alignment: Alignment.bottomCenter,
                                  child: DecoratedBox(
                                    decoration: BoxDecoration(
                                      color: AppColors.success,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          i % showEvery == 0 ? points[i].label : '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.labelSmall?.copyWith(fontSize: 9),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99)),
        ),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
