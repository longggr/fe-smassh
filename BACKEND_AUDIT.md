# SmashHub: kiểm tra lại theo mã Java thực tế

Nguồn đối chiếu: tệp mã Java người dùng đính kèm, không phải master prompt trước đó. Repository hiện tại chỉ chứa frontend; **chưa chỉnh sửa hoặc deploy backend Java**.

## Các sai lệch frontend đã sửa

| Hạng mục | Controller / DTO thực tế | Cách frontend xử lý |
| --- | --- | --- |
| Login/refresh | `AuthResponse { token, authenticated }` | Không yêu cầu cặp `accessToken`/`refreshToken`; renewal gửi JWT hiện tại theo `AuthServiceImpl.refreshToken`. |
| JWT identity | `JwtServiceImpl.generateToken` đặt `sub = user.username` | Không dùng `sub` làm email gọi `/users/email/...`; lưu riêng email đăng nhập, giữ qua reload. |
| Cart | `CartMutationResponse { cart, cartToken }` | Unwrap `cart.items`; dùng `subtotal`, `effectivePrice`, `lineTotal`, `availableStock`, `issueCount`, `unavailable`, `stockInsufficient`. |
| Catalog | `productStatus`, `colorName`, `attrName`, `attrValue` | Sửa mapping và form ghi Product/Color/Attribute/Image theo đúng request DTO đã có. |
| Địa chỉ | Request dùng `primary`; response `primaryAddress = PRIMARY/SECONDARY` | POST/PUT đúng DTO, PATCH `/addresses/{id}/primary`, DELETE địa chỉ với xác nhận. |
| Phường/xã | `WardResponse { code, districtId, name }` | Đọc `code`, không bỏ mất toàn bộ options do chỉ tìm `WardCode`/`wardCode`. |
| Phí GHN | `ShippingFeeRequest { addressId?, toDistrictId?, toWardCode?, shippingMethod }` | Checkout gửi `addressId` + `shippingMethod`; không yêu cầu khách nhập cân nặng hoặc gửi `items` không có trong DTO. Backend tự tính khối lượng từ giỏ DB. |
| Đơn hàng | Địa chỉ snapshot nằm ở các trường `shippingRecipientName`, `shippingLine1`, … | Chuyển sang view địa chỉ mà không yêu cầu object `address` không tồn tại. |
| VNPAY Return | `VnpayReturnResponse.status = SUCCESS/FAILED` | Chỉ tin status từ API, không đợi trường `isSuccess` không tồn tại, không tin riêng query trình duyệt. IPN vẫn là nguồn cập nhật trạng thái đơn. |
| Hủy/thanh toán lại | Customer cancel chỉ `PENDING_PAYMENT`/`PROCESSING`; repay chỉ `PENDING_PAYMENT` | Không mời hủy đơn PAID hoặc thanh toán lại đơn EXPIRED khi service thực tế từ chối. |
| Tracking | `ShipmentTrackingResponse` là snapshot, không phải array sự kiện | Hiển thị mã GHN, trạng thái, phí, COD, ETA; không tạo timeline sự kiện giả. |
| Admin Orders | `/admin/orders`, `/{id}`, `PUT /{id}/status`, `POST /{id}/retry-shipment` | Nối danh sách toàn bộ, filter trạng thái, chi tiết, chuyển trạng thái có xác nhận, retry shipment. |
| Category root | `parentId = null`, không phải `0` | Không gửi ID cha `0` khiến service báo CATEGORY_PARENT_NOT_FOUND. |
| User pagination | `/users` trả List; `/users/search` trả PageResponse và yêu cầu `keyword` | Màn quản lý dùng search với `keyword=` rõ ràng để có tổng trang, không mất nút Next do đoán List là Page. |
| Update user | Backend lỗi với username giữ nguyên và bỏ qua phone | Frontend chỉ gửi trường thay đổi; kiểm tra response và không báo lưu phone thành công khi backend không áp dụng. Đổi username của chính mình cần đăng nhập lại vì JWT dùng username cũ. |

## Lỗi backend cần sửa trước khi triển khai công khai

### 1. Nghiêm trọng: renewal JWT chưa xác thực

