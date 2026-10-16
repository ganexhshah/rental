import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../buttons/app_buttons.dart';

class FuelSelectorWidget extends StatelessWidget {
  final String selectedLevel;
  final void Function(String) onSelected;

  const FuelSelectorWidget({
    super.key,
    required this.selectedLevel,
    required this.onSelected,
  });

  static const levels = ['100%', '75%', '50%', '25%', 'Empty'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Fuel / Battery Level', style: AppTypography.labelMedium),
            Text(
              selectedLevel,
              style: AppTypography.labelMedium.copyWith(
                color: AppColors.primaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: levels.map((lvl) {
            final isSelected = selectedLevel.toLowerCase() == lvl.toLowerCase();
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: InkWell(
                  onTap: () => onSelected(lvl),
                  borderRadius: AppRadius.sm,
                  child: Container(
                    height: 42,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary
                          : (isDark ? AppColors.darkCard : AppColors.lightBorderLight),
                      borderRadius: AppRadius.sm,
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        lvl,
                        style: AppTypography.labelSmall.copyWith(
                          color: isSelected
                              ? Colors.white
                              : (isDark ? AppColors.darkText : AppColors.lightText),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class PhotoCaptureTile extends StatelessWidget {
  final String slotName;
  final String? photoUrl;
  final VoidCallback onCapture;
  final VoidCallback? onRemove;
  final bool isRequired;

  const PhotoCaptureTile({
    super.key,
    required this.slotName,
    this.photoUrl,
    required this.onCapture,
    this.onRemove,
    this.isRequired = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onCapture,
      borderRadius: AppRadius.md,
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightBorderLight,
          borderRadius: AppRadius.md,
          border: Border.all(
            color: photoUrl != null
                ? AppColors.primary
                : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
            width: photoUrl != null ? 1.5 : 1.0,
          ),
        ),
        child: photoUrl != null
            ? Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: AppRadius.md,
                    child: Image.network(
                      photoUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Center(
                        child: Icon(Icons.broken_image_rounded, size: 28),
                      ),
                    ),
                  ),
                  if (onRemove != null)
                    Positioned(
                      top: 4,
                      right: 4,
                      child: GestureDetector(
                        onTap: onRemove,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.black54,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close_rounded, size: 14, color: Colors.white),
                        ),
                      ),
                    ),
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                      color: Colors.black54,
                      child: Text(
                        slotName,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 10, color: Colors.white),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.camera_alt_rounded, size: 24, color: AppColors.primary),
                  const SizedBox(height: 4),
                  Text(
                    slotName,
                    textAlign: TextAlign.center,
                    style: AppTypography.labelSmall.copyWith(fontSize: 11),
                  ),
                  if (isRequired)
                    Text(
                      '* Required',
                      style: TextStyle(fontSize: 9, color: AppColors.warning),
                    ),
                ],
              ),
      ),
    );
  }
}

class InspectionItemTile extends StatelessWidget {
  final String title;
  final bool isChecked;
  final ValueChanged<bool?> onChanged;
  final String? subtitle;

  const InspectionItemTile({
    super.key,
    required this.title,
    required this.isChecked,
    required this.onChanged,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return CheckboxListTile(
      value: isChecked,
      onChanged: onChanged,
      title: Text(title, style: AppTypography.bodyMedium),
      subtitle: subtitle != null ? Text(subtitle!, style: AppTypography.bodySmall) : null,
      activeColor: AppColors.primary,
      contentPadding: EdgeInsets.zero,
      controlAffinity: ListTileControlAffinity.leading,
    );
  }
}

class SignaturePadWidget extends StatefulWidget {
  final ValueChanged<String> onSigned;
  final String title;

  const SignaturePadWidget({
    super.key,
    required this.onSigned,
    this.title = 'Customer Signature',
  });

  @override
  State<SignaturePadWidget> createState() => _SignaturePadWidgetState();
}

class _SignaturePadWidgetState extends State<SignaturePadWidget> {
  final List<Offset?> _points = [];
  bool _hasSigned = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(widget.title, style: AppTypography.labelMedium),
            if (_hasSigned)
              TextButton(
                onPressed: () {
                  setState(() {
                    _points.clear();
                    _hasSigned = false;
                  });
                },
                child: const Text('Clear', style: TextStyle(color: AppColors.error)),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        Container(
          height: 140,
          width: double.infinity,
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: AppRadius.md,
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            ),
          ),
          child: GestureDetector(
            onPanUpdate: (DragUpdateDetails details) {
              final RenderBox renderBox = context.findRenderObject() as RenderBox;
              final localPos = renderBox.globalToLocal(details.globalPosition);
              setState(() {
                _points.add(localPos);
                _hasSigned = true;
              });
              widget.onSigned('signature_data_recorded_${DateTime.now().millisecondsSinceEpoch}');
            },
            onPanEnd: (DragEndDetails details) => _points.add(null),
            child: CustomPaint(
              painter: _SignaturePainter(points: _points, isDark: isDark),
              size: Size.infinite,
            ),
          ),
        ),
      ],
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<Offset?> points;
  final bool isDark;

  _SignaturePainter({required this.points, required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isDark ? Colors.white : Colors.black87
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 2.5;

    // Draw baseline guide
    final linePaint = Paint()
      ..color = Colors.grey.withOpacity(0.3)
      ..strokeWidth = 1.0;
    canvas.drawLine(
      Offset(16, size.height - 30),
      Offset(size.width - 16, size.height - 30),
      linePaint,
    );

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) => true;
}
