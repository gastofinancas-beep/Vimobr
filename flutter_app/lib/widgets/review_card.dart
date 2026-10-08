import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../models/review.dart';
import '../theme/app_theme.dart';
import 'star_rating.dart';

class ReviewCard extends StatefulWidget {
  final Review review;
  final VoidCallback? onPlaceTap;
  final VoidCallback? onUserTap;
  final VoidCallback? onCommentTap;
  final VoidCallback? onShareTap;
  final Function(bool isLiked)? onLikeChanged;

  const ReviewCard({
    super.key,
    required this.review,
    this.onPlaceTap,
    this.onUserTap,
    this.onCommentTap,
    this.onShareTap,
    this.onLikeChanged,
  });

  @override
  State<ReviewCard> createState() => _ReviewCardState();
}

class _ReviewCardState extends State<ReviewCard> with SingleTickerProviderStateMixin {
  late bool _hasLiked;
  late int _likesCount;
  bool _isSaved = false;
  late AnimationController _likeAnimController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _hasLiked = widget.review.hasLiked;
    _likesCount = widget.review.likesCount;

    _likeAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.35), weight: 50),
      TweenSequenceItem(tween: Tween(begin: 1.35, end: 1.0), weight: 50),
    ]).animate(CurvedAnimation(parent: _likeAnimController, curve: Curves.easeOutBack));
  }

  @override
  void dispose() {
    _likeAnimController.dispose();
    super.dispose();
  }

  void _handleLike() {
    setState(() {
      _hasLiked = !_hasLiked;
      _likesCount += _hasLiked ? 1 : -1;
    });
    _likeAnimController.forward(from: 0.0);
    widget.onLikeChanged?.call(_hasLiked);
  }

  @override
  Widget build(BuildContext context) {
    final formattedDate = DateFormat('dd/MM/yyyy').format(widget.review.createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: VimoColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: VimoColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. HEADER COM AVATAR DO USUÁRIO & RESTAURANTE
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              GestureDetector(
                onTap: widget.onUserTap,
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: VimoColors.surfaceElevated,
                  backgroundImage: widget.review.userAvatarUrl != null
                      ? CachedNetworkImageProvider(widget.review.userAvatarUrl!)
                      : null,
                  child: widget.review.userAvatarUrl == null
                      ? Text(
                          widget.review.userName.isNotEmpty ? widget.review.userName[0].toUpperCase() : 'U',
                          style: const TextStyle(fontWeight: FontWeight.w700, color: VimoColors.accent),
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    RichText(
                      text: TextSpan(
                        style: const TextStyle(color: VimoColors.textPrimary, fontSize: 13),
                        children: [
                          TextSpan(
                            text: widget.review.userName,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const TextSpan(
                            text: ' esteve em ',
                            style: TextStyle(color: VimoColors.textSecondary),
                          ),
                          TextSpan(
                            text: widget.review.placeName,
                            style: const TextStyle(fontWeight: FontWeight.w700, color: VimoColors.accent),
                          ),
                        ],
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.review.userHandle} · $formattedDate',
                      style: const TextStyle(color: VimoColors.textSecondary, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 2. NOTA EM ESTRELAS & CLASSIFICAÇÃO
          Row(
            children: [
              StarRating(rating: widget.review.rating, size: 16),
              const SizedBox(width: 8),
              Text(
                widget.review.rating.toStringAsFixed(1),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: VimoColors.accent,
                ),
              ),
              if (widget.review.occasion != null) ...[
                const Text(' · ', style: TextStyle(color: VimoColors.textSecondary)),
                Text(
                  widget.review.occasion!,
                  style: const TextStyle(fontSize: 12, color: VimoColors.textSecondary),
                ),
              ],
            ],
          ),

          const SizedBox(height: 10),

          // 3. TEXTO EDITORIAL DA EXPERIÊNCIA
          Text(
            widget.review.text,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
              color: VimoColors.textPrimary,
              fontWeight: FontWeight.w400,
            ),
          ),

          // 4. FOTO DA AVALIAÇÃO (SE HOUVER)
          if (widget.review.placePhotoUrl != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: CachedNetworkImage(
                  imageUrl: widget.review.placePhotoUrl!,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(color: VimoColors.surfaceElevated),
                  errorWidget: (context, url, error) => const SizedBox.shrink(),
                ),
              ),
            ),
          ],

          // 5. PRATOS DESTACADOS
          if (widget.review.dishesOrdered.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: widget.review.dishesOrdered.map((dish) {
                final isFav = dish == widget.review.favoriteDish;
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isFav ? VimoColors.accent.withOpacity(0.15) : VimoColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isFav ? VimoColors.accent.withOpacity(0.4) : VimoColors.border,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isFav) ...[
                        const Icon(Icons.star_rounded, size: 12, color: VimoColors.accent),
                        const SizedBox(width: 4),
                      ],
                      Text(
                        dish,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isFav ? FontWeight.w700 : FontWeight.w500,
                          color: isFav ? VimoColors.accent : VimoColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],

          const SizedBox(height: 14),
          const Divider(height: 1, color: VimoColors.border),
          const SizedBox(height: 8),

          // 6. BARRA DE AÇÕES (CURTIR, COMENTAR, SALVAR, COMPARTILHAR)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  GestureDetector(
                    onTap: _handleLike,
                    child: ScaleTransition(
                      scale: _scaleAnimation,
                      child: Row(
                        children: [
                          Icon(
                            _hasLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                            size: 18,
                            color: _hasLiked ? VimoColors.danger : VimoColors.textSecondary,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '$_likesCount',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _hasLiked ? VimoColors.danger : VimoColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 20),
                  GestureDetector(
                    onTap: widget.onCommentTap,
                    child: Row(
                      children: [
                        const Icon(LucideIcons.messageCircle, size: 17, color: VimoColors.textSecondary),
                        const SizedBox(width: 5),
                        Text(
                          '${widget.review.commentsCount}',
                          style: const TextStyle(fontSize: 12, color: VimoColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      setState(() => _isSaved = !_isSaved);
                    },
                    child: Icon(
                      _isSaved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                      size: 19,
                      color: _isSaved ? VimoColors.accent : VimoColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 14),
                  GestureDetector(
                    onTap: widget.onShareTap,
                    child: const Icon(LucideIcons.share2, size: 17, color: VimoColors.textSecondary),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