`AuthServiceImpl.refreshToken` gọi `SignedJWT.parse`, lấy `sub` rồi cấp JWT mới nhưng **không kiểm tra chữ ký, blacklist hoặc hạn/policy refresh trước khi cấp**. Parse JWT không phải xác thực JWT. Khóa refresh ở frontend chỉ chống gọi trùng, không khắc phục lỗ hổng này.

Khuyến nghị tạm hạn chế endpoint public cho đến khi có xác minh mật mã, blacklist/revocation và chính sách thời hạn renewal rõ ràng. Nếu muốn refresh sau khi access token hết hạn, thiết kế và kiểm tra refresh token riêng hoặc cửa sổ renewal được ký/xác thực đúng; không chỉ parse payload hay dựa vào UI.

### 2. Cao: login chưa chặn tài khoản chưa kích hoạt

`AuthServiceImpl.authenticate` chặn `LOCKED`, nhưng không chặn `INACTIVE`/email chưa xác thực. Cần thực thi trạng thái tài khoản tại backend trước khi cấp JWT; trang OTP trên frontend không phải biện pháp bảo mật.

### 3. Cao: quyền truy cập User API chưa đầy đủ

`SecurityConfig` yêu cầu authenticated cho User API, nhưng `UserController` chưa thể hiện kiểm tra vai trò/ownership cho list, search, get, update, delete. Cần kiểm tra quyền ở backend; ẩn nút Admin trên frontend không ngăn được gọi API trực tiếp.

### 4. Chức năng đổi mật khẩu đang lệch định danh

`UserController.changePassword` lấy `authentication.getName()` (username từ JWT) và truyền vào `AuthServiceImpl.changePassword`, nhưng service dùng `findByEmail`. Sửa tra cứu nhất quán bằng principal username/ID hoặc email xác thực từ server; không cho client tự chọn tài khoản cần đổi.

### 5. Update user chưa lưu phone và kiểm tra trùng username sai

`UserServiceImpl.updateUser` không gọi `setPhone`. `existsByUsername` cũng không loại trừ chính user hiện tại. Cần cập nhật trường phone với kiểm tra trùng hợp lệ và so sánh username với bản ghi đang sửa. Frontend không thể tự sửa dữ liệu DB khi service bỏ qua trường.

### 6. Quyền theo dõi GHN và điều kiện retry shipment

`ShippingServiceImpl.getTrackingInfo` so role name với `ROLE_ADMIN`, trong khi `JwtServiceImpl.buildScope` tự thêm tiền tố `ROLE_` vào role name lưu DB. Cần kiểm tra quyền đúng cho Admin/Staff khi xem đơn của khách khác.

`retryShipmentAdmin` chuyển thẳng sang tạo shipment mà chưa thấy guard trạng thái đơn ở service đó. Backend cần từ chối retry cho đơn chưa thanh toán hoặc đã kết thúc; frontend chỉ mở retry cho PAID/PROCESSING/SHIPPING.

### 7. Phí ship qua addressId cần kiểm tra ownership

`ShippingServiceImpl.calculateFee` dùng `addressRepository.findById` khi có `addressId`. Nên bắt buộc JWT và kiểm tra địa chỉ thuộc user khi dùng ID; khách vãng lai chỉ dùng district/ward trực tiếp.

## Kiểm tra backend đang chạy

Trong lượt kiểm tra này, các GET chỉ đọc ở URL Ngrok đã cung cấp trả HTTP 200 / code 1000:

- `/products?page=0&size=1`
- Chi tiết sản phẩm công khai lấy từ kết quả catalog
- `/categories`
- `/brands`
- `/locations/provinces`

`/locations/provinces` hiện trả **danh sách rỗng**. Đây là dữ liệu backend chưa sẵn sàng, khiến thêm địa chỉ/checkout chưa thể chạy trọn luồng với dữ liệu thật. UI giải thích tình trạng này và có thao tác ADMIN đồng bộ qua endpoint đã có `POST /locations/sync`, với xác nhận; không tự động đồng bộ hoặc tạo dữ liệu giả.

Không thử đăng nhập bằng tài khoản thật, không tạo đơn, không thanh toán, không sửa dữ liệu backend trong các lần probe. Kiểm thử ghi dữ liệu dùng fixture theo DTO Java trong `tests/fixtures/java-backend.json`.
