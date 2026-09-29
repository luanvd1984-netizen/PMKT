"use client";

import { useEffect, useState, useMemo } from "react";
import { LogOut, CheckCircle, XCircle, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import type { User, PurchaseRequest, ApprovalStep, RejectTarget, PRStatus } from "@/types";
import { getPRs, savePRs, logout } from "@/lib/storage";
import { formatVND, generateId, formatDate, PR_STATUS_LABEL, ROLE_LABEL, cn } from "@/lib/utils";
import { Button, Input, Select, Badge, Dialog, Label } from "./ui";

const ROLE_TO_STATUS: Record<string, PRStatus> = {
  accountant: "pending_ktt",
  deputy: "pending_pgd",
  director: "pending_gd",
};

const NEXT_STATUS: Record<string, PRStatus> = {
  accountant: "pending_pgd",
  deputy: "pending_gd",
  director: "approved",
};

const ROLE_LABELS: Record<string, string> = {
  accountant: "Kế toán trưởng",
  deputy: "Phó Giám đốc",
  director: "Giám đốc",
};

export default function ApproverPortal({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [selected, setSelected] = useState<PurchaseRequest | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTo, setRejectTo] = useState<RejectTarget>("pur");

  const myStatus = ROLE_TO_STATUS[user.role];

  useEffect(() => {
    setPrs(getPRs());
  }, []);

  function refresh() {
    setPrs(getPRs());
  }

  const inbox = useMemo(
    () =>
      prs
        .filter((p) => p.status === myStatus)
        .sort((a, b) => (b.submittedAt || b.createdAt).localeCompare(a.submittedAt || a.createdAt)),
    [prs, myStatus]
  );

  const history = useMemo(
    () =>
      prs
        .filter((p) =>
          p.approvalHistory.some(
            (h) => h.role === user.role && (h.action === "approve" || h.action === "reject")
          )
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [prs, user.role]
  );

  function totalAmount(pr: PurchaseRequest) {
    return pr.lines.reduce((s, l) => s + (l.unitPrice || 0) * l.quantity, 0);
  }

  function handleApprove() {
    if (!selected) return;
    const step: ApprovalStep = {
      id: generateId(),
      role: user.role as "accountant" | "deputy" | "director",
      roleLabel: ROLE_LABELS[user.role] || user.role,
      userId: user.id,
      userName: user.name,
      action: "approve",
      reason: "",
      at: new Date().toISOString(),
    };
    const nextStatus = NEXT_STATUS[user.role];
    const all = getPRs();
    savePRs(
      all.map((p) =>
        p.id === selected.id
          ? {
              ...p,
              status: nextStatus,
              approvalHistory: [...p.approvalHistory, step],
              rejectReason: null,
              rejectTo: null,
            }
          : p
      )
    );
    refresh();
    setSelected(null);
    toast.success(
      nextStatus === "approved"
        ? `Đã duyệt ${selected.code} — chuyển về PUR gửi PO`
        : `Đã duyệt ${selected.code} — chuyển cấp tiếp theo`
    );
  }

  function handleReject() {
    if (!selected) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    const step: ApprovalStep = {
      id: generateId(),
      role: user.role as "accountant" | "deputy" | "director",
      roleLabel: ROLE_LABELS[user.role] || user.role,
      userId: user.id,
      userName: user.name,
      action: "reject",
      reason: rejectReason.trim(),
      at: new Date().toISOString(),
      rejectTo,
    };
    // Return to PUR (pricing) or department (submitted so they can edit... actually draft or submitted)
    const newStatus: PRStatus = rejectTo === "pur" ? "submitted" : "rejected";
    const all = getPRs();
    savePRs(
      all.map((p) =>
        p.id === selected.id
          ? {
              ...p,
              status: newStatus,
              approvalHistory: [...p.approvalHistory, step],
              rejectReason: rejectReason.trim(),
              rejectTo,
            }
          : p
      )
    );
    refresh();
    setSelected(null);
    setRejectOpen(false);
    setRejectReason("");
    toast.success(
      rejectTo === "pur"
        ? `Đã trả ${selected.code} về Thu mua`
        : `Đã từ chối ${selected.code} — trả về BP đặt hàng`
    );
  }

  function statusBadge(status: string) {
    const map: Record<string, "default" | "success" | "muted" | "warning"> = {
      draft: "muted",
      submitted: "warning",
      pricing: "warning",
      pending_ktt: "warning",
      pending_pgd: "warning",
      pending_gd: "warning",
      approved: "success",
      ordered: "success",
      completed: "success",
      rejected: "default",
    };
    return <Badge variant={map[status] || "muted"}>{PR_STATUS_LABEL[status] || status}</Badge>;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white text-sm font-bold">
              O
            </div>
            <div>
              <h1 className="font-semibold">Duyệt ký — {ROLE_LABELS[user.role] || ROLE_LABEL[user.role]}</h1>
              <p className="text-xs text-zinc-500">{user.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); onLogout(); }}>
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Chờ duyệt
          {inbox.length > 0 && (
            <span className="rounded-full bg-amber-500 text-white text-xs px-2 py-0.5">{inbox.length}</span>
          )}
        </h2>

        {inbox.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center text-zinc-400 mb-8">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>Không có phiếu nào cần duyệt</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {inbox.map((pr) => (
              <button
                key={pr.id}
                onClick={() => setSelected(pr)}
                className="w-full rounded-xl border bg-white p-4 text-left hover:border-zinc-300 shadow-sm transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pr.code}</span>
                      {statusBadge(pr.status)}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {pr.departmentName} · {pr.lines.length} mặt hàng · {formatDate(pr.submittedAt || pr.createdAt)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-800">
                      Tổng: {formatVND(totalAmount(pr))}
                    </p>
                  </div>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); setSelected(pr); }}>
                    Xem & duyệt
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mb-3 text-zinc-600">Đã xử lý</h2>
            <div className="space-y-2">
              {history.slice(0, 10).map((pr) => {
                const myStep = [...pr.approvalHistory]
                  .reverse()
                  .find((h) => h.role === user.role);
                return (
                  <div key={pr.id} className="rounded-lg border bg-white px-4 py-3 text-sm flex justify-between items-center">
                    <div>
                      <span className="font-medium">{pr.code}</span>
                      <span className="text-zinc-400 ml-2">{pr.departmentName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {myStep?.action === "approve" ? (
                        <Badge variant="success">Đã duyệt</Badge>
                      ) : (
                        <Badge variant="default">Từ chối</Badge>
                      )}
                      {statusBadge(pr.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Chi tiết + duyệt */}
      <Dialog
        open={!!selected && !rejectOpen}
        onClose={() => setSelected(null)}
        title={selected?.code ?? ""}
      >
        {selected && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              {statusBadge(selected.status)}
              <span className="text-sm text-zinc-500">{selected.departmentName}</span>
            </div>
            {selected.note && (
              <p className="text-sm bg-zinc-50 rounded-lg p-3">{selected.note}</p>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500 text-xs">
                  <th className="pb-2">Mã</th>
                  <th className="pb-2">Tên hàng</th>
                  <th className="pb-2">SL</th>
                  <th className="pb-2">Đơn giá</th>
                  <th className="pb-2">NCC</th>
                  <th className="pb-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {selected.lines.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{l.itemCode}</td>
                    <td className="py-2">{l.itemName}</td>
                    <td className="py-2">{l.quantity} {l.unit}</td>
                    <td className="py-2">{l.unitPrice != null ? formatVND(l.unitPrice) : "—"}</td>
                    <td className="py-2">{l.supplierCode || "—"}</td>
                    <td className="py-2 text-right">
                      {l.unitPrice != null ? formatVND(l.quantity * l.unitPrice) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right font-semibold">Tổng: {formatVND(totalAmount(selected))}</p>

            {/* Lịch sử duyệt */}
            {selected.approvalHistory.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-zinc-500 mb-2">Lịch sử duyệt</p>
                <div className="space-y-1.5">
                  {selected.approvalHistory.map((h) => (
                    <div key={h.id} className="text-xs flex gap-2 items-start">
                      <span className={h.action === "approve" ? "text-green-600" : "text-red-600"}>
                        {h.action === "approve" ? "✓" : "✗"}
                      </span>
                      <div>
                        <span className="font-medium">{h.roleLabel}</span> — {h.userName}
                        <span className="text-zinc-400 ml-1">{formatDate(h.at)}</span>
                        {h.reason && <p className="text-red-600">{h.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.status === myStatus && (
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button
                  variant="outline"
                  onClick={() => { setRejectOpen(true); setRejectReason(""); setRejectTo("pur"); }}
                >
                  <XCircle className="h-4 w-4 text-red-500" /> Từ chối
                </Button>
                <Button onClick={handleApprove}>
                  <CheckCircle className="h-4 w-4" /> Duyệt
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Dialog từ chối */}
      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Từ chối ${selected?.code ?? ""}`}
      >
        <div className="space-y-4">
          <div>
            <Label>Lý do từ chối *</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do..."
              autoFocus
            />
          </div>
          <div>
            <Label>Trả về</Label>
            <Select
              value={rejectTo}
              onChange={(e) => setRejectTo(e.target.value as RejectTarget)}
            >
              <option value="pur">Thu mua (PUR) — sửa giá / NCC</option>
              <option value="department">Bộ phận đặt hàng — hủy / làm lại</option>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleReject}>
              Xác nhận từ chối
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
