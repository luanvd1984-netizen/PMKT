# Oceanami Resort — App Mua hàng

Phần mềm nội bộ: đặt hàng (PR) → duyệt → PO → nhận hàng → nhập kho → báo cáo → xuất Excel MISA AMIS.

## Cài đặt & chạy (Windows)

1. Cài **Node.js LTS**: https://nodejs.org (nếu chưa có)
2. Giải nén thư mục này
3. Double-click **`1-CAI-DAT.bat`** (chỉ lần đầu)
4. Double-click **`2-CHAY-APP.bat`** mỗi lần dùng
5. Mở trình duyệt: **http://localhost:3000**

Hoặc lệnh:

```bash
npm install
npm run dev
```

## Tài khoản demo

| User | Mật khẩu | Vai trò |
|------|----------|---------|
| bep | bep123 | Bếp — tạo PR |
| fb | fb123 | F&B |
| cantin | ct123 | Căn tin |
| buongphong | bp123 | Buồng phòng |
| pur | pur123 | Thu mua |
| kho | kho123 | Kế toán kho — nhập SL thực nhận |
| ketoan | ketoan123 | Kế toán duyệt |
| pgd | pgd123 | Phó GĐ duyệt |
| giamdoc | gd123 | Giám đốc duyệt |
| admin | admin123 | Admin + Master Data |

## Quy trình

1. BP tạo PR (ngày cần hàng + ghi chú) → Gửi  
2. PUR gán giá + NCC → Trình ký  
3. KTT → PGĐ → GĐ duyệt / từ chối  
4. PUR gửi PO → In phiếu (ghi tay khi nhận)  
5. PUR bấm **Nhận hàng** (hàng đã về, không nhập số)  
6. **Kế toán kho** nhập **SL thực nhận** → phiếu NK  
7. PUR: Đổi NCC / Hủy phần thiếu → **Hoàn tất**  
8. Xuất **Excel MISA** từ tab Nhập kho  
9. **Báo cáo**: nhập tháng, mua theo BP, PO chưa giao đủ  

## Lưu ý

- Dữ liệu lưu trên trình duyệt (localStorage) — mỗi máy một kho dữ liệu demo  
- Muốn cả resort dùng chung 1 chỗ: cần deploy server / Vercel + database  
- Mã kho / mã hàng nên trùng MISA để import AMIS suôn  

## Hỗ trợ

Sửa danh mục: đăng nhập pur/admin → Master Data.
