import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yaazh_admin/app/constants.dart';

void main() {
  test('brand palette is defined', () {
    expect(AppColors.primary, const Color(0xFF4B49AC));
    expect(AppConstants.appName, 'Yaazh Admin');
  });
}
