'use client'

import { useAppStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { translations } from '@/lib/translations'

interface TermsModalProps {
  open: boolean
  onClose: () => void
}

export default function TermsModal({ open, onClose }: TermsModalProps) {
  const { language } = useAppStore()
  const t = translations[language]

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-md rounded-2xl border-0 shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-xl font-bold text-green-800">
            {language === 'vi' ? '📋 Điều Khoản Sử Dụng Z-Market' : '📋 Z-Market Terms of Service'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[350px] pr-4 py-4 text-sm text-foreground/80 leading-relaxed space-y-4">
          {language === 'vi' ? (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-green-700">1. Giới thiệu dịch vụ</h3>
              <p>
                Z-Market là một nền tảng số hóa chợ truyền thống Việt Nam, kết nối người mua, tiểu thương và shipper. Bằng việc truy cập hoặc sử dụng ứng dụng, bạn đồng ý tuân thủ toàn bộ các điều khoản quy định tại đây.
              </p>

              <h3 className="text-base font-bold text-green-700">2. Đăng ký & Bảo mật tài khoản</h3>
              <p>
                Người dùng chịu trách nhiệm duy trì tính bảo mật của tài khoản và mật khẩu cá nhân. Bạn cam kết cung cấp thông tin liên hệ (tên, số điện thoại, địa chỉ) chính xác để phục vụ cho việc vận chuyển và liên hệ khi cần thiết.
              </p>

              <h3 className="text-base font-bold text-green-700">3. Quy định đối với Tiểu thương</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cam kết cung cấp hàng hóa đảm bảo chất lượng, tươi ngon, vệ sinh an toàn thực phẩm.</li>
                <li>Niêm yết đúng giá cả và cập nhật trạng thái kho hàng chính xác.</li>
                <li>Không bán hàng giả, hàng nhái, hoặc hàng cấm theo quy định pháp luật.</li>
              </ul>

              <h3 className="text-base font-bold text-green-700">4. Quy định đối với Shipper</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nhận và giao đơn hàng trong thời gian cam kết (30-45 phút).</li>
                <li>Bảo quản hàng hóa nguyên vẹn trong quá trình di chuyển.</li>
                <li>Thái độ phục vụ văn minh, lịch sự với cả tiểu thương và khách hàng.</li>
              </ul>

              <h3 className="text-base font-bold text-green-700">5. Quy trình Đổi trả & Hoàn tiền</h3>
              <p>
                Do đặc thù hàng chợ truyền thống (hàng tươi sống, thực phẩm), khách hàng được quyền kiểm tra hàng khi nhận. Mọi khiếu nại về chất lượng sản phẩm tươi sống cần được phản hồi ngay khi shipper giao hàng hoặc thông qua tính năng Phản hồi trong vòng 2 giờ kể từ khi nhận.
              </p>

              <h3 className="text-base font-bold text-green-700">6. Bản quyền & Sở hữu trí tuệ</h3>
              <p>
                Toàn bộ nội dung, giao diện, và logo thương hiệu Z-Market thuộc quyền sở hữu trí tuệ của dự án. Mọi hành vi sao chép trái phép đều bị nghiêm cấm.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-green-700">1. Description of Services</h3>
              <p>
                Z-Market is a digital platform designed to digitize traditional Vietnamese markets, connecting buyers, market stall owners (sellers), and shippers. By accessing or using the platform, you agree to comply with all terms stated herein.
              </p>

              <h3 className="text-base font-bold text-green-700">2. Registration & Account Security</h3>
              <p>
                Users are solely responsible for maintaining the confidentiality of their account credentials. You agree to provide accurate and complete contact information (name, phone number, address) to facilitate safe delivery and communications.
              </p>

              <h3 className="text-base font-bold text-green-700">3. Rules for Sellers</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Guarantee goods are fresh, clean, and comply with food safety standards.</li>
                <li>List prices transparently and maintain accurate stock levels.</li>
                <li>Never list counterfeit, expired, or prohibited items.</li>
              </ul>

              <h3 className="text-base font-bold text-green-700">4. Rules for Shippers</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Pick up and deliver orders within the promised window (30-45 mins).</li>
                <li>Handle goods with care during transportation to prevent damage.</li>
                <li>Maintain a polite, professional attitude towards sellers and customers.</li>
              </ul>

              <h3 className="text-base font-bold text-green-700">5. Returns & Refunds</h3>
              <p>
                Given the nature of fresh market goods, buyers have the right to inspect goods upon delivery. Quality complaints about fresh produce must be reported immediately upon receipt or via the Feedback tab within 2 hours of delivery.
              </p>

              <h3 className="text-base font-bold text-green-700">6. Intellectual Property</h3>
              <p>
                All code, content, layout design, and brand assets of Z-Market belong exclusively to the Z-Market project. Unauthorized reproduction is strictly prohibited.
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-3 border-t mt-3">
          <Button 
            onClick={onClose} 
            className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md px-6"
          >
            {language === 'vi' ? 'Đã hiểu & Đóng' : 'Got it & Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
