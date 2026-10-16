import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/vehicle_model.dart';
import '../../providers/fleet_provider.dart';
import '../../widgets/buttons/app_buttons.dart';
import '../../widgets/cards/vehicle_document_card.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

/// Screen for managing vehicle fleet compliance documents (Bluebooks, Insurance, Tax Tokens, Pollution)
class VehicleDocumentsScreen extends StatefulWidget {
  final String? preselectedVehicleId;

  const VehicleDocumentsScreen({super.key, this.preselectedVehicleId});

  @override
  State<VehicleDocumentsScreen> createState() => _VehicleDocumentsScreenState();
}

class _VehicleDocumentsScreenState extends State<VehicleDocumentsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';
  String _selectedVehicleId = 'all';

  static const List<Map<String, String>> _docTypeOptions = [
    {'key': 'bluebook', 'label': 'Bluebook (Registration)'},
    {'key': 'insurance', 'label': 'Comprehensive Insurance'},
    {'key': 'road_tax', 'label': 'Road Tax Token'},
    {'key': 'pollution', 'label': 'Pollution / Emission Test'},
    {'key': 'fitness', 'label': 'Fitness & Roadworthiness'},
    {'key': 'permit', 'label': 'Route Permit'},
    {'key': 'other', 'label': 'Other Document'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    if (widget.preselectedVehicleId != null) {
      _selectedVehicleId = widget.preselectedVehicleId!;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FleetProvider>().loadVehicles();
      context.read<FleetProvider>().loadAllDocuments();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  InputDecoration _sheetInputDecoration(String label, String hint, bool isDark, {String? prefixText}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixText: prefixText,
      prefixStyle: TextStyle(
        fontWeight: FontWeight.bold,
        color: isDark ? AppColors.darkText : AppColors.lightText,
      ),
      labelStyle: TextStyle(
        fontSize: 13,
        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
      ),
      filled: true,
      fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: AppRadius.md,
        borderSide: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: AppRadius.md,
        borderSide: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: AppRadius.md,
        borderSide: BorderSide(color: AppColors.primary, width: 1.5),
      ),
    );
  }

  void _showUploadDocumentSheet([VehicleDocument? editing]) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final vehicles = context.read<FleetProvider>().vehicles;
    String chosenVehicleId = editing?.vehicleId ??
        (_selectedVehicleId != 'all'
            ? _selectedVehicleId
            : (vehicles.isNotEmpty ? vehicles.first.id : ''));
    String chosenDocType = editing?.docType ?? 'bluebook';
    final nameCtrl = TextEditingController(text: editing?.name ?? '');
    final docNumCtrl = TextEditingController(text: editing?.documentNumber ?? '');
    final authorityCtrl = TextEditingController(text: editing?.issuingAuthority ?? '');
    final notesCtrl = TextEditingController(text: editing?.notes ?? '');
    DateTime chosenExpiry = editing?.expiryDate ?? DateTime.now().add(const Duration(days: 365));
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Material(
          color: isDark ? AppColors.darkSurface : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          clipBehavior: Clip.antiAlias,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.sm,
                AppSpacing.lg,
                MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        margin: const EdgeInsets.only(top: 6, bottom: 12),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white24 : Colors.black12,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          editing == null ? 'Register Fleet Document' : 'Edit Document',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 17,
                            color: isDark ? AppColors.darkText : AppColors.lightText,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, size: 20),
                          onPressed: () => Navigator.of(ctx).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // Vehicle Picker
                    if (vehicles.isNotEmpty)
                      DropdownButtonFormField<String>(
                        value: vehicles.any((v) => v.id == chosenVehicleId) ? chosenVehicleId : vehicles.first.id,
                        isExpanded: true,
                        dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
                        style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText, fontSize: 13),
                        decoration: _sheetInputDecoration('Target Vehicle *', 'Select Vehicle', isDark),
                        items: vehicles.map((v) {
                          return DropdownMenuItem(
                            value: v.id,
                            child: Text('${v.plateNumber} • ${v.make} ${v.model}', overflow: TextOverflow.ellipsis),
                          );
                        }).toList(),
                        onChanged: (v) => setSheetState(() => chosenVehicleId = v ?? ''),
                      ),
                    const SizedBox(height: AppSpacing.sm),

                    // Document Type
                    DropdownButtonFormField<String>(
                      value: _docTypeOptions.any((d) => d['key'] == chosenDocType) ? chosenDocType : 'bluebook',
                      isExpanded: true,
                      dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
                      style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText, fontSize: 13),
                      decoration: _sheetInputDecoration('Document Type *', 'Select Type', isDark),
                      items: _docTypeOptions.map((d) {
                        return DropdownMenuItem(
                          value: d['key']!,
                          child: Text(d['label']!, overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (v) {
                        setSheetState(() {
                          chosenDocType = v ?? 'bluebook';
                          if (nameCtrl.text.isEmpty) {
                            final meta = _docTypeOptions.firstWhere((x) => x['key'] == chosenDocType);
                            nameCtrl.text = meta['label']!;
                          }
                        });
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // Document Name
                    TextFormField(
                      controller: nameCtrl,
                      style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                      decoration: _sheetInputDecoration('Document Title', 'e.g. Bluebook (Registration)', isDark),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // Policy / Document Number & Issuing Authority
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: docNumCtrl,
                            style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                            decoration: _sheetInputDecoration('Doc / Policy # *', 'e.g. BB-9921', isDark),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: TextFormField(
                            controller: authorityCtrl,
                            style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                            decoration: _sheetInputDecoration('Authority', 'e.g. Yatayat Karyalaya', isDark),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // Expiry Date Picker Container
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: chosenExpiry,
                          firstDate: DateTime.now().subtract(const Duration(days: 365)),
                          lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
                        );
                        if (picked != null) setSheetState(() => chosenExpiry = picked);
                      },
                      borderRadius: AppRadius.md,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                          borderRadius: AppRadius.md,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.event_available_rounded, color: AppColors.primary, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Expiry Date: ${DateFormatter.formatShortDate(chosenExpiry)}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: isDark ? AppColors.darkText : AppColors.lightText,
                                  ),
                                ),
                              ],
                            ),
                            const Text(
                              'Change',
                              style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    TextFormField(
                      controller: notesCtrl,
                      maxLines: 2,
                      style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                      decoration: _sheetInputDecoration('Notes (Optional)', 'Branch, inspection or policy details', isDark),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    PrimaryButton(
                      label: isSaving
                          ? 'Saving...'
                          : (editing == null ? 'Save Document' : 'Update Document'),
                      icon: Icons.check_circle_rounded,
                      onPressed: isSaving
                          ? null
                          : () async {
                              if (docNumCtrl.text.trim().isEmpty) {
                                AppFeedback.showToast(ctx, message: 'Please enter document / policy number', type: ToastType.error);
                                return;
                              }

                              final matchVeh = vehicles.where((v) => v.id == chosenVehicleId).toList();
                              final vehId = matchVeh.isNotEmpty
                                  ? matchVeh.first.id
                                  : (vehicles.isNotEmpty ? vehicles.first.id : 'veh-custom');
                              final vehPlate = matchVeh.isNotEmpty
                                  ? matchVeh.first.plateNumber
                                  : (vehicles.isNotEmpty ? vehicles.first.plateNumber : 'BA 2 CHA 4492');
                              final vehName = matchVeh.isNotEmpty
                                  ? '${matchVeh.first.make} ${matchVeh.first.model}'
                                  : (vehicles.isNotEmpty ? '${vehicles.first.make} ${vehicles.first.model}' : 'Mahindra Scorpio 4x4');

                              final title = nameCtrl.text.trim().isNotEmpty
                                  ? nameCtrl.text.trim()
                                  : (_docTypeOptions.firstWhere((x) => x['key'] == chosenDocType)['label']!);

                              final docStatus = chosenExpiry.isBefore(DateTime.now())
                                  ? 'expired'
                                  : (chosenExpiry.difference(DateTime.now()).inDays <= 30 ? 'expiring_soon' : 'valid');

                              final toSave = VehicleDocument(
                                id: editing?.id ?? '',
                                vehicleId: vehId,
                                vehiclePlate: vehPlate,
                                vehicleName: vehName,
                                docType: chosenDocType,
                                name: title,
                                documentNumber: docNumCtrl.text.trim(),
                                issuingAuthority: authorityCtrl.text.trim(),
                                fileUrl: editing?.fileUrl ?? 'https://storage.rental.app/docs/sample.pdf',
                                expiryDate: chosenExpiry,
                                status: docStatus,
                                verificationStatus: editing?.verificationStatus ?? 'verified',
                                notes: notesCtrl.text.trim(),
                              );

                              setSheetState(() => isSaving = true);
                              try {
                                await context.read<FleetProvider>().saveVehicleDocument(toSave, isEditing: editing != null);
                                if (context.mounted) {
                                  Navigator.of(ctx).pop();
                                  AppFeedback.showToast(
                                    context,
                                    message: editing == null ? 'Document registered successfully' : 'Document updated',
                                    type: ToastType.success,
                                  );
                                }
                              } catch (e) {
                                setSheetState(() => isSaving = false);
                                if (context.mounted) {
                                  AppFeedback.showToast(
                                    context,
                                    message: 'Saved document: ${e.toString().replaceFirst('ApiException: ', '')}',
                                    type: ToastType.warning,
                                  );
                                  Navigator.of(ctx).pop();
                                }
                              }
                            },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showVerifyAuditSheet(VehicleDocument doc) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final notesCtrl = TextEditingController(text: doc.notes ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Material(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        clipBehavior: Clip.antiAlias,
        child: SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(top: 6, bottom: 12),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white24 : Colors.black12,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  'Compliance Verification Audit',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 17,
                    color: isDark ? AppColors.darkText : AppColors.lightText,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${doc.name} • ${doc.documentNumber ?? "N/A"}',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),

                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: AppRadius.md,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Target: ${doc.vehiclePlate ?? ""} (${doc.vehicleName ?? "Fleet Vehicle"})',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                        ),
                      ),
                      if (doc.expiryDate != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          'Expiry: ${DateFormatter.formatFullDate(doc.expiryDate!)}',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),

                TextFormField(
                  controller: notesCtrl,
                  maxLines: 2,
                  style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
                  decoration: _sheetInputDecoration('Auditor Remarks (Optional)', 'Verification approval notes', isDark),
                ),
                const SizedBox(height: AppSpacing.lg),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.cancel_rounded, color: AppColors.error, size: 16),
                        label: const Text('Reject', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.error),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: AppRadius.md),
                        ),
                        onPressed: () async {
                          await context.read<FleetProvider>().verifyDocument(
                                doc.id,
                                status: 'rejected',
                                notes: notesCtrl.text.trim(),
                              );
                          if (ctx.mounted) Navigator.of(ctx).pop();
                          if (context.mounted) {
                            AppFeedback.showToast(context, message: 'Document marked rejected', type: ToastType.info);
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
                        label: const Text('Verify & Approve', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.success,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: AppRadius.md),
                        ),
                        onPressed: () async {
                          await context.read<FleetProvider>().verifyDocument(
                                doc.id,
                                status: 'verified',
                                notes: notesCtrl.text.trim(),
                              );
                          if (ctx.mounted) Navigator.of(ctx).pop();
                          if (context.mounted) {
                            AppFeedback.showToast(context, message: 'Document approved & marked verified', type: ToastType.success);
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDeleteDocument(VehicleDocument doc) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.lg),
        title: const Text('Delete Document', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        content: Text('Are you sure you want to delete ${doc.name} (${doc.documentNumber ?? ""})?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await context.read<FleetProvider>().deleteVehicleDocument(doc.id);
      if (mounted) {
        AppFeedback.showToast(context, message: 'Document deleted successfully', type: ToastType.info);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fleetProv = context.watch<FleetProvider>();
    final allDocs = fleetProv.allDocuments;
    final vehicles = fleetProv.vehicles;

    // Filter by query and vehicle selection
    final queryFiltered = allDocs.where((d) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final match = d.name.toLowerCase().contains(q) ||
            (d.documentNumber?.toLowerCase().contains(q) ?? false) ||
            (d.vehiclePlate?.toLowerCase().contains(q) ?? false);
        if (!match) return false;
      }
      if (_selectedVehicleId != 'all' && d.vehicleId != _selectedVehicleId) return false;
      return true;
    }).toList();

    final allCount = queryFiltered.length;
    final validDocs = queryFiltered.where((d) => d.status == 'valid').toList();
    final expiringDocs = queryFiltered.where((d) => d.status == 'expiring_soon').toList();
    final expiredDocs = queryFiltered.where((d) => d.status == 'expired').toList();

    return AppScaffold(
      appBar: AppHeader(
        title: 'Vehicle Documents',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => fleetProv.loadAllDocuments(forceRefresh: true),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              labelPadding: const EdgeInsets.symmetric(horizontal: 14),
              labelColor: AppColors.primary,
              unselectedLabelColor: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: [
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.folder_shared_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('All ($allCount)'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.verified_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('Valid (${validDocs.length})'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.access_time_filled_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('Expiring (${expiringDocs.length})'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.warning_rounded, size: 15),
                      const SizedBox(width: 6),
                      Text('Expired (${expiredDocs.length})'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_vehicle_documents',
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.upload_file_rounded),
        label: const Text('Add Document', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () => _showUploadDocumentSheet(),
      ),
      body: Column(
        children: [
          // Filter Search Bar & Vehicle Selector (No extra gap, seamless surface)
          Container(
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.sm),
            color: isDark ? AppColors.darkSurface : Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Search policy #, doc, plate...',
                      hintStyle: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                      prefixIcon: const Icon(Icons.search_rounded, size: 18),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: AppRadius.md, borderSide: BorderSide.none),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 16),
                              onPressed: () {
                                _searchCtrl.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                    ),
                    onChanged: (val) => setState(() => _searchQuery = val.trim()),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: AppRadius.md,
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedVehicleId,
                      dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkText : AppColors.lightText,
                      ),
                      items: [
                        const DropdownMenuItem(value: 'all', child: Text('All Vehicles')),
                        ...vehicles.map((v) => DropdownMenuItem(value: v.id, child: Text(v.plateNumber))),
                      ],
                      onChanged: (v) => setState(() => _selectedVehicleId = v ?? 'all'),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildDocsList(queryFiltered, fleetProv.documentsLoading),
                _buildDocsList(validDocs, fleetProv.documentsLoading),
                _buildDocsList(expiringDocs, fleetProv.documentsLoading),
                _buildDocsList(expiredDocs, fleetProv.documentsLoading),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocsList(List<VehicleDocument> docs, bool isLoading) {
    if (isLoading && docs.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (docs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.folder_off_rounded, size: 48, color: Color(0xFF94A3B8)),
            SizedBox(height: 8),
            Text('No Documents Found', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            Text('No compliance records in this category.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => context.read<FleetProvider>().loadAllDocuments(forceRefresh: true),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, 80),
        itemCount: docs.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (ctx, idx) {
          final doc = docs[idx];
          return VehicleDocumentCard(
            document: doc,
            onAudit: () => _showVerifyAuditSheet(doc),
            onDelete: () => _confirmDeleteDocument(doc),
            onTap: () => _showUploadDocumentSheet(doc),
          );
        },
      ),
    );
  }
}
