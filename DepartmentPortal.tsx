"use client";

import { useEffect, useState } from "react";
import {
  Plus, Send, FileText, LogOut, Trash2, Package,
} from "lucide-react";
import { toast } from "sonner";
import type { User, Item, PurchaseRequest, PRLine, Department } from "@/types";
import {
  getItems, getPRs, savePRs, getDepartments, nextPRCode, logout,
} from "@/lib/storage";
import { formatVND, generateId, formatDate, PR_STATUS_LABEL, cn } from "@/lib/utils";
import { Button, Input, Select, Badge, Dialog, Label } from "./ui";

export default function DepartmentPortal({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [dept, setDept] = useState<Department | null>(null);
  const [view, setView] = useState<"list" | "create">("list");
  const [selectedPr, setSelectedPr] = useState<PurchaseRequest | null>(null);

  // Form tạo PR
  const [note, setNote] = useState("");
  const [neededDate, setNeededDate] = useState("");
  const [lines, setLines] = useState<
    { itemId: string; quantity: number; note: string }[]
  >([{ itemId: "", quantity: 1, note: "" }]);

  useEffect(() => {
    setItems(getItems().filter((i) => i.status === "active"));
    const all = getPRs();
    setPrs(all.filter((p) => p.departmentId === user.departmentId));
    const deps = getDepartments();
    setDept(deps.find((d) => d.id === user.departmentId) ?? null);
  }, [user.departmentId]);

  function refresh() {
    const all = getPRs();
    setPrs(all.filter((p) => p.departmentId === user.departmentId));
  }

  function addLine() {
    setLines([...lines, { itemId: "", quantity: 1, note: "" }]);
  }

  function removeLine(idx: number) {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: string, value: string | number) {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    setLines(next);
  }

  function handleCreate(asDraft: boolean) {
    const validLines = lines.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0) {
      toast.error("Thêm ít nhất 1 mặt hàng");
      return;
    }
    if (!neededDate) {
      toast.error("Chọn ngày cần hàng");
      return;
    }
    if (!dept) {
      toast.error("Không tìm thấy phòng ban");
      return;
    }

    const prLines: PRLine[] = validLines.map((l) => {
      const item = items.find((i) => i.id === l.itemId)!;
      return {
        id: generateId(),
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        unit: item.unit,
        quantity: Number(l.quantity),
        note: l.note,
        unitPrice: null,
        supplierId: null,
        supplierCode: null,
      };
    });

    const allPrs = getPRs();
    const pr: PurchaseRequest = {
      id: generateId(),
      code: nextPRCode(allPrs),
      departmentId: dept.id,
      departmentName: dept.name,
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      submittedAt: asDraft ? null : new Date().toISOString(),
      status: asDraft ? "draft" : "submitted",
      neededDate: neededDate || null,
      note,
      lines: prLines,
      approvalHistory: [],
      rejectReason: null,
      rejectTo: null,
    };

    const next = [...allPrs, pr];
    savePRs(next);
    refresh();
    setView("list");
    setNote("");
    setNeededDate("");
    setLines([{ itemId: "", quantity: 1, note: "" }]);
    toast.success(asDraft ? `Đã lưu nháp ${pr.code}` : `Đã gửi ${pr.code} đến Thu mua`);
  }

  function handleSubmitDraft(pr: PurchaseRequest) {
    const all = getPRs();
    const next = all.map((p) =>
      p.id === pr.id
        ? { ...p, status: "submitted" as const, submittedAt: new Date().toISOString() }
        : p
    );
    savePRs(next);
    refresh();
    setSelectedPr(null);
    toast.success(`Đã gửi ${pr.code} đến Thu mua`);
  }

  function handleDeleteDraft(pr: PurchaseRequest) {
    if (!confirm(`Xóa phiếu nháp ${pr.code}?`)) return;
    const all = getPRs();
    savePRs(all.filter((p) => p.id !== pr.id));
    refresh();
    setSelectedPr(null);
    toast.success("Đã xóa");
  }

  function statusBadge(status: string) {
    const map: Record<string, "default" | "success" | "muted" | "warning"> = {
      draft: "muted",
      submitted: "warning",
      processing: "warning",
      completed: "success",
      rejected: "default",
    };
    return (
      <Badge variant={map[status] || "muted"}>
        {PR_STATUS_LABEL[status] || status}
      </Badge>
    );
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
              <h1 className="font-semibold">Yêu cầu mua hàng</h1>
              <p className="text-xs text-zinc-500">
                {dept?.name ?? "—"} · {user.name}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); onLogout(); }}>
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {view === "list" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Phiếu yêu cầu của tôi</h2>
              <Button onClick={() => setView("create")}>
                <Plus className="h-4 w-4" /> Tạo yêu cầu mới
              </Button>
            </div>

            {prs.length === 0 ? (
              <div className="rounded-xl border bg-white p-12 text-center text-zinc-400">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p>Chưa có phiếu yêu cầu nào</p>
                <Button className="mt-4" onClick={() => setView("create")}>
                  Tạo phiếu đầu tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {prs
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((pr) => (
                    <button
                      key={pr.id}
                      onClick={() => setSelectedPr(pr)}
                      className="w-full rounded-xl border bg-white p-4 text-left hover:border-zinc-300 transition-colors shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{pr.code}</span>
                            {statusBadge(pr.status)}
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {pr.lines.length} mặt hàng · {formatDate(pr.createdAt)}{pr.neededDate ? ` · Cần: ${pr.neededDate}` : ""}
                            {pr.submittedAt && ` · Gửi: ${formatDate(pr.submittedAt)}`}
                          </p>
                          {pr.note && (
                            <p className="mt-1 text-sm text-zinc-600 truncate">{pr.note}</p>
                          )}
                        </div>
                        <Package className="h-5 w-5 text-zinc-300 shrink-0" />
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </>
        )}

        {view === "create" && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tạo yêu cầu mua hàng</h2>
              <Button variant="outline" onClick={() => setView("list")}>Quay lại</Button>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Ngày cần hàng *</Label>
                <Input
                  type="date"
                  value={neededDate}
                  onChange={(e) => setNeededDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Ghi chú (tùy chọn)</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Cần gấp cho buffet cuối tuần..."
                />
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <Label>Danh sách hàng cần mua</Label>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5" /> Thêm dòng
              </Button>
            </div>

            <div className="space-y-3 mb-6">
              {lines.map((line, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 rounded-lg border p-3 bg-zinc-50/50">
                  <div className="flex-1">
                    <Select
                      value={line.itemId}
                      onChange={(e) => updateLine(idx, "itemId", e.target.value)}
                    >
                      <option value="">— Chọn hàng —</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.code} — {i.name} ({i.unit})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-full sm:w-28">
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))}
                      placeholder="SL"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={line.note}
                      onChange={(e) => updateLine(idx, "note", e.target.value)}
                      placeholder="Ghi chú dòng"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => handleCreate(true)}>
                Lưu nháp
              </Button>
              <Button onClick={() => handleCreate(false)}>
                <Send className="h-4 w-4" /> Gửi đến Thu mua
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Chi tiết PR */}
      <Dialog
        open={!!selectedPr}
        onClose={() => setSelectedPr(null)}
        title={selectedPr?.code ?? ""}
      >
        {selectedPr && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {statusBadge(selectedPr.status)}
              <span className="text-sm text-zinc-500">
                Tạo: {formatDate(selectedPr.createdAt)}
              </span>
            </div>
            {selectedPr.note && (
              <p className="text-sm bg-zinc-50 rounded-lg p-3">{selectedPr.note}</p>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="pb-2 font-medium">Mã</th>
                  <th className="pb-2 font-medium">Tên hàng</th>
                  <th className="pb-2 font-medium">SL</th>
                  <th className="pb-2 font-medium">ĐVT</th>
                  <th className="pb-2 font-medium">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {selectedPr.lines.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{l.itemCode}</td>
                    <td className="py-2">{l.itemName}</td>
                    <td className="py-2">{l.quantity}</td>
                    <td className="py-2">{l.unit}</td>
                    <td className="py-2 text-zinc-500">{l.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedPr.status === "draft" && (
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => handleDeleteDraft(selectedPr)}>
                  <Trash2 className="h-4 w-4" /> Xóa nháp
                </Button>
                <Button onClick={() => handleSubmitDraft(selectedPr)}>
                  <Send className="h-4 w-4" /> Gửi đến Thu mua
                </Button>
              </div>
            )}

            {selectedPr.status === "rejected" && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                <strong>Đã từ chối.</strong> {selectedPr.rejectReason || ""}
              </div>
            )}
            {selectedPr.status === "ordered" && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                Đã gửi PO — đang chờ giao hàng.
              </div>
            )}
            {selectedPr.status === "approved" && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                Đã duyệt xong — Thu mua sẽ gửi PO cho NCC.
              </div>
            )}
            {["pending_ktt","pending_pgd","pending_gd"].includes(selectedPr.status) && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Đang trong quy trình duyệt ký.
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
