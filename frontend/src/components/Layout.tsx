import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">LifeBoard</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>
            仪表盘
          </NavLink>
          <NavLink to="/settings">设置</NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
