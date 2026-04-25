import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

interface QRStickerProps {
  salonId: string;
  salonName: string;
  address: string;
}

export const QRSticker: React.FC<QRStickerProps> = ({ salonId, salonName, address }) => {
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
    const stickerHeight = 1800; // Increased height to fit address
    stickerCanvas.width = stickerWidth;
    stickerCanvas.height = stickerHeight;

    // 1. Background (White)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, stickerWidth, stickerHeight);

    // 2. Border
    ctx.strokeStyle = '#9333EA'; // Purple border
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, stickerWidth - 40, stickerHeight - 40);

    // 3. Salon Name (BIG)
    ctx.fillStyle = '#9333EA';
    ctx.textAlign = 'center';
    ctx.font = 'black 120px sans-serif';
    ctx.fillText(salonName.toUpperCase(), stickerWidth / 2, 220);

    // 4. Call to Action Quote
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText('Book our salon chair at', stickerWidth / 2, 330);
    
    ctx.fillStyle = '#9333EA';
    ctx.font = 'black 80px sans-serif';
    ctx.fillText('salonchair.website', stickerWidth / 2, 430);

    // 5. Draw the QR Code
    const qrSize = 750;
    const qrX = (stickerWidth - qrSize) / 2;
    const qrY = 500;
    
    // Create a temporary canvas for higher resolution QR
    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);

    // 6. Address
    ctx.fillStyle = '#6B7280';
    ctx.font = 'bold 45px sans-serif';
    // Handle long addresses with simple wrapping (center-aligned)
    const words = address.split(' ');
    let line = '';
    let y = qrY + qrSize + 100;
    for(let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > 1000 && n > 0) {
        ctx.fillText(line, stickerWidth / 2, y);
        line = words[n] + ' ';
        y += 60;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, stickerWidth / 2, y);

    // 7. Footer Matter
    ctx.fillStyle = '#000000';
    ctx.font = 'black 100px sans-serif';
    ctx.fillText('SCAN & BOOK', stickerWidth / 2, stickerHeight - 220);

    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#9333EA';
    ctx.fillText('No waiting • Check real-time availability • Secure bookings', stickerWidth / 2, stickerHeight - 120);

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
        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Your Salon QR Sticker</h3>
        <p className="text-white/60 mb-8 max-w-sm text-sm">
          A high-conversion sticker for your shop. Shows your salon name, address, and a direct booking QR code.
        </p>

        {/* Visual Preview of the sticker */}
        <div 
          ref={stickerRef}
          className="bg-white p-8 rounded-[2rem] shadow-2xl border-4 border-purple-600 mb-8 w-full max-w-[380px] aspect-[1/1.4] flex flex-col items-center justify-between overflow-hidden"
        >
          <div className="text-center w-full">
            <h4 className="text-purple-600 font-black text-2xl uppercase tracking-tighter truncate px-2 mb-2">{salonName}</h4>
            <p className="text-black font-bold text-[10px] uppercase tracking-wider mb-0.5">Book our salon chair at</p>
            <p className="text-purple-600 font-black text-sm uppercase tracking-widest">salonchair.website</p>
          </div>
          
          <div className="bg-[#f3f4f6] p-3 rounded-2xl border-2 border-dashed border-purple-200 my-4">
            <QRCodeCanvas
              id="salon-qr-canvas"
              value={bookingUrl}
              size={180}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="w-full text-center px-4">
            <p className="text-gray-500 font-bold text-[10px] uppercase tracking-wide line-clamp-2">{address}</p>
          </div>

          <div className="text-center w-full mt-4 pt-4 border-t border-gray-100">
            <p className="text-black font-black text-xl italic tracking-tighter leading-none mb-1 uppercase">Scan & Book</p>
            <p className="text-purple-600 font-bold text-[7px] uppercase tracking-[0.1em]">No waiting • Real-time Availability</p>
          </div>
        </div>

        <button
          onClick={downloadSticker}
          className="flex items-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/20 w-full justify-center"
        >
          <Download className="w-5 h-5" />
          Download Premium Sticker
        </button>
        <p className="mt-4 text-[10px] text-white/20 font-bold uppercase tracking-widest">
          High-resolution PNG • Print ready for your shop window
        </p>
      </div>
    </div>
  );
};
