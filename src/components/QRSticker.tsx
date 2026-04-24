import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

interface QRStickerProps {
  salonId: string;
  salonName: string;
}

export const QRSticker: React.FC<QRStickerProps> = ({ salonId, salonName }) => {
  const stickerRef = useRef<HTMLDivElement>(null);
  
  // Create the booking URL
  const bookingUrl = `${window.location.origin}/salon/${salonId}`;

  const downloadSticker = () => {
    const canvas = document.getElementById('salon-qr-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Create a larger canvas for the sticker
    const stickerCanvas = document.createElement('canvas');
    const ctx = stickerCanvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions for a high-quality sticker (A5 size aspect ratio or square)
    const stickerWidth = 1200;
    const stickerHeight = 1600;
    stickerCanvas.width = stickerWidth;
    stickerCanvas.height = stickerHeight;

    // 1. Background (White)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, stickerWidth, stickerHeight);

    // 2. Border
    ctx.strokeStyle = '#9333EA'; // Purple border
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, stickerWidth - 40, stickerHeight - 40);

    // 3. Header Text (Website Name)
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    
    // Website Title
    ctx.font = 'black 80px sans-serif';
    ctx.fillText('SalonChair.website', stickerWidth / 2, 200);

    // Salon Name
    ctx.font = 'bold 100px sans-serif';
    ctx.fillStyle = '#9333EA';
    ctx.fillText(salonName, stickerWidth / 2, 350);

    // 4. Draw the QR Code
    const qrSize = 800;
    const qrX = (stickerWidth - qrSize) / 2;
    const qrY = 450;
    
    // Create a temporary canvas for higher resolution QR
    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);

    // 5. Footer Text ("Scan & Book")
    ctx.fillStyle = '#000000';
    ctx.font = 'black 120px sans-serif';
    ctx.fillText('SCAN & BOOK', stickerWidth / 2, stickerHeight - 200);

    ctx.font = 'bold 50px sans-serif';
    ctx.fillStyle = '#6B7280';
    ctx.fillText('Instant Appointments • No Waiting', stickerWidth / 2, stickerHeight - 100);

    // Download the image
    const dataUrl = stickerCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${salonName.replace(/\s+/g, '_')}_QR_Sticker.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl">
        <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6">
          <QrCode className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Your Unique QR Sticker</h3>
        <p className="text-white/60 mb-8 max-w-sm">
          Place this unique QR sticker at your shop's entrance or counter. 
          Customers can scan it to instantly book an appointment at your salon.
        </p>

        {/* Visual Preview of the sticker */}
        <div 
          ref={stickerRef}
          className="bg-white p-10 rounded-3xl shadow-2xl border-8 border-purple-600 mb-8 w-full max-w-[350px] aspect-[3/4] flex flex-col items-center justify-between"
        >
          <div className="text-center">
            <p className="text-black/40 font-black text-[10px] uppercase tracking-[0.2em] mb-1">SalonChair.website</p>
            <h4 className="text-purple-600 font-black text-xl truncate px-2">{salonName}</h4>
          </div>
          
          <div className="bg-[#f3f4f6] p-4 rounded-2xl border-4 border-dashed border-purple-200">
            <QRCodeCanvas
              id="salon-qr-canvas"
              value={bookingUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="text-center">
            <p className="text-black font-black text-2xl italic tracking-tighter leading-none mb-1 uppercase">Scan & Book</p>
            <p className="text-black/60 font-medium text-[8px] uppercase tracking-widest">Appointments • No Waiting</p>
          </div>
        </div>

        <button
          onClick={downloadSticker}
          className="flex items-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/20"
        >
          <Download className="w-5 h-5" />
          Download QR Sticker
        </button>
        <p className="mt-4 text-[10px] text-white/20 font-bold uppercase tracking-widest">
          High-resolution PNG • Print ready
        </p>
      </div>
    </div>
  );
};
