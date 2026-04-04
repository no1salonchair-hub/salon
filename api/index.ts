import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";

const require = createRequire(import.meta.url);
const Razorpay = require("razorpay");
const webpush = require("web-push");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

dotenv.config();

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:no1salonchair@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any;
try {
  firebaseConfig = require(firebaseConfigPath);
} catch (e) {
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "(default)"
  };
}

// Initialize Firebase Admin
if (getApps().length === 0) {
  try {
    if (firebaseConfig.projectId) {
      initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  } catch (e) {
    console.error("Firebase Admin initialization failed:", e);
  }
}

// Get Firestore instance safely
let db: any;
try {
  db = getFirestore(firebaseConfig.firestoreDatabaseId || "(default)");
} catch (e) {
  console.error("Failed to get Firestore instance:", e);
}

const getRazorpay = (keyId: string, keySecret: string) => {
  if (!keyId || !keySecret) {
    throw new Error("Razorpay Key ID or Key Secret is missing in environment variables.");
  }
  
  try {
    let RazorpayConstructor;
    if (typeof Razorpay === 'function') {
      RazorpayConstructor = Razorpay;
    } else if (Razorpay && typeof Razorpay.default === 'function') {
      RazorpayConstructor = Razorpay.default;
    } else {
      try {
        const R = require("razorpay");
        RazorpayConstructor = typeof R === 'function' ? R : R.default;
      } catch (e) {}
    }

    if (typeof RazorpayConstructor !== 'function') {
      throw new Error("Razorpay SDK failed to load correctly in this environment.");
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

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.VERCEL ? "vercel" : "local" });
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
    } catch (error) {
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  app.post("/api/payment/order", async (req, res) => {
    try {
      const { amount, currency = "INR", receipt } = req.body;
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        return res.status(500).json({ error: "Razorpay keys are missing" });
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
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
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

  return app;
}

// Vercel Serverless Function Export
export default async (req: any, res: any) => {
  const app = await createApp();
  return app(req, res);
};
