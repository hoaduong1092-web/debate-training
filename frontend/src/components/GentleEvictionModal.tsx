import React from 'react';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
}

export const GentleEvictionModal: React.FC<Props> = ({ isOpen, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400 text-2xl">
          ⚠️
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Phiên Làm Việc Đã Thay Đổi</h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          Tài khoản của bạn vừa được kết nối ở một thiết bị khác. Phiên hoạt động hiện tại đã bị thay thế để bảo vệ hồ sơ tư duy cá nhân (Thinking DNA) của bạn.
        </p>
        <button
          onClick={onConfirm}
          type="button"
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg transition duration-200"
        >
          Tôi Đã Hiểu & Đăng Nhập Lại
        </button>
      </div>
    </div>
  );
};

export default GentleEvictionModal;
