import 'package:intl/intl.dart';

class DateFormatter {
  static final DateFormat _dateTimeFormat = DateFormat('dd MMM yyyy, hh:mm a');
  static final DateFormat _dateFormat = DateFormat('dd MMM yyyy');
  static final DateFormat _timeFormat = DateFormat('hh:mm a');
  static final DateFormat _shortDateFormat = DateFormat('dd MMM');

  static String formatDateTime(DateTime? dateTime) {
    if (dateTime == null) return '—';
    return _dateTimeFormat.format(dateTime.toLocal());
  }

  static String formatDateTimeString(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      final dt = DateTime.parse(dateStr);
      return _dateTimeFormat.format(dt.toLocal());
    } catch (_) {
      return dateStr;
    }
  }

  static String formatDate(DateTime? date) {
    if (date == null) return '—';
    return _dateFormat.format(date.toLocal());
  }

  static String formatFullDate(DateTime? date) {
    if (date == null) return '—';
    return _dateFormat.format(date.toLocal());
  }

  static String formatDateString(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      final dt = DateTime.parse(dateStr);
      return _dateFormat.format(dt.toLocal());
    } catch (_) {
      return dateStr;
    }
  }

  static String formatTime(DateTime? date) {
    if (date == null) return '—';
    return _timeFormat.format(date.toLocal());
  }

  static String formatShortDate(DateTime? date) {
    if (date == null) return '—';
    return _shortDateFormat.format(date.toLocal());
  }

  static String calculateDuration(DateTime start, DateTime end) {
    final diff = end.difference(start);
    final days = diff.inDays;
    final hours = diff.inHours % 24;
    if (days > 0 && hours > 0) {
      return '$days d $hours h';
    } else if (days > 0) {
      return '$days day${days > 1 ? 's' : ''}';
    } else {
      return '${diff.inHours} hour${diff.inHours > 1 ? 's' : ''}';
    }
  }

  static bool isOverdue(DateTime? expectedReturn) {
    if (expectedReturn == null) return false;
    return DateTime.now().isAfter(expectedReturn);
  }
}
