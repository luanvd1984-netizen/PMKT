"use client";

import { useState } from "react";
import { login } from "@/lib/storage";
import type { User } from "@/types";
import { Button, Input, Label } from "./ui";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { user: "bep", pass: "bep123", label: "Bếp" },
  { user: "pur", pass: "pur123", label: "Thu mua (PUR)" },
  { user: "kho", pass: "kho123", label: "Kế toán kho" },
  { user: "ketoan", pass: "ketoan123", label: "Kế toán trưởng" },
  { user: "pgd", pass: "pgd123", label: "Phó Giám đốc" },
  { user: "giamdoc", pass: "gd123", label: "Giám đốc" },
  { user: "admin", pass: "admin123", label: "Admin" },
];

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = login(username.trim(), password);
    if (user) {
      toast.success(`Xin chào, ${user.name}`);
      onLogin(user);
    } else {
      toast.error("Sai tài khoản hoặc mật khẩu");
    }
  }

  function quickLogin(user: string, pass: string) {
    setUsername(user);
    setPassword(pass);
    const u = login(user, pass);
    if (u) {
      toast.success(`Xin chào, ${u.name}`);
      onLogin(u);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12c2-4 4-6 6-6s4 2 6 6 4 6 6 6 4-2 6-6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Oceanami Resort</h1>
          <p className="mt-1 text-sm text-zinc-500">Hệ thống Yêu cầu Mua hàng & Master Data</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div>
            <Label>Tài khoản</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="bep / pur / admin..."
              autoFocus
            />
          </div>
          <div>
            <Label>Mật khẩu</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full">
            Đăng nhập
          </Button>
        </form>

        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Tài khoản demo — bấm để đăng nhập nhanh
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.user}
                type="button"
                onClick={() => quickLogin(a.user, a.pass)}
                className="rounded-lg border px-3 py-2 text-left text-sm hover:bg-zinc-50 transition-colors"
              >
                <span className="font-medium">{a.label}</span>
                <span className="block text-xs text-zinc-400">{a.user} / {a.pass}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
