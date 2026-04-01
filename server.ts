import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Razorpay Order Creation
  app.post("/api/payment/order", async (req, res) => {
    try {
      const { amount, currency = "INR", receipt } = req.body;
      const options = {
        amount: amount * 100, // amount in the smallest currency unit
        currency,
        receipt,
      };
      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error) {
      console.error("Razorpay Order Error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Razorpay Payment Verification
  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(sign.toString())
        .digest("hex");

      if (razorpay_signature === expectedSign) {
        res.json({ status: "ok" });
      } else {
        res.status(400).json({ error: "Invalid signature" });
      }
    } catch (error) {
      console.error("Razorpay Verification Error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Razorpay QR Code Creation
  app.post("/api/payment/qr", async (req, res) => {
    try {
      const { amount, name, description, salonId } = req.body;
      console.log("Creating QR for:", { amount, name, description, salonId });
      
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        console.error("Missing Razorpay keys in environment variables");
        return res.status(500).json({ 
          error: "Razorpay keys are missing", 
          details: "Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the Secrets panel." 
        });
      }

      // Re-initialize to ensure latest keys are used
      const rzp = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const qrCode = await rzp.qrCode.create({
        type: "upi_qr",
        name: name || "Salon Chair",
        usage: "single_payment",
        fixed_amount: true,
        payment_amount: Math.round(amount * 100),
        description: description || "Salon Subscription",
        notes: {
          salonId: salonId,
        },
      });
      console.log("QR Code created successfully:", qrCode.id);
      res.json(qrCode);
    } catch (error: any) {
      console.error("Razorpay QR Error Details:", error);
      res.status(500).json({ 
        error: "Failed to create QR code", 
        details: error.message || "Unknown error",
        code: error.code,
        metadata: error.metadata
      });
    }
  });

  // Check QR Code Payment Status
  app.get("/api/payment/qr/:qrId", async (req, res) => {
    try {
      const { qrId } = req.params;
      const payments = await razorpay.qrCode.fetchAllPayments(qrId);
      
      // If there's at least one successful payment for this QR code
      const successfulPayment = payments.items.find((p: any) => p.status === "captured");
      
      if (successfulPayment) {
        res.json({ status: "paid", payment: successfulPayment });
      } else {
        res.json({ status: "pending" });
      }
    } catch (error) {
      console.error("Razorpay QR Status Error:", error);
      res.status(500).json({ error: "Failed to check QR status" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
