import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";
import webpush from "web-push";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// VAPID Keys setup
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BDrpAznuNeO5u-efrq6EvitanPYlXCrjwqI_Ox2Xs4tOKEVc1cLQmubb2cUVzFd6Cxt1MURVdiGSkNq7Y-OK3Zk";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "VjdJ-fhcnb5dOLJfbRlPEt3zilNr_3G2E1N3PRvBMgY";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:no1salonchair@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization helpers
let _db: any = null;
let _firebaseApp: any = null;
let _app: any = null;
let _Razorpay: any = null;
let _firebaseClient: any = null;
let _adminDb: admin.firestore.Firestore | null = null;

async function getAdminDb() {
  if (_adminDb) return _adminDb;
  
  if (admin.apps.length === 0) {
    let firebaseConfig: any = {};
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (e) {}

    admin.initializeApp({
      projectId: firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
    });
  }
  
  // Use the specific database ID if provided
  let firestoreDatabaseId = "(default)";
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      firestoreDatabaseId = config.firestoreDatabaseId || "(default)";
    }
  } catch (e) {}

  _adminDb = getFirestore(admin.app(), firestoreDatabaseId === "(default)" ? undefined : firestoreDatabaseId);
  return _adminDb;
}

async function getFirebaseClient() {
  if (_firebaseClient) return _firebaseClient;
  const [app, firestore] = await Promise.all([
    import("firebase/app"),
    import("firebase/firestore")
  ]);
  _firebaseClient = { ...app, ...firestore };
  return _firebaseClient;
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
  
  const client = await getFirebaseClient();
  if (client.getApps().length > 0) {
    _firebaseApp = client.getApp();
    return _firebaseApp;
  }

  let firebaseConfig: any = {};
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
        firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "(default)"
      };
    }
  } catch (e) {
    console.error("Error loading firebase config:", e);
  }

  if (firebaseConfig.projectId) {
    try {
      _firebaseApp = client.initializeApp(firebaseConfig);
      return _firebaseApp;
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      throw e;
    }
  }
  
  throw new Error("Firebase configuration is missing.");
}

