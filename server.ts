import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import crypto from "crypto";
import dotenv from "dotenv";

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

const firebaseConfig = require("./firebase-applet-config.json");

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const db = getFirestore(firebaseConfig.firestoreDatabaseId);

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

  // Listen for new bookings to send notifications
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

      console.log("Razorpay Keys present:", { 
        keyId: keyId ? "YES (starts with " + keyId.substring(0, 5) + ")" : "NO", 
        keySecret: keySecret ? "YES" : "NO" 
      });

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
        console.log("Razorpay SDK initialized. Available properties:", Object.keys(rzp));
      } catch (initError: any) {
        console.error("Razorpay Init Error:", initError);
        return res.status(500).json({ error: "Razorpay Initialization Failed", details: initError.message });
      }

      if (!rzp.qrCode) {
        console.error("razorpay.qrCode property is missing! SDK VERSION:", (rzp as any).VERSION || "unknown");
        // Fallback to direct API call if SDK is broken
        console.log("Attempting direct API fallback...");
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const apiResponse = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "upi_qr",
            name: (name || "Salon Chair").substring(0, 40),
            usage: "single_payment",
            fixed_amount: true,
            payment_amount: Math.round(amount * 100),
            description: (description || "Salon Subscription").substring(0, 40),
            notes: { salonId }
          })
        });

      const apiData: any = await apiResponse.json();
      if (!apiResponse.ok) {
        console.error("Razorpay Direct API Error Response:", JSON.stringify(apiData, null, 2));
        return res.status(apiResponse.status).json({ 
          error: "Razorpay API Error", 
          details: apiData.error?.description || apiData.error?.reason || "Failed to create QR code via direct API",
          raw: apiData
        });
      }
        console.log("QR Code created via direct API:", apiData.id);
        return res.json(apiData);
      }

      console.log("Calling rzp.qrCode.create with params...");
      const qrCode = await rzp.qrCode.create({
        type: "upi_qr",
        name: (name || "Salon Chair").substring(0, 40),
        usage: "single_payment",
        fixed_amount: true,
        payment_amount: Math.round(amount * 100),
        description: (description || "Salon Subscription").substring(0, 40),
        notes: { salonId }
      });
      
      console.log("QR Code created successfully:", qrCode.id);
      res.json(qrCode);
    } catch (error: any) {
      console.error("Razorpay QR Runtime Error:", error);
      
      // Extract as much detail as possible
      const details = error.error?.description || error.description || error.message || "Unknown Razorpay error";
      const reason = error.error?.reason || error.reason;
      
      res.status(500).json({ 
        error: "Failed to create QR code", 
        details: details,
        reason: reason,
        code: error.code,
        statusCode: error.statusCode,
        step: "runtime_catch"
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

    if (event === "qr_code.paid") {
      const payload = req.body.payload.qr_code.entity;
      const payment = req.body.payload.payment.entity;
      const salonId = payload.notes?.salonId;

      if (salonId && payment.status === "captured") {
        console.log(`Activating salon ${salonId} due to payment ${payment.id}`);
        
        try {
          const salonRef = db.collection("salons").doc(salonId);
          const salonDoc = await salonRef.get();

          if (salonDoc.exists) {
            const now = new Date();
            const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

            await salonRef.update({
              status: "active",
              subscriptionExpiry: Timestamp.fromDate(expiry),
              lastPaymentId: payment.id,
              updatedAt: Timestamp.now()
            });

            console.log(`Salon ${salonId} activated successfully`);
          } else {
            console.error(`Salon ${salonId} not found in Firestore`);
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
