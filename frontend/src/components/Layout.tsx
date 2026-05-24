import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">L</div>
          <div className="sidebar-logo-text">LifeBoard</div>
          <div className="sidebar-logo-sub">个人数据中台</div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>
            <span className="sidebar-nav-icon">◆</span>
            仪表盘
          </NavLink>
          <NavLink to="/settings">
            <span className="sidebar-nav-icon">◇</span>
            设置
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          powered by ezbookkeeping
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
