import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_bottom_sheet.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';

final _monthYear = DateFormat('MMMM yyyy');
final _display = DateFormat('dd MMM yyyy');

class YaDateField extends StatelessWidget {
  final String? label;
  final bool required;
  final String hint;
  final DateTime? value;
  final DateTime? minDate;
  final DateTime? maxDate;
  final ValueChanged<DateTime?> onChanged;
  final bool allowClear;

  const YaDateField({
    super.key,
    this.label,
    this.required = false,
    this.hint = 'Select date',
    required this.value,
    this.minDate,
    this.maxDate,
    required this.onChanged,
    this.allowClear = true,
  });

  Future<void> _open(BuildContext context) async {
    hideKeyboard();
    final now = DateTime.now();
    final picked = await showYaDatePicker(
      context,
      initialDate: value,
      minDate: minDate ?? DateTime(now.year - 20),
      maxDate: maxDate ?? DateTime(now.year + 40),
      allowClear: allowClear && value != null,
    );
    if (picked == null) return;
    onChanged(picked.date);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.color;

    return YaField(
      label: label,
      required: required,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _open(context),
          borderRadius: BorderRadius.circular(AppConstants.radiusField),
          child: InputDecorator(
            decoration: const InputDecoration(
              suffixIcon: Icon(Icons.event_rounded),
            ),
            child: Text(
              value == null ? hint : _display.format(value!),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: value == null ? muted : theme.colorScheme.onSurface,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class YaDatePick {
  final DateTime? date;
  const YaDatePick(this.date);
}

Future<YaDatePick?> showYaDatePicker(
  BuildContext context, {
  DateTime? initialDate,
  required DateTime minDate,
  required DateTime maxDate,
  bool allowClear = true,
}) {
  return showYaSheet<YaDatePick>(
    context: context,
    builder: (ctx) => _YaDatePickerSheet(
      initialDate: initialDate,
      minDate: minDate,
      maxDate: maxDate,
      allowClear: allowClear,
    ),
  );
}

class _YaDatePickerSheet extends StatefulWidget {
  final DateTime? initialDate;
  final DateTime minDate;
  final DateTime maxDate;
  final bool allowClear;

  const _YaDatePickerSheet({
    required this.initialDate,
    required this.minDate,
    required this.maxDate,
    required this.allowClear,
  });

  @override
  State<_YaDatePickerSheet> createState() => _YaDatePickerSheetState();
}

class _YaDatePickerSheetState extends State<_YaDatePickerSheet> {
  late DateTime _view;
  DateTime? _selected;

  DateTime get _min => DateTime(widget.minDate.year, widget.minDate.month, widget.minDate.day);
  DateTime get _max => DateTime(widget.maxDate.year, widget.maxDate.month, widget.maxDate.day);

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selected = widget.initialDate == null
        ? null
        : DateTime(widget.initialDate!.year, widget.initialDate!.month, widget.initialDate!.day);
    final seed = _selected ?? now;
    _view = DateTime(seed.year, seed.month);
    _view = _clampMonth(_view);
  }

  DateTime _clampMonth(DateTime month) {
    final minMonth = DateTime(_min.year, _min.month);
    final maxMonth = DateTime(_max.year, _max.month);
    if (month.isBefore(minMonth)) return minMonth;
    if (month.isAfter(maxMonth)) return maxMonth;
    return month;
  }

  bool _selectable(DateTime day) {
    final d = DateTime(day.year, day.month, day.day);
    return !d.isBefore(_min) && !d.isAfter(_max);
  }

  void _shiftMonth(int delta) {
    setState(() => _view = _clampMonth(DateTime(_view.year, _view.month + delta)));
  }

  void _shiftYear(int delta) {
    setState(() => _view = _clampMonth(DateTime(_view.year + delta, _view.month)));
  }

  void _pick(DateTime day) {
    if (!_selectable(day)) return;
    Navigator.of(context).pop(YaDatePick(DateTime(day.year, day.month, day.day)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final first = DateTime(_view.year, _view.month, 1);
    final daysInMonth = DateTime(_view.year, _view.month + 1, 0).day;
    final lead = first.weekday % 7;
    final cells = <DateTime?>[
      ...List<DateTime?>.filled(lead, null),
      ...List.generate(daysInMonth, (i) => DateTime(_view.year, _view.month, i + 1)),
    ];
    while (cells.length % 7 != 0) {
      cells.add(null);
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            _navBtn(theme, Icons.keyboard_double_arrow_left_rounded, () => _shiftYear(-1)),
            _navBtn(theme, Icons.chevron_left_rounded, () => _shiftMonth(-1)),
            Expanded(
              child: Text(
                _monthYear.format(_view),
                textAlign: TextAlign.center,
                style: theme.textTheme.titleMedium,
              ),
            ),
            _navBtn(theme, Icons.chevron_right_rounded, () => _shiftMonth(1)),
            _navBtn(theme, Icons.keyboard_double_arrow_right_rounded, () => _shiftYear(1)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            for (final d in const ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'])
              Expanded(
                child: Text(
                  d,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        for (var r = 0; r < cells.length / 7; r++)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: [
                for (var c = 0; c < 7; c++)
                  Expanded(child: _dayCell(theme, today, cells[r * 7 + c])),
              ],
            ),
          ),
        const SizedBox(height: 8),
        Row(
          children: [
            TextButton(
              onPressed: _selectable(today) ? () => _pick(today) : null,
              child: const Text('Today'),
            ),
            if (widget.allowClear)
              TextButton(
                onPressed: () => Navigator.pop(context, const YaDatePick(null)),
                child: const Text('Clear'),
              ),
            const Spacer(),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _navBtn(ThemeData theme, IconData icon, VoidCallback onTap) {
    return IconButton(
      visualDensity: VisualDensity.compact,
      onPressed: onTap,
      icon: Icon(icon, color: theme.colorScheme.onSurface),
    );
  }

  Widget _dayCell(ThemeData theme, DateTime today, DateTime? day) {
    if (day == null) return const SizedBox(height: 40);
    final selected = _selected != null &&
        day.year == _selected!.year &&
        day.month == _selected!.month &&
        day.day == _selected!.day;
    final isToday = day == today;
    final enabled = _selectable(day);
    final bg = selected
        ? theme.colorScheme.primary
        : Colors.transparent;
    final fg = !enabled
        ? theme.disabledColor
        : selected
            ? theme.colorScheme.onPrimary
            : theme.colorScheme.onSurface;

    return Padding(
      padding: const EdgeInsets.all(2),
      child: Material(
        color: bg,
        borderRadius: BorderRadius.circular(AppConstants.radiusField),
        child: InkWell(
          onTap: enabled ? () => _pick(day) : null,
          borderRadius: BorderRadius.circular(AppConstants.radiusField),
          child: SizedBox(
            height: 40,
            child: Center(
              child: DecoratedBox(
                decoration: isToday && !selected
                    ? BoxDecoration(
                        border: Border.all(color: theme.colorScheme.primary),
                        borderRadius: BorderRadius.circular(AppConstants.radiusField),
                      )
                    : const BoxDecoration(),
                child: SizedBox(
                  width: 36,
                  height: 36,
                  child: Center(
                    child: Text(
                      '${day.day}',
                      style: TextStyle(
                        color: fg,
                        fontWeight: selected || isToday ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
