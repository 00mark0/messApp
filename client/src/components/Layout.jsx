import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

function Layout() {
  const location = useLocation();
  const hideNavbarPaths = ["/chat", "/group"]; // Add "/group" to the array

  const shouldHideNavbar = hideNavbarPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <main>
        <div className="absolute top-4 right-4"></div>
        <Outlet />
      </main>
    </>
  );
}

export default Layout;
