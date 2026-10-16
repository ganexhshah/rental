import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../models/customer_model.dart';
import '../../providers/customer_provider.dart';
import '../buttons/app_buttons.dart';
import '../feedback/app_feedback.dart';

/// Full-featured Customer Registration Sheet supporting Nepali Nationals and International Tourists.
class AddCustomerSheet extends StatefulWidget {
  const AddCustomerSheet({super.key});

  /// Convenient static helper to display the sheet modal and return newly created customer.
  static Future<Customer?> show(BuildContext context) {
    return showModalBottomSheet<Customer>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddCustomerSheet(),
    );
  }

  @override
  State<AddCustomerSheet> createState() => _AddCustomerSheetState();
}

class _AddCustomerSheetState extends State<AddCustomerSheet> {
  final _formKey = GlobalKey<FormState>();

  // Customer Type / Nationality
  bool _isNepaliNational = true;
  bool _isVerified = true;

  // Form Controllers
  final TextEditingController _fullNameCtrl = TextEditingController();
  final TextEditingController _phoneCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _idNumberCtrl = TextEditingController();
  final TextEditingController _addressCtrl = TextEditingController();
  final TextEditingController _permanentAddressCtrl = TextEditingController();
  final TextEditingController _emergencyContactCtrl = TextEditingController();
  final TextEditingController _emergencyPhoneCtrl = TextEditingController();
  final TextEditingController _notesCtrl = TextEditingController();

  // Document Type & Category
  String _selectedDocType = 'Driving License';
  String _selectedCategory = 'Category A — Motorcycle / Scooter';

  // Verification & Photocopy
  bool _photocopyCollected = true;

  // Accordion Expand State
  bool _showAdditionalInfo = false;

  // Mock Photo Attachment
  String? _attachedFileName;
  bool _isSubmitting = false;

  static const List<String> _nepaliDocTypes = [
    'Driving License',
    'Citizenship Card',
    'Passport',
    'National Identity Card',
  ];

  static const List<String> _touristDocTypes = [
    'Passport',
    'International Driving Permit (IDP)',
    'Foreign Driving License',
  ];

  static const List<String> _licenseCategories = [
    'Category A — Motorcycle / Scooter',
    'Category B — Car / Jeep / Delivery Van',
    'Category C — Light Medium Commercial',
    'Category K — Scooter Only',
    'Category A & B — Two & Four Wheelers',
  ];

  static const List<String> _quickLocations = [
    'Kathmandu, Nepal',
    'Thamel, Kathmandu',
    'Lakeside, Pokhara',
    'Lalitpur / Patan',
    'Jhamsikhel, Lalitpur',
    'Boudha, Kathmandu',
    'Lazimpat, Kathmandu',
  ];

  @override
  void initState() {
    super.initState();
    _selectedDocType = _isNepaliNational ? _nepaliDocTypes.first : _touristDocTypes.first;
    _addressCtrl.text = _quickLocations.first;
  }

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _idNumberCtrl.dispose();
    _addressCtrl.dispose();
    _permanentAddressCtrl.dispose();
    _emergencyContactCtrl.dispose();
    _emergencyPhoneCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  void _onNationalityChanged(bool isNepali) {
    setState(() {
      _isNepaliNational = isNepali;
      final docTypes = isNepali ? _nepaliDocTypes : _touristDocTypes;
      _selectedDocType = docTypes.first;
      if (!isNepali && _addressCtrl.text == 'Kathmandu, Nepal') {
        _addressCtrl.text = 'Thamel, Kathmandu';
      }
    });
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isSubmitting = true);

    final payload = {
      'full_name': _fullNameCtrl.text.trim(),
      'phone': _phoneCtrl.text.trim(),
      'email': _emailCtrl.text.trim().isNotEmpty
          ? _emailCtrl.text.trim()
          : '${_phoneCtrl.text.trim()}@rental.guest',
      'nationality': _isNepaliNational ? 'Nepali' : 'International Tourist',
      'verification_status': _isVerified ? 'verified' : 'pending',
      'license_number': _idNumberCtrl.text.trim().isNotEmpty ? _idNumberCtrl.text.trim() : null,
      'license_category': _selectedDocType == 'Driving License' ? _selectedCategory : null,
      'address': _addressCtrl.text.trim(),
      'permanent_address': _permanentAddressCtrl.text.trim(),
      'emergency_contact_name': _emergencyContactCtrl.text.trim(),
      'emergency_contact_phone': _emergencyPhoneCtrl.text.trim(),
      'notes': [
        if (_photocopyCollected) 'Physical paper photocopy collected at counter.',
        if (_attachedFileName != null) 'ID Scan Attached: $_attachedFileName.',
        if (_notesCtrl.text.trim().isNotEmpty) _notesCtrl.text.trim(),
      ].join(' '),
    };

