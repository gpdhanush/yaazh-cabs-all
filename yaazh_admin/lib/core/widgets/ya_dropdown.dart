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
    return YaField(
      label: label,
      required: required,
      child: DropdownButtonFormField<T>(
        key: ValueKey('$label-$value'),
        initialValue: value,
        hint: hint == null ? null : Text(hint!),
        items: items,
        onChanged: onChanged,
        validator: validator,
        isExpanded: true,
        decoration: const InputDecoration(),
      ),
    );
  }
}
