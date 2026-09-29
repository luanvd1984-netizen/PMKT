"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types";
import { getSession } from "@/lib/storage";
import Login from "./Login";
import DepartmentPortal from "./DepartmentPortal";
import PurPortal from "./PurPortal";
import ApproverPortal from "./ApproverPortal";
import WarehousePortal from "./WarehousePortal";
import MasterDataApp from "./MasterDataApp";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [showMaster, setShowMaster] = useState(false);

  useEffect(() => {
    setUser(getSession());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user.role === "warehouse") {
    return <WarehousePortal user={user} onLogout={() => setUser(null)} />;
  }

  if (user.role === "accountant" || user.role === "deputy" || user.role === "director") {
    return <ApproverPortal user={user} onLogout={() => setUser(null)} />;
  }

  if (user.role === "admin" || user.role === "pur") {
    if (showMaster) {
      return (
        <MasterDataApp
          user={user}
          onLogout={() => setUser(null)}
          onBack={() => setShowMaster(false)}
        />
      );
    }
    return (
      <PurPortal
        user={user}
        onLogout={() => setUser(null)}
        onOpenMaster={() => setShowMaster(true)}
      />
    );
  }

  return <DepartmentPortal user={user} onLogout={() => setUser(null)} />;
}
