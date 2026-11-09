import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Home, ShieldAlert, Map, BellRing } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { t, alertsCount } = useApp();

  const navItems = [
    { to: '/', label: t.homeTab, icon: Home },
    { to: '/report', label: t.reportTab, icon: ShieldAlert, highlight: true },
    { to: '/map', label: t.mapTab, icon: Map },
    { to: '/alerts', label: t.alertsTab, icon: BellRing }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-2 rounded-xl transition-all ${
                  item.highlight
                    ? isActive
                      ? 'text-teal font-bold'
                      : 'text-navy font-semibold'
                    : isActive
                    ? 'text-teal font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`relative p-1 rounded-lg transition-transform ${
                      item.highlight
                        ? 'bg-teal/10 text-teal'
                        : isActive
                        ? 'text-teal scale-110'
                        : 'text-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.to === '/alerts' && alertsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white font-extrabold text-[9px] min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center leading-none shadow-md ring-1 ring-white animate-pulse">
                        {alertsCount > 9 ? '9+' : alertsCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] mt-0.5 leading-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
