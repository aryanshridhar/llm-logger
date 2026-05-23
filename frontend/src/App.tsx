import { Outlet } from "react-router-dom";

import { AppShell } from "./common/components/AppShell";

export default function App() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