    final customerProv = context.read<CustomerProvider>();
    final newCustomer = await customerProv.createCustomer(payload);

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (newCustomer != null) {
      Navigator.of(context).pop(newCustomer);
      AppFeedback.showToast(
        context,
        message: 'Customer ${newCustomer.fullName} registered successfully',
        type: ToastType.success,
      );
    } else {
      AppFeedback.showToast(
        context,
        message: customerProv.errorMessage ?? 'Failed to register customer',
        type: ToastType.error,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Material(
      color: Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.92,
        child: Column(
          children: [
            // Drag Handle
            Center(
              child: Container(
                width: 44,
                height: 4,
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                decoration: BoxDecoration(
                  color: Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.xs, AppSpacing.sm, AppSpacing.xs),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.12),
                      borderRadius: AppRadius.sm,
                    ),
                    child: const Icon(Icons.person_add_alt_1_rounded, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  const Expanded(
                    child: Text(
                      'Customer Registration',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  // Verified Badge Toggle
                  InkWell(
                    onTap: () => setState(() => _isVerified = !_isVerified),
                    borderRadius: AppRadius.full,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: _isVerified ? const Color(0xFFE8F5E9) : const Color(0xFFFFF3E0),
                        borderRadius: AppRadius.full,
                        border: Border.all(
                          color: _isVerified ? const Color(0xFF81C784) : const Color(0xFFFFB74D),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _isVerified ? Icons.check_circle_rounded : Icons.pending_rounded,
                            size: 14,
                            color: _isVerified ? const Color(0xFF2E7D32) : const Color(0xFFE65100),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _isVerified ? 'Verified' : 'Pending',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _isVerified ? const Color(0xFF2E7D32) : const Color(0xFFE65100),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Scrollable Form Body
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, bottomInset + AppSpacing.xl),
                  children: [
                    // 1. Nationality Toggle (Nepali National vs International Tourist)
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: AppRadius.md,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => _onNationalityChanged(true),
                              borderRadius: AppRadius.md,
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: _isNepaliNational ? Colors.white : Colors.transparent,
                                  borderRadius: AppRadius.md,
                                  boxShadow: _isNepaliNational
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.06),
                                            blurRadius: 4,
                                            offset: const Offset(0, 2),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.badge_rounded,
                                      size: 16,
                                      color: _isNepaliNational ? AppColors.primary : const Color(0xFF64748B),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Nepali National',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: _isNepaliNational ? FontWeight.bold : FontWeight.w500,
                                        color: _isNepaliNational ? AppColors.primary : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => _onNationalityChanged(false),
                              borderRadius: AppRadius.md,
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: !_isNepaliNational ? Colors.white : Colors.transparent,
                                  borderRadius: AppRadius.md,
                                  boxShadow: !_isNepaliNational
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.06),
                                            blurRadius: 4,
                                            offset: const Offset(0, 2),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.flight_takeoff_rounded,
                                      size: 16,
                                      color: !_isNepaliNational ? AppColors.primary : const Color(0xFF64748B),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'International Tourist',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: !_isNepaliNational ? FontWeight.bold : FontWeight.w500,
                                        color: !_isNepaliNational ? AppColors.primary : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // 2. Personal Information
                    const Text('1. Customer Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: AppSpacing.sm),

                    TextFormField(
                      controller: _fullNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Full Name *',
                        hintText: 'e.g. Ramesh Karki / John Doe',
                        prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Full name is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    TextFormField(
                      controller: _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number *',
                        hintText: 'e.g. 9841234567 / +977 98...',
                        prefixIcon: Icon(Icons.phone_outlined, size: 20),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Phone number is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    TextFormField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email Address',
                        hintText: 'customer@gmail.com',
                        prefixIcon: Icon(Icons.email_outlined, size: 20),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // 3. Identity Document Section
                    const Text('2. Identity Document', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: AppSpacing.sm),

                    DropdownButtonFormField<String>(
                      value: _selectedDocType,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Document Type *',
                        prefixIcon: Icon(Icons.description_outlined, size: 20),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      items: (_isNepaliNational ? _nepaliDocTypes : _touristDocTypes).map((type) {
                        return DropdownMenuItem(
                          value: type,
                          child: Text(type, overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedDocType = val);
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    TextFormField(
                      controller: _idNumberCtrl,
                      decoration: InputDecoration(
                        labelText: 'Number / Reference',
                        hintText: _selectedDocType == 'Driving License'
                            ? 'e.g. 01-06-0044921'
                            : _selectedDocType == 'Passport'
                                ? 'e.g. PP 09283741'
                                : 'Document Identification Number',
                        prefixIcon: const Icon(Icons.pin_outlined, size: 20),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // Category (Shown when Driving License)
                    if (_selectedDocType == 'Driving License') ...[
                      DropdownButtonFormField<String>(
                        value: _selectedCategory,
                        isExpanded: true,
                        decoration: const InputDecoration(
                          labelText: 'License Category',
                          prefixIcon: Icon(Icons.two_wheeler_rounded, size: 20),
                          contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                        items: _licenseCategories.map((cat) {
                          return DropdownMenuItem(
                            value: cat,
                            child: Text(cat, overflow: TextOverflow.ellipsis),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedCategory = val);
                        },
                      ),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    const SizedBox(height: AppSpacing.lg),

                    // 4. Stay Location / Address Section
                    const Text('3. Stay Location / Address', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: AppSpacing.xs),
                    // Quick location selection pills
                    SizedBox(
                      height: 38,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _quickLocations.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 6),
                        itemBuilder: (ctx, idx) {
                          final loc = _quickLocations[idx];
                          final isSelected = _addressCtrl.text == loc;
                          return ChoiceChip(
                            label: Text(loc, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isSelected ? Colors.white : const Color(0xFF475569))),
                            selected: isSelected,
                            selectedColor: AppColors.primary,
                            backgroundColor: const Color(0xFFF1F5F9),
                            side: BorderSide.none,
                            onSelected: (sel) {
                              if (sel) setState(() => _addressCtrl.text = loc);
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    TextFormField(
                      controller: _addressCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Address / Hotel / Room',
                        hintText: 'e.g. Kathmandu, Nepal',
                        prefixIcon: Icon(Icons.location_on_outlined, size: 20),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // 5. Photocopy Verification Tile
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: AppRadius.md,
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: SwitchListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                        secondary: const Icon(Icons.copy_all_rounded, color: AppColors.primary, size: 22),
                        title: const Text(
                          'Physical paper photocopy collected at counter',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                        subtitle: const Text(
                          'Hard copy verified & archived in counter file folder',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                        value: _photocopyCollected,
                        activeColor: AppColors.primary,
                        onChanged: (v) => setState(() => _photocopyCollected = v),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // 6. Additional Information (Optional Collapsible Accordion)
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: AppRadius.md,
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Theme(
                        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                        child: ExpansionTile(
                          initiallyExpanded: _showAdditionalInfo,
                          onExpansionChanged: (v) => setState(() => _showAdditionalInfo = v),
                          leading: const Icon(Icons.contact_mail_outlined, color: AppColors.primary, size: 20),
                          title: const Text(
                            'Additional Information (Optional)',
                            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                          subtitle: const Text(
                            'Permanent address & emergency contacts',
                            style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                              child: Column(
                                children: [
                                  TextFormField(
                                    controller: _permanentAddressCtrl,
                                    decoration: const InputDecoration(
                                      labelText: 'Permanent Address',
                                      hintText: 'e.g. Pokhara-17, Kaski, Gandaki',
                                      prefixIcon: Icon(Icons.home_outlined, size: 20),
                                      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    ),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  TextFormField(
                                    controller: _emergencyContactCtrl,
                                    decoration: const InputDecoration(
                                      labelText: 'Emergency Contact Person',
                                      hintText: 'e.g. Suman Karki (Brother)',
                                      prefixIcon: Icon(Icons.contacts_outlined, size: 20),
                                      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    ),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  TextFormField(
                                    controller: _emergencyPhoneCtrl,
                                    keyboardType: TextInputType.phone,
                                    decoration: const InputDecoration(
                                      labelText: 'Emergency Phone',
                                      hintText: 'e.g. 9801234567',
                                      prefixIcon: Icon(Icons.phone_forwarded_outlined, size: 20),
                                      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // 7. Document Photo Attachment (Optional)
                    const Text('4. Document Photo Attachment (Optional)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: AppSpacing.sm),

                    if (_attachedFileName == null)
                      InkWell(
                        onTap: () {
                          // Simulate ID document upload
                          setState(() {
                            _attachedFileName = _selectedDocType == 'Driving License'
                                ? 'nepal_license_front.jpg'
                                : 'passport_bio_page.pdf';
                          });
                          AppFeedback.showToast(context, message: 'ID document scan attached', type: ToastType.info);
                        },
                        borderRadius: AppRadius.md,
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: AppRadius.md,
                            border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid),
                          ),
                          child: Column(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.cloud_upload_outlined, color: AppColors.primary, size: 26),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Upload ID Scan',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'PNG, JPG, or PDF up to 10MB',
                                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: AppRadius.md,
                          border: Border.all(color: const Color(0xFF86EFAC)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _attachedFileName!,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF166534)),
                                  ),
                                  const Text('1.8 MB • Verified Document Scan', style: TextStyle(fontSize: 11, color: Color(0xFF15803D))),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close_rounded, size: 18, color: Color(0xFF64748B)),
                              onPressed: () => setState(() => _attachedFileName = null),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: AppSpacing.xl),

                    // 8. Notes
                    const Text('5. Notes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      controller: _notesCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: 'Additional counter notes, verification remarks, or special requests...',
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                  ],
                ),
              ),
            ),

            // Sticky Bottom Confirmation Action
            Container(
              padding: EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.md,
                AppSpacing.lg,
                AppSpacing.md + MediaQuery.paddingOf(context).bottom,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -3)),
                ],
              ),
              child: PrimaryButton(
                label: 'Register & Complete KYC',
                icon: Icons.how_to_reg_rounded,
                isLoading: _isSubmitting,
                onPressed: _handleRegister,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
