import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';
import 'explorar_screen.dart';
import 'avaliar_screen.dart';
import 'comunidade_screen.dart';
import 'perfil_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  void _abrirAvaliarModal() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const AvaliarScreen(),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // As telas normais (índices 0, 1, 3, 4)
    final screens = [
      HomeScreen(onAbrirAvaliar: _abrirAvaliarModal),
      const ExplorarScreen(),
      const SizedBox.shrink(), // Placeholder para o botão central de avaliação
      const ComunidadeScreen(),
      const PerfilScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: VimoColors.surface,
          border: Border(top: BorderSide(color: VimoColors.border, width: 1)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                // 1. Início
                _buildNavItem(0, LucideIcons.home, 'Início'),

                // 2. Explorar
                _buildNavItem(1, LucideIcons.compass, 'Explorar'),

                // 3. Botão Central de Avaliação (+)
                GestureDetector(
                  onTap: _abrirAvaliarModal,
                  child: Container(
                    height: 48,
                    width: 48,
                    decoration: BoxDecoration(
                      color: VimoColors.accent,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: VimoColors.accent.withOpacity(0.35),
                          blurRadius: 14,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.add_rounded,
                      color: VimoColors.background,
                      size: 28,
                    ),
                  ),
                ),

                // 4. Atividade
                _buildNavItem(3, LucideIcons.activity, 'Atividade'),

                // 5. Perfil
                _buildNavItem(4, LucideIcons.user, 'Perfil'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => setState(() => _currentIndex = index),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isSelected ? VimoColors.accent : VimoColors.textSecondary,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? VimoColors.accent : VimoColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