async function getDb() {
  if (_db) return _db;
  
  const app = await getFirebaseApp();
  const client = await getFirebaseClient();
  let firestoreDatabaseId = "(default)";
  
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      firestoreDatabaseId = config.firestoreDatabaseId || "(default)";
    }
  } catch (e) {}

  _db = client.getFirestore(app, firestoreDatabaseId);
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
    if (VAPID_PUBLIC_KEY) {
      res.json({ publicKey: VAPID_PUBLIC_KEY });
    } else {
      res.status(404).json({ error: "VAPID public key not configured" });
    }
  });

  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      const { subscription, userId } = req.body;
      if (!subscription || !userId) return res.status(400).json({ error: "Missing subscription or userId" });
      
      const db = await getDb();
      const client = await getFirebaseClient();
      const subRef = client.doc(db, "push_subscriptions", userId);
      
      await client.setDoc(subRef, {
        subscription,
        updatedAt: client.Timestamp.now()
      });
      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("Subscribe Error:", error);
      res.status(500).json({ error: "Failed to save subscription", details: error.message });
    }
  });

  app.post("/api/notifications/trigger-booking", async (req, res) => {
    try {
      const { bookingId } = req.body;
      if (!bookingId) return res.status(400).json({ error: "Missing bookingId" });

      const adminDb = await getAdminDb();
      const bookingDoc = await adminDb.collection("bookings").doc(bookingId).get();
      
      if (!bookingDoc.exists) return res.status(404).json({ error: "Booking not found" });
      const booking = bookingDoc.data();
      if (!booking) return res.status(404).json({ error: "Booking data empty" });

      // 1. Get salon details to find ownerId
      const salonDoc = await adminDb.collection("salons").doc(booking.salonId).get();
      if (!salonDoc.exists) return res.status(404).json({ error: "Salon not found" });
      const salon = salonDoc.data();
      if (!salon) return res.status(404).json({ error: "Salon data empty" });

      const ownerId = salon.ownerId;

      // 2. Get push subscription for owner
      const subDoc = await adminDb.collection("push_subscriptions").doc(ownerId).get();
      if (!subDoc.exists) {
        return res.json({ status: "skipped", reason: "No push subscription for owner" });
      }
      const subscription = subDoc.data()?.subscription;

      if (subscription) {
        const payload = JSON.stringify({
          title: "New Booking!",
          body: `You have a new booking request for ${salon.name}.`,
          url: `/booking/${bookingId}`
        });

        await webpush.sendNotification(subscription, payload);
        return res.json({ status: "ok" });
      }

      res.json({ status: "skipped", reason: "Subscription data missing" });
    } catch (error: any) {
      console.error("Trigger Notification Error:", error);
      res.status(500).json({ error: "Failed to send notification", details: error.message });
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
        console.log("Razorpay Library Error:", libError.message);
        if (libError.statusCode === 401 || libError.message?.includes('401')) {
          return res.status(401).json({ 
            error: "Authentication failed", 
            details: "Your Razorpay Key ID or Secret is incorrect. Please verify them in Settings > Secrets." 
          });
        }
        
        console.log("Using direct API fallback...");
        
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
          
          if (response.status === 401) {
            return res.status(401).json({ 
              error: "Authentication failed", 
              details: "Invalid Razorpay Key ID or Secret. Ensure you are using the correct Secret for your Live Key." 
            });
          }
          
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
          const adminDb = await getAdminDb();
          const salonRef = adminDb.collection("salons").doc(salonId);
          const now = new Date();
          let durationDays = planId === 'yearly' ? 365 : 30;
          const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

          await salonRef.update({
            status: "active",
            subscriptionExpiry: admin.firestore.Timestamp.fromDate(expiry),
            subscriptionPlan: planId,
            lastPaymentId: razorpay_payment_id,
            updatedAt: admin.firestore.Timestamp.now()
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

  // Start Firestore listener for new bookings
  const startBookingListener = async () => {
    try {
      const adminDb = await getAdminDb();
      console.log("Starting Firestore listener for new bookings...");
      
      adminDb.collection("bookings").onSnapshot(async (snapshot) => {
        const changes = snapshot.docChanges();
        for (const change of changes) {
          if (change.type === "added") {
            const booking = change.doc.data();
            // Only notify for new bookings (less than 1 minute old to avoid spamming on startup)
            const createdAt = booking.createdAt?.toDate();
            if (createdAt && (Date.now() - createdAt.getTime()) < 60000) {
              console.log("New booking detected via listener:", change.doc.id);
              
              try {
                // 1. Get salon details to find ownerId
                const salonRef = adminDb.collection("salons").doc(booking.salonId);
                const salonDoc = await salonRef.get();
                if (!salonDoc.exists) continue;
                const salon = salonDoc.data();
                if (!salon) continue;
                
                const ownerId = salon.ownerId;
                
                // 2. Get push subscription for owner
                const subRef = adminDb.collection("push_subscriptions").doc(ownerId);
                const subDoc = await subRef.get();
                if (!subDoc.exists) {
                  console.log("No push subscription found for owner:", ownerId);
                  continue;
                }
                const subscription = subDoc.data()?.subscription;
                
                if (subscription) {
                  console.log("Sending push notification to owner:", ownerId);
                  const payload = JSON.stringify({
                    title: "New Booking!",
                    body: `You have a new booking request for ${salon.name}.`,
                    url: `/booking/${change.doc.id}`
                  });
                  
                  await webpush.sendNotification(subscription, payload);
                  console.log("Push notification sent successfully.");
                }
              } catch (error) {
                console.error("Error sending push notification:", error);
              }
            }
          }
        }
      }, (err) => {
        console.error("Booking listener error:", err);
      });
    } catch (err) {
      console.error("Failed to start booking listener:", err);
    }
  };

  // Start listener (removed isServerless check to ensure it runs in AI Studio container)
  startBookingListener();

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
