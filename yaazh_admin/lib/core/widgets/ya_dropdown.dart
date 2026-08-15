import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';
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
      child: FormField<T>(
        key: ValueKey('$label-$selected-${uniqueItems.length}'),
        initialValue: selected,
        validator: validator,
        builder: (state) {
          final current = seen.contains(state.value) ? state.value : selected;
          return _YaDropdownAnchor<T>(
            hint: hint,
            value: current,
            items: uniqueItems,
            errorText: state.errorText,
            enabled: onChanged != null,
            onChanged: (next) {
              state.didChange(next);
              onChanged?.call(next);
            },
          );
        },
      ),
    );
  }
}

class _YaDropdownAnchor<T> extends StatelessWidget {
  final String? hint;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final String? errorText;
  final bool enabled;
  final ValueChanged<T?> onChanged;

  const _YaDropdownAnchor({
    required this.hint,
    required this.value,
    required this.items,
    required this.errorText,
    required this.enabled,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    DropdownMenuItem<T>? selectedItem;
    for (final item in items) {
      if (item.value == value) {
        selectedItem = item;
        break;
      }
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        return MenuAnchor(
          alignmentOffset: const Offset(0, 6),
          consumeOutsideTap: true,
          style: MenuStyle(
            backgroundColor: WidgetStatePropertyAll(theme.colorScheme.surface),
            surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
            shadowColor: const WidgetStatePropertyAll(Colors.black26),
            elevation: const WidgetStatePropertyAll(6),
            minimumSize: WidgetStatePropertyAll(Size(width, 0)),
            maximumSize: WidgetStatePropertyAll(Size(width, 280)),
            padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(vertical: 6)),
            shape: WidgetStatePropertyAll(
              RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppConstants.radiusField),
                side: BorderSide(color: theme.dividerColor),
              ),
            ),
          ),
          builder: (context, controller, _) {
            return InkWell(
              onTap: !enabled || items.isEmpty
                  ? null
                  : () {
                      FocusManager.instance.primaryFocus?.unfocus();
                      controller.isOpen ? controller.close() : controller.open();
                    },
              borderRadius: BorderRadius.circular(AppConstants.radiusField),
              child: InputDecorator(
                isEmpty: selectedItem == null,
                decoration: InputDecoration(
                  hintText: hint,
                  errorText: errorText,
                  suffixIcon: AnimatedRotation(
                    turns: controller.isOpen ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: const Icon(Icons.keyboard_arrow_down_rounded),
                  ),
                ),
                child: selectedItem == null
                    ? null
                    : DefaultTextStyle.merge(
                        style: const TextStyle(
                          overflow: TextOverflow.ellipsis,
                        ),
                        child: selectedItem.child,
                      ),
              ),
            );
          },
          menuChildren: [
            for (final item in items)
              MenuItemButton(
                onPressed: !item.enabled
                    ? null
                    : () => onChanged(item.value),
                style: ButtonStyle(
                  minimumSize: WidgetStatePropertyAll(Size(width, 44)),
                  padding: const WidgetStatePropertyAll(
                    EdgeInsets.symmetric(horizontal: 14),
                  ),
                  backgroundColor: WidgetStatePropertyAll(
                    item.value == value
                        ? theme.colorScheme.secondaryContainer
                        : Colors.transparent,
                  ),
                ),
                child: item.child,
              ),
          ],
        );
      },
    );
  }
}
