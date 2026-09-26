import React from 'react';
import {
  IconDashboard, IconDeviceDesktop, IconClipboardList, IconLayoutGrid, IconCalendarEvent, IconChefHat,
  IconCash, IconToolsKitchen2, IconDiscount2, IconArchive, IconUsersGroup, IconUsers, IconChartBar,
  IconBuildingStore, IconSettings,
} from '@tabler/icons-react';

export interface NavItem {
  path: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  section: 'Operate' | 'Catalog' | 'People' | 'Insights' | 'Admin';
  perms?: string[];
  module?: string;
}

export const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', subtitle: 'Live operations & sales', icon: <IconDashboard size={16} />, section: 'Operate', perms: ['reports.view', 'pos.access'] },
  { path: '/pos', label: 'POS Terminal', subtitle: 'Take orders & payments', icon: <IconDeviceDesktop size={16} />, section: 'Operate', perms: ['pos.access'] },
  { path: '/orders', label: 'Orders', subtitle: 'Checks, refunds & history', icon: <IconClipboardList size={16} />, section: 'Operate', perms: ['orders.view'] },
  { path: '/tables', label: 'Floor & Tables', subtitle: 'Live floor plan & seating', icon: <IconLayoutGrid size={16} />, section: 'Operate', perms: ['tables.manage'], module: 'tables' },
  { path: '/reservations', label: 'Reservations', subtitle: 'Bookings & waitlist', icon: <IconCalendarEvent size={16} />, section: 'Operate', perms: ['reservations.manage'], module: 'reservations' },
  { path: '/kds', label: 'Kitchen Display', subtitle: 'Station tickets & bump', icon: <IconChefHat size={16} />, section: 'Operate', perms: ['kds.access'], module: 'kds' },
  { path: '/cash', label: 'Cash & Shifts', subtitle: 'Drawer, pay-ins/outs, Z report', icon: <IconCash size={16} />, section: 'Operate', perms: ['cash.manage'], module: 'cashManagement' },
  { path: '/menu', label: 'Menu', subtitle: 'Items, modifiers & taxes', icon: <IconToolsKitchen2 size={16} />, section: 'Catalog', perms: ['menu.view'] },
  { path: '/promotions', label: 'Promotions', subtitle: 'Discounts & happy hours', icon: <IconDiscount2 size={16} />, section: 'Catalog', perms: ['promotions.manage'], module: 'promotions' },
  { path: '/inventory', label: 'Inventory', subtitle: 'Stock, recipes & purchasing', icon: <IconArchive size={16} />, section: 'Catalog', perms: ['inventory.view'], module: 'inventory' },
  { path: '/customers', label: 'Customers', subtitle: 'Guests & loyalty', icon: <IconUsersGroup size={16} />, section: 'People', perms: ['customers.view'], module: 'customers' },
  { path: '/staff', label: 'Staff', subtitle: 'Team, roles & time clock', icon: <IconUsers size={16} />, section: 'People', perms: ['staff.view'] },
  { path: '/reports', label: 'Reports', subtitle: 'Sales analytics', icon: <IconChartBar size={16} />, section: 'Insights', perms: ['reports.view'] },
  { path: '/locations', label: 'Locations', subtitle: 'Outlets, stations & devices', icon: <IconBuildingStore size={16} />, section: 'Admin', perms: ['locations.manage'] },
  { path: '/settings', label: 'Settings', subtitle: 'Business configuration', icon: <IconSettings size={16} />, section: 'Admin' },
];

export function visibleNav(can: (...p: string[]) => boolean, modules: Record<string, boolean> | undefined) {
  return NAV.filter((n) => (!n.perms || can(...n.perms)) && (!n.module || !!modules?.[n.module]));
}
