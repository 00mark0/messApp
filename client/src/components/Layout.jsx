import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

function Layout() {
  const location = useLocation();
  const hideNavbarPaths = ["/chat"];

  const shouldHideNavbar = hideNavbarPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default Layout;
