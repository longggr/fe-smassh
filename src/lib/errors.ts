export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code?: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}
export function backendMessage(code: number | undefined, message?: string) {
  switch (code) {
    case 1006:
      return "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
    case 1007:
      return "Bạn không có quyền thực hiện thao tác này (403)."
    case 1009:
    case 1011:
    case 1023:
      return `Tài khoản đang bị khóa. ${message || "Vui lòng chờ trước khi thử lại."}`
    case 1019:
      return "Mã OTP không hợp lệ hoặc đã hết hạn."
    case 2044:
      return "Sản phẩm tạm thời hết hàng hoặc số lượng vượt tồn kho."
    case 2201:
      return "Giỏ hàng trống. Vui lòng chọn sản phẩm trước khi thanh toán."
    case 2301:
      return (
        message ||
        "Không thể thực hiện thao tác với đơn hàng ở trạng thái hiện tại."
      )
    case 2308:
      return "Đơn hàng đã hết hạn. Backend hiện không cho thanh toán lại đơn EXPIRED."
    default:
      return message || "Backend từ chối yêu cầu."
  }
}
