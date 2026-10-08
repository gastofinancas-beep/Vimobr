import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class StarRating extends StatelessWidget {
  final double rating;
  final double size;
  final bool interactive;
  final ValueChanged<double>? onRatingChanged;

  const StarRating({
    super.key,
    required this.rating,
    this.size = 16,
    this.interactive = false,
    this.onRatingChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        final starValue = index + 1.0;
        final halfValue = index + 0.5;
        final isFilled = rating >= starValue;
        final isHalf = rating >= halfValue && rating < starValue;

        IconData icon = Icons.star_border_rounded;
        Color color = VimoColors.textSecondary.withOpacity(0.35);

        if (isFilled) {
          icon = Icons.star_rounded;
          color = VimoColors.accent;
        } else if (isHalf) {
          icon = Icons.star_half_rounded;
          color = VimoColors.accent;
        }

        final star = Icon(icon, size: size, color: color);

        if (!interactive) return star;

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapUp: (details) {
            final box = context.findRenderObject() as RenderBox?;
            if (box == null) {
              onRatingChanged?.call(starValue);
              return;
            }
            final localX = details.localPosition.dx;
            final isLeftHalf = localX < (size / 2);
            final selected = isLeftHalf ? halfValue : starValue;
            onRatingChanged?.call(selected);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2.0),
            child: star,
          ),
        );
      }),
    );
  }
}
