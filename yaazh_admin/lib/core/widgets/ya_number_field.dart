import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';

class YaNumberField extends StatelessWidget {
  final String? label;
  final bool required;
  final TextEditingController? controller;
  final String? hint;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final int? maxLength;
  final bool decimal;
  final Widget? prefixIcon;
  final TextInputAction? textInputAction;
  final bool enabled;

  const YaNumberField({
    super.key,
    this.label,
    this.required = false,
    this.controller,
    this.hint,
    this.validator,
    this.onChanged,
    this.maxLength,
    this.decimal = false,
    this.prefixIcon,
    this.textInputAction,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return YaField(
      label: label,
      required: required,
      child: TextFormField(
        controller: controller,
        enabled: enabled,
        keyboardType: decimal
            ? const TextInputType.numberWithOptions(decimal: true)
            : TextInputType.number,
        textInputAction: textInputAction ?? TextInputAction.next,
        maxLength: maxLength,
        onChanged: onChanged,
        inputFormatters: [
          if (decimal)
            FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))
          else
            FilteringTextInputFormatter.digitsOnly,
          if (maxLength != null) LengthLimitingTextInputFormatter(maxLength),
        ],
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: prefixIcon,
          counterText: '',
        ),
        validator: validator,
      ),
    );
  }
}
