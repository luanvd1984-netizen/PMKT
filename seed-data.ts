import type {
  User, Supplier, Item, Quote, Warehouse, Department,
  PurchaseRequest, PurchaseOrder,
} from "@/types";

export const seedUsers: User[] = [
  { id: "u1", username: "admin", password: "admin123", name: "Quản trị viên", role: "admin", departmentId: null, warehouseId: null },
  { id: "u2", username: "pur", password: "pur123", name: "Nguyễn Thị Lan (PUR)", role: "pur", departmentId: null, warehouseId: null },
  { id: "u3", username: "bep", password: "bep123", name: "Bếp trưởng Nguyễn Văn A", role: "department", departmentId: "d1", warehouseId: null },
  { id: "u4", username: "fb", password: "fb123", name: "QL F&B Trần Văn B", role: "department", departmentId: "d2", warehouseId: null },
  { id: "u5", username: "buongphong", password: "bp123", name: "Trưởng BP Lê Thị C", role: "department", departmentId: "d3", warehouseId: null },
  { id: "u6", username: "kythuat", password: "kt123", name: "Trưởng KT Phạm Văn D", role: "department", departmentId: "d4", warehouseId: null },
  { id: "u7", username: "letan", password: "lt123", name: "Trưởng LT Võ Thị E", role: "department", departmentId: "d5", warehouseId: null },
  { id: "u8", username: "cantin", password: "ct123", name: "QL Căn tin Đỗ Văn F", role: "department", departmentId: "d6", warehouseId: null },
  { id: "u9", username: "ketoan", password: "ketoan123", name: "Kế toán trưởng Đặng Thị I", role: "accountant", departmentId: null, warehouseId: null },
  { id: "u10", username: "pgd", password: "pgd123", name: "Phó Giám đốc Hoàng Văn P", role: "deputy", departmentId: null, warehouseId: null },
  { id: "u11", username: "giamdoc", password: "gd123", name: "Giám đốc Trần Văn G", role: "director", departmentId: null, warehouseId: null },
  { id: "u12", username: "kho", password: "kho123", name: "Kế toán kho Trần Thị K", role: "warehouse", departmentId: null, warehouseId: "w1" },
];

export const seedSuppliers: Supplier[] = [
  { id: "s1", code: "NCC001", name: "Công ty TNHH Thực phẩm Sạch Miền Đông", phone: "02543888999", taxCode: "3500123456", bank: "Vietcombank CN Vũng Tàu", status: "active", address: "Long Hải, BR-VT", contactPerson: "Nguyễn Văn A" },
  { id: "s2", code: "NCC002", name: "Công ty CP Vật tư Kỹ thuật Á Châu", phone: "02838111222", taxCode: "0301222333", bank: "ACB CN Sài Gòn", status: "active", contactPerson: "Trần Thị B" },
  { id: "s3", code: "NCC003", name: "Công ty TNHH Hóa chất Buồng phòng Hưng Thịnh", phone: "02873066077", taxCode: "0302555888", bank: "Techcombank CN Thủ Đức", status: "active" },
  { id: "s4", code: "NCC004", name: "Công ty CP Hải sản Long Hải", phone: "02543777888", taxCode: "3500987654", bank: "BIDV CN Bà Rịa", status: "active" },
  { id: "s5", code: "NCC005", name: "Nhà cung cấp Rau củ Đà Lạt GAP", phone: "02633822833", taxCode: "5800111222", bank: "Agribank CN Đà Lạt", status: "locked" },
];

export const seedItems: Item[] = [
  { id: "i1", code: "CC001", name: "Khăn tắm cotton khách sạn", group: "Công cụ dụng cụ", unit: "Cái", unitPrice: 85000, defaultSupplierId: "s3", status: "active" },
  { id: "i2", code: "CC002", name: "Ly thủy tinh Highball 350ml", group: "Công cụ dụng cụ", unit: "Cái", unitPrice: 32000, defaultSupplierId: "s2", status: "active" },
  { id: "i3", code: "HC001", name: "Nước lau sàn hương chanh 5L", group: "Hóa chất", unit: "Can", unitPrice: 95000, defaultSupplierId: "s3", status: "active" },
  { id: "i4", code: "HC002", name: "Dung dịch tẩy bồn cầu 1L", group: "Hóa chất", unit: "Chai", unitPrice: 42000, defaultSupplierId: "s3", status: "active" },
  { id: "i5", code: "TP001", name: "Thịt bò thăn nhập khẩu", group: "Thực phẩm tươi", unit: "Kg", unitPrice: 450000, defaultSupplierId: "s1", status: "active" },
  { id: "i6", code: "TP002", name: "Cá chẽm tươi", group: "Thực phẩm tươi", unit: "Kg", unitPrice: 180000, defaultSupplierId: "s4", status: "active" },
  { id: "i7", code: "TP003", name: "Tôm sú loại 1", group: "Thực phẩm tươi", unit: "Kg", unitPrice: 320000, defaultSupplierId: "s4", status: "active" },
  { id: "i8", code: "TP004", name: "Xà lách Romaine Đà Lạt", group: "Thực phẩm tươi", unit: "Kg", unitPrice: 65000, defaultSupplierId: "s5", status: "active" },
  { id: "i9", code: "TP005", name: "Trứng gà ta", group: "Thực phẩm tươi", unit: "Quả", unitPrice: 4500, defaultSupplierId: "s1", status: "active" },
  { id: "i10", code: "VT001", name: "Bóng đèn LED 9W", group: "Vật tư", unit: "Cái", unitPrice: 35000, defaultSupplierId: "s2", status: "active" },
  { id: "i11", code: "VT002", name: "Ống nước PVC phi 21", group: "Vật tư", unit: "Cái", unitPrice: 28000, defaultSupplierId: "s2", status: "active" },
];

