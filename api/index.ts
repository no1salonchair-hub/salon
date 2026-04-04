import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization helpers
let _db: any = null;
let _firebaseApp: any = null;
let _app: any = null;
let _Razorpay: any = null;
let _firebaseAdmin: any = null;

async function getFirebaseAdmin() {
  if (_firebaseAdmin) return _firebaseAdmin;
  const [app, firestore] = await Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/firestore")
  ]);
  _firebaseAdmin = { ...app, ...firestore };
  return _firebaseAdmin;
}

async function getRazorpayLib() {
  if (_Razorpay) return _Razorpay;
  try {
    const rzpModule = await import("razorpay");
    _Razorpay = rzpModule.default || rzpModule;
    return _Razorpay;
  } catch (e) {
    console.error("Failed to load Razorpay library:", e);
    return null;
  }
}

async function getFirebaseApp() {
  if (_firebaseApp) return _firebaseApp;
  
  const admin = await getFirebaseAdmin();
  if (admin.getApps().length > 0) {
    _firebaseApp = admin.getApp();
    return _firebaseApp;
  }

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

  if (firebaseConfig.projectId) {
    try {
      _firebaseApp = admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      return _firebaseApp;
    } catch (e) {
      console.error("Firebase Admin initialization failed:", e);
      throw e;
    }
  }
  
  throw new Error("Firebase Project ID is missing. Please check your configuration.");
}

async function getDb() {
  if (_db) return _db;
  
  const app = await getFirebaseApp();
  const admin = await getFirebaseAdmin();
  let firestoreDatabaseId = "(default)";
  
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      firestoreDatabaseId = config.firestoreDatabaseId || "(default)";
    }
  } catch (e) {}

  _db = admin.getFirestore(app, firestoreDatabaseId);
  return _db;
}

const getRazorpayInstance = async (keyId: string, keySecret: string) => {
  if (!keyId || !keySecret) throw new Error("Razorpay Key ID or Key Secret is missing.");
  try {
    const RzpConstructor = await getRazorpayLib();
    if (!RzpConstructor || typeof RzpConstructor !== 'function') {
      console.warn("Razorpay library not available or invalid, will use direct API fallback.");
      return null;
    }
    return new RzpConstructor({ key_id: keyId, key_secret: keySecret });
  } catch (error: any) {
    console.error("Razorpay Init Error:", error);
    return null;
  }
};

export async function createApp() {
  if (_app) return _app;

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    res.json({ 
      status: "ok", 
      env: process.env.VERCEL ? "vercel" : "local",
      hasRazorpayKeys: !!(keyId && process.env.RAZORPAY_KEY_SECRET),
      keyIdPrefix: keyId ? keyId.substring(0, 8) + "..." : null,
      nodeEnv: process.env.NODE_ENV,
      isServerless: !!(process.env.VERCEL || process.env.K_SERVICE || process.env.GAE_SERVICE)
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
      
      const db = await getDb();
      const admin = await getFirebaseAdmin();
      await db.collection("push_subscriptions").doc(userId).set({
        subscription,
        updatedAt: admin.Timestamp.now()
      });
      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("Subscribe Error:", error);
      res.status(500).json({ error: "Failed to save subscription", details: error.message });
    }
  });

  app.post("/api/payment/order", async (req, res) => {
    console.log("Order Request Received:", JSON.stringify(req.body));
    try {
      const { amount, currency = "INR", receipt, salonId, planId } = req.body;
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        return res.status(500).json({ error: "Razorpay keys are missing" });
      }

      const options = {
        amount: Math.round(Number(amount) * 100),
        currency,
        receipt: String(receipt || `rcpt_${Date.now()}`).substring(0, 40),
        notes: { salonId: String(salonId || ""), planId: String(planId || "") }
      };
      
      console.log("Attempting to create order...");
      try {
        const rzp = await getRazorpayInstance(keyId, keySecret);
        if (rzp) {
          console.log("Creating order via library...");
          const order = await rzp.orders.create(options);
          console.log("Order created via library:", order.id);
          return res.json(order);
        } else {
          throw new Error("Library unavailable");
        }
      } catch (libError: any) {
        console.log("Using direct API fallback:", libError.message);
        
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify(options)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Razorpay API Error Response:", JSON.stringify(errorData));
          throw new Error(errorData.error?.description || `Razorpay API error: ${response.status}`);
        }

        const order = await response.json();
        console.log("Order created via direct API:", order.id);
        return res.json(order);
      }
    } catch (error: any) {
      console.error("Final Payment Order Error:", error);
      res.status(500).json({ 
        error: "Failed to create order", 
        details: error.message || "Unknown error"
      });
    }
  });

  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, salonId, planId } = req.body;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keySecret) {
        return res.status(500).json({ error: "Razorpay secret missing for verification" });
      }

      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", keySecret)
        .update(sign.toString())
        .digest("hex");

      if (razorpay_signature === expectedSign) {
        if (salonId && planId) {
          const db = await getDb();
          const admin = await getFirebaseAdmin();
          const salonRef = db.collection("salons").doc(salonId);
          const now = new Date();
          let durationDays = planId === 'yearly' ? 365 : 30;
          const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

          await salonRef.update({
            status: "active",
            subscriptionExpiry: admin.Timestamp.fromDate(expiry),
            subscriptionPlan: planId,
            lastPaymentId: razorpay_payment_id,
            updatedAt: admin.Timestamp.now()
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

  // Vite middleware for development (disabled in serverless)
  const isServerless = !!(process.env.VERCEL || process.env.K_SERVICE || process.env.GAE_SERVICE);
  
  if (process.env.NODE_ENV !== "production" && !isServerless) {
    // Vite is handled in server.ts for local dev
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
    }
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global API Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Internal Server Error", 
        details: err.message || String(err)
      });
    }
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
    if (!res.headersSent) {
      res.status(500).json({ error: "Function Crash", details: error.message });
    }
  }
};
