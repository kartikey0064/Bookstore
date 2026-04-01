import React, { useEffect, useState } from 'react';

import Sidebar from '../../component/Sidebar';
import Navbar from './Navbar';

const MOBILE_BREAKPOINT = 960;

export default function Layout({
  activeItem,
  children,
  items,
  onLogout,
  onSearchChange,
  onSelectItem,
  profileRole,
  searchLoading = false,
  searchPlaceholder,
  searchValue,
  showSidebarIcons = true,
  title,
  user,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  ));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsMobileSidebarOpen(false);
        setIsSidebarOpen(current => (current === false ? current : true));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(current => !current);
      return;
    }
    setIsSidebarOpen(current => !current);
  };

  return (
    <div className={`shell app-shell ${!isMobile && !isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        active={activeItem}
        isMobileOpen={isMobileSidebarOpen}
        isOpen={isMobile ? true : isSidebarOpen}
        items={items}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={onLogout}
        onSelect={onSelectItem}
        showIcons={showSidebarIcons}
        user={user}
      />

      <div className="main-area">
        <Navbar
          onSearchChange={onSearchChange}
          profileRole={profileRole}
          onToggleSidebar={toggleSidebar}
          searchLoading={searchLoading}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          title={title}
          user={user}
        />
        <main className="layout-content">{children}</main>
      </div>
    </div>
  );
}
