import React from 'react';
import { X } from 'lucide-react';
import { QRSticker } from './QRSticker';

interface QRStickerModalProps {
  salonId: string;
  salonName: string;
  address: string;
  onClose: () => void;
}

export const QRStickerModal: React.FC<QRStickerModalProps> = ({ salonId, salonName, address, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Your Salon QR Sticker</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <QRSticker salonId={salonId} salonName={salonName} address={address} />
        </div>
      </div>
    </div>
  );
};
