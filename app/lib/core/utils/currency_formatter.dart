import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _formatter = NumberFormat('#,##,##0.00', 'en_IN');
  static final NumberFormat _compactFormatter = NumberFormat('#,##,##0', 'en_IN');

  static String format(
    double? amount, {
    String symbol = 'Rs.',
    bool showDecimals = true,
  }) {
    if (amount == null) return '$symbol 0.00';
    final formatted = showDecimals
        ? _formatter.format(amount)
        : _compactFormatter.format(amount);
    return '$symbol $formatted';
  }

  static String formatDifference(double amount, {String symbol = 'Rs.'}) {
    if (amount > 0) {
      return '+$symbol ${_formatter.format(amount)}';
    } else if (amount < 0) {
      return '-$symbol ${_formatter.format(amount.abs())}';
    }
    return '$symbol 0.00';
  }
}
