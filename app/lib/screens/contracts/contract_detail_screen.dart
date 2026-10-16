import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../models/contract_model.dart';
import '../../providers/contract_provider.dart';
import '../../widgets/feedback/app_feedback.dart';
import '../../widgets/shell/app_header.dart';
import '../../widgets/shell/app_scaffold.dart';

class ContractDetailScreen extends StatefulWidget {
  final ContractModel contract;

  const ContractDetailScreen({super.key, required this.contract});

  @override
  State<ContractDetailScreen> createState() => _ContractDetailScreenState();
}

class _ContractDetailScreenState extends State<ContractDetailScreen> {
  late ContractModel _contract;
  bool _isSigning = false;

  @override
  void initState() {
    super.initState();
    _contract = widget.contract;
  }

  void _showSignatureDialog() {
    final nameCtrl = TextEditingController(text: _contract.customerName);
    bool agreed = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.lightSurface,
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.topXl),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: AppSpacing.xl,
                right: AppSpacing.xl,
                top: AppSpacing.xl,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.xl,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Digital E-Signature', style: AppTypography.headingMedium),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Legally binding digital signature for ${_contract.contractNumber}',
                    style: AppTypography.bodySmall.copyWith(color: AppColors.lightTextSecondary),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Signatory Full Name',
                      prefixIcon: Icon(Icons.person_rounded),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Simulated signature drawing pad
                  Container(
                    height: 120,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppColors.lightBorderLight,
                      borderRadius: AppRadius.md,
                      border: Border.all(color: AppColors.lightBorder),
                    ),
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.draw_rounded, size: 32, color: AppColors.primary),
                        const SizedBox(height: 6),
                        Text(
                          'Signed electronically via touchscreen',
                          style: AppTypography.caption.copyWith(color: AppColors.lightTextMuted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  Row(
                    children: [
                      Checkbox(
                        value: agreed,
                        onChanged: (v) => setSheetState(() => agreed = v ?? false),
                        activeColor: AppColors.primary,
                      ),
                      Expanded(
                        child: Text(
                          'I have read and agree to all terms and vehicle condition inspection report.',
                          style: AppTypography.bodySmall.copyWith(color: AppColors.lightText),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  ElevatedButton(
                    onPressed: !agreed
                        ? null
                        : () async {
                            Navigator.pop(ctx);
                            setState(() => _isSigning = true);
                            await context.read<ContractProvider>().signContract(
                                  _contract.id,
                                  'https://signature-vault.himalayanrides.com/${_contract.id}.png',
                                );
                            setState(() {
                              _isSigning = false;
                              _contract = ContractModel(
                                id: _contract.id,
                                contractNumber: _contract.contractNumber,
                                bookingId: _contract.bookingId,
                                customerName: _contract.customerName,
                                customerEmail: _contract.customerEmail,
                                customerPhone: _contract.customerPhone,
                                vehicleName: _contract.vehicleName,
                                vehiclePlate: _contract.vehiclePlate,
                                status: 'signed',
                                startDate: _contract.startDate,
                                endDate: _contract.endDate,
                                totalAmount: _contract.totalAmount,
                                depositAmount: _contract.depositAmount,
                                signatureUrl: 'signed',
                                signedAt: DateTime.now(),
                                signedBy: nameCtrl.text,
                                termsText: _contract.termsText,
                                createdAt: _contract.createdAt,
                              );
                            });
                            if (mounted) {
                              AppFeedback.showToast(
                                context,
                                message: 'Contract signed successfully!',
                                type: ToastType.success,
                              );
                            }
                          },
                    child: const Text('Confirm & Sign Agreement'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isSigned = _contract.isSigned;

    return AppScaffold(
      body: Column(
        children: [
          AppHeader(
            title: _contract.contractNumber,
            subtitle: 'Vehicle Lease & Rental Agreement',
            showBackButton: true,
            actions: [
              IconButton(
                icon: const Icon(Icons.share_rounded),
                onPressed: () {
                  AppFeedback.showToast(
                    context,
                    message: 'Contract PDF link copied to clipboard',
                    type: ToastType.info,
                  );
                },
              ),
            ],
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Banner
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: isSigned ? AppColors.successBg : AppColors.warningBg,
                      borderRadius: AppRadius.md,
                      border: Border.all(
                        color: isSigned ? AppColors.success.withOpacity(0.3) : AppColors.warning.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isSigned ? Icons.verified_user_rounded : Icons.pending_actions_rounded,
                          color: isSigned ? AppColors.success : AppColors.warning,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isSigned ? 'Contract Fully Executed & Signed' : 'Pending Customer Signature',
                                style: AppTypography.labelMedium.copyWith(
                                  color: isSigned ? AppColors.success : AppColors.warning,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                isSigned
                                    ? 'Signed on ${_contract.signedAt?.toString().substring(0, 16) ?? "Recently"} by ${_contract.signedBy ?? _contract.customerName}'
                                    : 'Awaiting signature from ${_contract.customerName}',
                                style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Agreement Summary Card
                  _buildSectionCard(
                    title: 'Rental Agreement Summary',
                    icon: Icons.description_rounded,
                    children: [
                      _buildInfoRow('Customer', _contract.customerName),
                      _buildInfoRow('Contact Phone', _contract.customerPhone),
                      _buildInfoRow('Email Address', _contract.customerEmail),
                      _buildInfoRow('Assigned Vehicle', _contract.vehicleName),
                      _buildInfoRow('Registration Plate', _contract.vehiclePlate),
                      _buildInfoRow('Rental Start', _contract.startDate.toString().substring(0, 10)),
                      _buildInfoRow('Rental End', _contract.endDate.toString().substring(0, 10)),
                      _buildInfoRow('Total Rental Fare', 'Rs. ${_contract.totalAmount.toStringAsFixed(0)}'),
                      _buildInfoRow('Security Deposit', 'Rs. ${_contract.depositAmount.toStringAsFixed(0)}'),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Terms & Clauses
                  _buildSectionCard(
                    title: 'Standard Terms & Conditions',
                    icon: Icons.gavel_rounded,
                    children: [
                      Text(
                        _contract.termsText ??
                            '1. The Hirer agrees to operate the vehicle solely on designated public roads within Nepal.\n\n'
                            '2. Fuel policy is strictly Same-to-Same. Vehicles must be returned with the equivalent fuel level as pickup.\n\n'
                            '3. Off-road misuse, driving under the influence, or unauthorized sub-leasing voids all insurance coverage.\n\n'
                            '4. Security deposit of Rs. ${_contract.depositAmount.toStringAsFixed(0)} will be held and released within 48 hours after safe return inspection.',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.lightTextSecondary,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Action Button
                  if (!isSigned)
                    ElevatedButton.icon(
                      onPressed: _isSigning ? null : _showSignatureDialog,
                      icon: const Icon(Icons.draw_rounded),
                      label: const Text('Capture E-Signature'),
                    )
                  else
                    OutlinedButton.icon(
                      onPressed: () {
                        AppFeedback.showToast(
                          context,
                          message: 'Downloading contract PDF with e-signature certificate...',
                          type: ToastType.info,
                        );
                      },
                      icon: const Icon(Icons.picture_as_pdf_rounded),
                      label: const Text('Download Official PDF Contract'),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.lightCard,
        borderRadius: AppRadius.lg,
        border: Border.all(color: AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: AppColors.primary),
              const SizedBox(width: AppSpacing.sm),
              Text(title, style: AppTypography.headingSmall),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          const Divider(color: AppColors.lightBorderLight, height: 1),
          const SizedBox(height: AppSpacing.md),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.bodySmall.copyWith(color: AppColors.lightTextMuted)),
          Text(
            value,
            style: AppTypography.labelMedium.copyWith(
              color: AppColors.lightText,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
