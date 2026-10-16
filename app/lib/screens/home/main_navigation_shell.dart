import 'package:flutter/material.dart';
import '../../widgets/shell/app_bottom_nav_bar.dart';
import '../bookings/booking_list_screen.dart';
import '../customers/customer_list_screen.dart';
import '../fleet/vehicle_list_screen.dart';
import '../more/more_hub_screen.dart';
import 'dashboard_screen.dart';

class MainNavigationShell extends StatefulWidget {
  final int initialIndex;

  const MainNavigationShell({super.key, this.initialIndex = 0});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void _onTabSelected(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      DashboardScreen(onSwitchTab: _onTabSelected),
      const BookingListScreen(),
      const VehicleListScreen(),
      const CustomerListScreen(),
      const MoreHubScreen(),
    ];

    return Scaffold(
      backgroundColor: Colors.white,
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: AppBottomNavBar(
        currentIndex: _currentIndex,
        onItemSelected: _onTabSelected,
        items: const [
          AppBottomNavItem(
            unselectedIcon: Icons.home_rounded,
            selectedIcon: Icons.home_rounded,
            label: 'Home',
          ),
          AppBottomNavItem(
            unselectedIcon: Icons.calendar_month_rounded,
            selectedIcon: Icons.calendar_month_rounded,
            label: 'Bookings',
          ),
          AppBottomNavItem(
            unselectedIcon: Icons.directions_car_rounded,
            selectedIcon: Icons.directions_car_rounded,
            label: 'Fleet',
          ),
          AppBottomNavItem(
            unselectedIcon: Icons.people_rounded,
            selectedIcon: Icons.people_rounded,
            label: 'Customers',
          ),
          AppBottomNavItem(
            unselectedIcon: Icons.grid_view_rounded,
            selectedIcon: Icons.grid_view_rounded,
            label: 'More',
          ),
        ],
      ),
    );
  }
}
