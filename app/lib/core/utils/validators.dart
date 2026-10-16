class Validators {
  static String? requiredField(String? value, [String message = 'This field is required']) {
    if (value == null || value.trim().isEmpty) {
      return message;
    }
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email address is required';
    }
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return null;
  }

  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Phone number is required';
    }
    if (value.trim().length < 7) {
      return 'Please enter a valid phone number';
    }
    return null;
  }

  static String? odometer(String? value, {int? previousOdometer}) {
    if (value == null || value.trim().isEmpty) {
      return 'Odometer reading is required';
    }
    final num = int.tryParse(value.trim());
    if (num == null || num < 0) {
      return 'Enter a valid positive number';
    }
    if (previousOdometer != null && num < previousOdometer) {
      return 'Cannot be less than pickup ($previousOdometer km)';
    }
    return null;
  }

  static String? positiveNumber(String? value, [String message = 'Must be greater than 0']) {
    if (value == null || value.trim().isEmpty) return null;
    final num = double.tryParse(value.trim());
    if (num == null || num < 0) {
      return message;
    }
    return null;
  }
}
