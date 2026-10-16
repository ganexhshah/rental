import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/main.dart';
import 'package:app/core/constants/app_constants.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  testWidgets('Rental SaaS app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const RentalSaaSApp());
    await tester.pumpAndSettle(const Duration(milliseconds: 1500));
    expect(find.text(AppConstants.appName), findsOneWidget);
  });
}
