import 'package:flutter/material.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';

class YaDropdown<T> extends StatelessWidget {
  final String? label;
  final bool required;
  final String? hint;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final String? Function(T?)? validator;

  const YaDropdown({
    super.key,
    this.label,
    this.required = false,
    this.hint,
    required this.value,
    required this.items,
    this.onChanged,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    final uniqueItems = <DropdownMenuItem<T>>[];
    final seen = <T?>{};
    for (final item in items) {
      if (seen.contains(item.value)) continue;
      seen.add(item.value);
      uniqueItems.add(item);
    }
    final selected = seen.contains(value) ? value : null;

    return YaField(
      label: label,
      required: required,
      child: DropdownButtonFormField<T>(
        key: ValueKey('$label-$selected-${uniqueItems.length}'),
        initialValue: selected,
        hint: hint == null ? null : Text(hint!),
        items: uniqueItems,
        onChanged: onChanged,
        validator: validator,
        isExpanded: true,
        decoration: const InputDecoration(),
      ),
    );
  }
}
