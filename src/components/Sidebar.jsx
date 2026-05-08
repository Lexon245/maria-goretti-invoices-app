import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Package,
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { version as appVersion } from '../../package.json';
import './Sidebar.css';

const Sidebar = ({ currentView, setView, onNewDoc, settings, collapsed, onToggleCollapse }) => {
  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices',  label: 'Invoices',  icon: Receipt },
    { id: 'quotes',    label: 'Quotes',    icon: FileText },
    { id: 'clients',   label: 'Clients',   icon: Users },
    { id: 'products',  label: 'Products',  icon: Package },
  ];

  const generalNav = [
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderItem = (item) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    return (
      <button
        key={item.id}
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => setView(item.id)}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon size={18} aria-hidden="true" />
        {!collapsed && <span>{item.label}</span>}
        {isActive && <span className="nav-active-dot" aria-hidden="true" />}
      </button>
    );
  };

  const initials = (() => {
    const name = (settings?.company_name || '').trim();
    if (!name) return '??';
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
  })();

  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">IF</div>
        {!collapsed && (
          <div className="app-info">
            <span className="app-name">InvoiceForge</span>
            <span className="app-version">v{appVersion}</span>
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <CollapseIcon size={16} />
        </button>
      </div>

      <button
        className="sidebar-cta"
        onClick={() => onNewDoc('invoice')}
        title={collapsed ? 'New Invoice' : undefined}
        aria-label="New Invoice"
      >
        <Receipt size={16} aria-hidden="true" />
        {!collapsed && <span>New Invoice</span>}
      </button>

      <div className="nav-section">
        {!collapsed && <span className="nav-section-label">Main menu</span>}
        <nav className="sidebar-nav">
          {mainNav.map(renderItem)}
        </nav>
      </div>

      <div className="nav-section">
        {!collapsed && <span className="nav-section-label">General</span>}
        <nav className="sidebar-nav">
          {generalNav.map(renderItem)}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar" title={collapsed ? (settings?.company_name || 'Company') : undefined}>
            {initials}
          </div>
          {!collapsed && (
            <div className="user-info">
              <span className="user-name">{settings?.company_name || 'Company Name'}</span>
              <span className="user-email">{settings?.company_email || 'Settings → Company'}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
