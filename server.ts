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
  console.log('Web-push configured successfully.');
} else {
  console.warn('Web-push keys are missing in environment variables.');
}

const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any;
try {
  firebaseConfig = require(firebaseConfigPath);
} catch (e) {
  console.error("Failed to load firebase-applet-config.json:", e);
  // Fallback to env variables if available, or empty object
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
      console.log("Firebase Admin initialized with project:", firebaseConfig.projectId);
    } else {
      console.warn("No Firebase Project ID found. Firebase Admin might fail.");
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getRazorpay = (keyId: string, keySecret: string) => {
  if (!keyId || !keySecret) {
    throw new Error("Razorpay Key ID or Key Secret is missing in environment variables.");
  }
  
  try {
    // Handle different import styles for Razorpay
    let RazorpayConstructor;
    if (typeof Razorpay === 'function') {
      RazorpayConstructor = Razorpay;
    } else if (Razorpay && typeof Razorpay.default === 'function') {
      RazorpayConstructor = Razorpay.default;
    } else {
      // Try a direct require if the above failed
      try {
        const R = require("razorpay");
        RazorpayConstructor = typeof R === 'function' ? R : R.default;
      } catch (e) {
        console.error("Nested Razorpay require failed:", e);
      }
    }

    if (typeof RazorpayConstructor !== 'function') {
      console.error("Razorpay is not a constructor. Received:", typeof Razorpay);
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Logging Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get VAPID Public Key
  app.get("/api/notifications/vapid-key", (req, res) => {
    if (process.env.VAPID_PUBLIC_KEY) {
      res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
    } else {
      res.status(404).json({ error: "VAPID public key not configured" });
    }
  });

  // Push Subscription Endpoint
  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      const { subscription, userId } = req.body;
      if (!subscription || !userId) {
        return res.status(400).json({ error: "Missing subscription or userId" });
      }

      console.log(`Saving push subscription for user ${userId}`);
      
      // Save subscription to Firestore
      await db.collection("push_subscriptions").doc(userId).set({
        subscription,
        updatedAt: Timestamp.now()
      });

      res.json({ status: "ok" });
    } catch (error) {
      console.error("Push Subscription Error:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  // Listen for new bookings to send notifications (ONLY in non-Vercel environments)
  if (!process.env.VERCEL && db) {
    try {
      db.collection("bookings").onSnapshot((snapshot: any) => {
        snapshot.docChanges().forEach(async (change: any) => {
          if (change.type === "added") {
            const booking = change.doc.data();
            const salonId = booking.salonId;
            
            console.log(`New booking detected for salon ${salonId}. Sending notification...`);

            try {
              // 1. Find the salon owner
              const salonDoc = await db.collection("salons").doc(salonId).get();
              if (!salonDoc.exists) return;
              
              const salonData = salonDoc.data();
              const ownerId = salonData.ownerId;

              // 2. Find the owner's push subscription
              const subDoc = await db.collection("push_subscriptions").doc(ownerId).get();
              if (!subDoc.exists) {
                console.log(`No push subscription found for owner ${ownerId}`);
                return;
              }

              const { subscription } = subDoc.data();

              // 3. Send the notification
              const payload = JSON.stringify({
                title: "New Booking!",
                body: `You have a new booking for ${booking.services.join(", ")}`,
                url: `/booking/${change.doc.id}`
              });

              await webpush.sendNotification(subscription, payload);
              console.log(`Push notification sent to owner ${ownerId}`);
            } catch (error) {
              console.error("Error sending push notification:", error);
            }
          }
        });
      });
      console.log("Bookings listener started (Non-Vercel environment).");
    } catch (e) {
      console.error("Failed to start bookings listener:", e);
    }
  } else {
    console.log("Skipping persistent bookings listener (Vercel environment).");
  }

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
        notes: {
          salonId: req.body.salonId,
          planId: req.body.planId
        }
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
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, salonId, planId } = req.body;
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(sign.toString())
        .digest("hex");

      if (razorpay_signature === expectedSign) {
        // Activate salon if salonId and planId are provided
        if (salonId && planId) {
          console.log(`Activating salon ${salonId} via direct verification (Plan: ${planId})`);
          const salonRef = db.collection("salons").doc(salonId);
          const salonDoc = await salonRef.get();

          if (salonDoc.exists) {
            const now = new Date();
            let durationDays = 30;
            if (planId === 'yearly') {
              durationDays = 365;
            }
            
            const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

            await salonRef.update({
              status: "active",
              subscriptionExpiry: Timestamp.fromDate(expiry),
              subscriptionPlan: planId,
              lastPaymentId: razorpay_payment_id,
              updatedAt: Timestamp.now()
            });
            console.log(`Salon ${salonId} activated successfully via verification`);
          }
        }
        res.json({ status: "ok" });
      } else {
        res.status(400).json({ error: "Invalid signature" });
      }
    } catch (error) {
      console.error("Razorpay Verification Error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Razorpay Webhook
  app.post("/api/webhook/razorpay", async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not set");
      return res.status(500).send("Webhook secret missing");
    }

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (signature !== digest) {
      console.error("Invalid Webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    console.log("Received Razorpay Webhook:", event);

    if (event === "order.paid") {
      const payload = req.body.payload.order.entity;
      const payment = req.body.payload.payment.entity;
      const salonId = payload.notes?.salonId;
      const planId = payload.notes?.planId;

      if (salonId && payment.status === "captured") {
        console.log(`Activating salon ${salonId} via webhook (Plan: ${planId})`);
        
        try {
          const salonRef = db.collection("salons").doc(salonId);
          const salonDoc = await salonRef.get();

          if (salonDoc.exists) {
            const now = new Date();
            let durationDays = 30;
            if (planId === 'yearly') {
              durationDays = 365;
            }
            
            const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

            await salonRef.update({
              status: "active",
              subscriptionExpiry: Timestamp.fromDate(expiry),
              subscriptionPlan: planId || 'monthly',
              lastPaymentId: payment.id,
              updatedAt: Timestamp.now()
            });

            console.log(`Salon ${salonId} activated successfully via webhook`);
          }
        } catch (dbError) {
          console.error("Database update error in webhook:", dbError);
        }
      }
    }

    res.json({ status: "ok" });
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
    
    // Serve static files with standard caching
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, path) => {
        // Never cache index.html or service worker
        if (path.endsWith('index.html') || path.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        }
      }
    }));

    app.get("*", (req, res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Server Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: err.message || "An unexpected error occurred on the server." 
    });
  });

  // Export app for Vercel
  return app;
}

export const appPromise = startServer();

// Start server only if not running as a serverless function (e.g., on Vercel)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  appPromise.then(app => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log("Environment check:");
      console.log("- RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "PRESENT" : "MISSING");
      console.log("- RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? "PRESENT" : "MISSING");
      console.log("- VITE_RAZORPAY_KEY_ID:", process.env.VITE_RAZORPAY_KEY_ID ? "PRESENT" : "MISSING");
    });
  });
}

export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
