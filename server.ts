import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import crypto from "crypto";
import dotenv from "dotenv";

const require = createRequire(import.meta.url);
const Razorpay = require("razorpay");

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getRazorpay = (keyId: string, keySecret: string) => {
  if (!keyId || !keySecret) {
    throw new Error("Razorpay Key ID or Key Secret is missing.");
  }
  
  try {
    // With createRequire, Razorpay is usually the constructor directly
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay instance:", error);
    throw error;
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Razorpay Order Creation
  app.post("/api/payment/order", async (req, res) => {
    try {
      const { amount, currency = "INR", receipt } = req.body;
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        return res.status(500).json({ 
          error: "Razorpay keys are missing", 
          details: "Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the Secrets panel." 
        });
      }

      const rzp = getRazorpay(keyId, keySecret);
      
      const options = {
        amount: Math.round(amount * 100), // amount in the smallest currency unit
        currency,
        receipt,
      };
      const order = await rzp.orders.create(options);
      res.json(order);
    } catch (error: any) {
      console.error("Razorpay Order Error:", error);
      const errorMessage = error.error?.description || error.message || "Failed to create order";
      res.status(500).json({ error: "Failed to create order", details: errorMessage });
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
      console.log("QR Request received:", { amount, name, description, salonId });
      
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        console.error("Missing Razorpay keys in environment variables");
        return res.status(500).json({ 
          error: "Razorpay keys are missing", 
          details: "Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the Secrets panel." 
        });
      }

      console.log("Initializing Razorpay with Key ID:", keyId.substring(0, 8) + "...");
      
      let rzp;
      try {
        rzp = getRazorpay(keyId, keySecret);
      } catch (initError: any) {
        console.error("Razorpay Init Error:", initError);
        return res.status(500).json({ error: "Razorpay Initialization Failed", details: initError.message });
      }

      if (!rzp.qrCode) {
        console.error("razorpay.qrCode property is missing! SDK version:", (rzp as any).VERSION || "unknown");
        return res.status(500).json({ 
          error: "Razorpay SDK Error", 
          details: "The QR Code feature is not available in this version of the Razorpay SDK." 
        });
      }

      console.log("Calling rzp.qrCode.create with params...");
      const qrCode = await rzp.qrCode.create({
        type: "upi_qr",
        name: (name || "Salon Chair").substring(0, 40),
        usage: "single_payment",
        fixed_amount: true,
        payment_amount: Math.round(amount * 100),
        description: (description || "Salon Subscription").substring(0, 40),
      });
      
      console.log("QR Code created successfully:", qrCode.id);
      res.json(qrCode);
    } catch (error: any) {
      console.error("Razorpay QR Runtime Error:", error);
      // Razorpay errors often have a 'description' field in the response
      const errorMessage = error.error?.description || error.message || "Unknown Razorpay error";
      res.status(500).json({ 
        error: "Failed to create QR code", 
        details: errorMessage,
        code: error.code,
        statusCode: error.statusCode
      });
    }
  });

  // Check QR Code Payment Status
  app.get("/api/payment/qr/:qrId", async (req, res) => {
    try {
      const { qrId } = req.params;
      const keyId = process.env.RAZORPAY_KEY_ID || "";
      const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
      const rzp = getRazorpay(keyId, keySecret);
      
      const payments = await rzp.qrCode.fetchAllPayments(qrId);
      
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