export const seedQuotes: Quote[] = [
  { id: "q1", itemCode: "TP001", unitPrice: 450000, period: "2026-Q3", fromDate: "2026-07-01", toDate: "2026-09-30", updatedBy: "PUR - Nguyễn Thị Lan", status: "active" },
  { id: "q2", itemCode: "TP002", unitPrice: 175000, period: "2026-Q3", fromDate: "2026-07-01", toDate: "2026-09-30", updatedBy: "PUR - Nguyễn Thị Lan", status: "active" },
  { id: "q3", itemCode: "HC001", unitPrice: 92000, period: "2026-09", fromDate: "2026-09-01", toDate: "2026-09-30", updatedBy: "PUR - Trần Văn Hùng", status: "active" },
];

export const seedWarehouses: Warehouse[] = [
  { id: "w1", code: "K01", name: "Bếp Trung Tâm", keeper: "Nguyễn Văn Bếp", note: "Kho thực phẩm chính" },
  { id: "w2", code: "K02", name: "Bàn / Bar", keeper: "Trần Thị Bar", note: "Kho đồ uống, dụng cụ pha chế" },
  { id: "w3", code: "K03", name: "Buồng Phòng", keeper: "Lê Thị Buồng", note: "Kho hóa chất, vật dụng buồng phòng" },
  { id: "w4", code: "K11", name: "Căn Tin Nhân Viên", keeper: "Phạm Văn Tin", note: "Kho thực phẩm căn tin" },
  { id: "w5", code: "K12", name: "Bảo Trì Kỹ Thuật", keeper: "Hoàng Văn Kỹ", note: "Kho vật tư, thiết bị kỹ thuật" },
];

export const seedDepartments: Department[] = [
  { id: "d1", code: "PB01", name: "Bếp", defaultWarehouseId: "w1", monthlyBudget: 150000000, head: "Bếp trưởng Nguyễn Văn A" },
  { id: "d2", code: "PB02", name: "F&B (Nhà hàng)", defaultWarehouseId: "w2", monthlyBudget: 80000000, head: "Quản lý Trần Văn B" },
  { id: "d3", code: "PB03", name: "Buồng Phòng", defaultWarehouseId: "w3", monthlyBudget: 60000000, head: "Trưởng bộ phận Lê Thị C" },
  { id: "d4", code: "PB04", name: "Kỹ thuật", defaultWarehouseId: "w5", monthlyBudget: 100000000, head: "Trưởng phòng Phạm Văn D" },
  { id: "d5", code: "PB05", name: "Lễ tân", defaultWarehouseId: "w2", monthlyBudget: 20000000, head: "Trưởng lễ tân Võ Thị E" },
  { id: "d6", code: "PB06", name: "Căn tin", defaultWarehouseId: "w4", monthlyBudget: 40000000, head: "Quản lý Đỗ Văn F" },
  { id: "d7", code: "PB07", name: "Nhân sự (HR)", defaultWarehouseId: null, monthlyBudget: 15000000, head: "Trưởng phòng Bùi Thị G" },
  { id: "d8", code: "PB08", name: "Công nghệ thông tin (IT)", defaultWarehouseId: "w5", monthlyBudget: 30000000, head: "Trưởng phòng Ngô Văn H" },
  { id: "d9", code: "PB09", name: "Kế toán", defaultWarehouseId: null, monthlyBudget: 25000000, head: "Kế toán trưởng Đặng Thị I" },
  { id: "d10", code: "PB10", name: "Kinh doanh & Marketing", defaultWarehouseId: null, monthlyBudget: 50000000, head: "Giám đốc KD Lý Văn K" },
  { id: "d11", code: "PB11", name: "An ninh", defaultWarehouseId: null, monthlyBudget: 18000000, head: "Đội trưởng Trịnh Văn L" },
];

export const seedPRs: PurchaseRequest[] = [];
export const seedPOs: PurchaseOrder[] = [];
