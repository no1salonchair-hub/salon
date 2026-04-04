import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";
import Razorpay from "razorpay";
import webpush from "web-push";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

dotenv.config();

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:no1salonchair@gmail.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (e) {
    console.error("Web-push configuration failed:", e);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config robustly
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "(default)"
    };
  }
} catch (e) {
  console.error("Error loading firebase config:", e);
}

// Initialize Firebase Admin
let firebaseApp: any;
if (getApps().length === 0) {
  try {
    if (firebaseConfig.projectId) {
      firebaseApp = initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  } catch (e) {
    console.error("Firebase Admin initialization failed:", e);
  }
} else {
  firebaseApp = getApp();
}

const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "(default)");

const getRazorpay = (keyId: string, keySecret: string) => {
  if (!keyId || !keySecret) {
    throw new Error("Razorpay Key ID or Key Secret is missing in environment variables.");
  }
  
  try {
    // Razorpay 2.x supports ESM default import or CJS require
    const RazorpayConstructor = (Razorpay as any).default || Razorpay;
    
    if (typeof RazorpayConstructor !== 'function') {
      throw new Error("Razorpay SDK failed to load correctly. Please check your dependencies.");
    }
    
    return new RazorpayConstructor({
      key_id: keyId,
      key_secret: keySecret,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay instance:", error);
    throw error;
  }
};

export async function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.VERCEL ? "vercel" : "local",
      hasRazorpayKeys: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    });
  });

  app.get("/api/notifications/vapid-key", (req, res) => {
    if (process.env.VAPID_PUBLIC_KEY) {
      res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
    } else {
      res.status(404).json({ error: "VAPID public key not configured" });
    }
  });

  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      const { subscription, userId } = req.body;
      if (!subscription || !userId) return res.status(400).json({ error: "Missing subscription or userId" });
      await db.collection("push_subscriptions").doc(userId).set({
        subscription,
        updatedAt: Timestamp.now()
      });
      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save subscription", details: error.message });
    }
  });

  app.post("/api/payment/order", async (req, res) => {
    try {
      const { amount, currency = "INR", receipt } = req.body;
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        return res.status(500).json({ 
          error: "Razorpay keys are missing", 
          details: "Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in the Secrets panel." 
        });
      }

      const rzp = getRazorpay(keyId, keySecret);
      const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt,
        notes: { salonId: req.body.salonId, planId: req.body.planId }
      };
      const order = await rzp.orders.create(options);
      res.json(order);
    } catch (error: any) {
      console.error("Payment Order Error:", error);
      res.status(500).json({ error: "Failed to create order", details: error.message });
    }
  });

  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, salonId, planId } = req.body;
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(sign.toString())
        .digest("hex");

      if (razorpay_signature === expectedSign) {
        if (salonId && planId) {
          const salonRef = db.collection("salons").doc(salonId);
          const now = new Date();
          let durationDays = planId === 'yearly' ? 365 : 30;
          const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

          await salonRef.update({
            status: "active",
            subscriptionExpiry: Timestamp.fromDate(expiry),
            subscriptionPlan: planId,
            lastPaymentId: razorpay_payment_id,
            updatedAt: Timestamp.now()
          });
        }
        res.json({ status: "ok" });
      } else {
        res.status(400).json({ error: "Invalid signature" });
      }
    } catch (error: any) {
      console.error("Payment Verification Error:", error);
      res.status(500).json({ error: "Verification failed", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  // Global Error Handler to ensure JSON response
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global API Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: err.message || "An unexpected error occurred." 
    });
  });

  return app;
}

// Vercel Serverless Function Export
export default async (req: any, res: any) => {
  try {
    const app = await createApp();
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel Function Crash:", error);
    res.status(500).json({ error: "Function Crash", details: error.message });
  }
};
