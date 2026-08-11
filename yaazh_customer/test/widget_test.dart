import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/main.dart';

void main() {
  testWidgets('app boots', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: YaazhCustomerApp()));
    await tester.pump();
    expect(find.text('Yaazh Cabs'), findsWidgets);
  });
}
