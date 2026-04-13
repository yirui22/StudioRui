import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as ics from "ics";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

// Load Firebase config from file
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any;

try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.error("firebase-applet-config.json not found. Server may not function correctly.");
    // Fallback or exit? Let's try to continue if possible, but it will likely fail later.
    firebaseConfig = {};
  }
} catch (error) {
  console.error("Error loading firebase-applet-config.json:", error);
  firebaseConfig = {};
}

// Initialize Firebase Admin for server-side use
const adminApp = getApps().length === 0 && firebaseConfig.projectId
  ? initializeApp({
      projectId: firebaseConfig.projectId,
    })
  : (getApps().length > 0 ? getApps()[0] : null);

// Get the correct Firestore instance (handling named databases)
const finalDb = adminApp 
  ? (firebaseConfig.firestoreDatabaseId 
      ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId) 
      : getFirestore(adminApp))
  : null;

// Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const app = express();
const PORT = 3000;

async function startServer() {
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // API routes
  app.post("/api/analyze-receipt", async (req, res) => {
    const { base64Data } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return res.status(500).json({ error: "AI service not configured" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Analyze this image. It should be a bank transfer or Beem receipt for a pilates class. 
      If it looks like a legitimate receipt (showing a transfer, amount, date, or reference to pilates/studio), respond with "LEGITIMATE". 
      If it looks substantially different (e.g., it's a random photo, a blank screen, or completely unrelated content), respond with "FLAGGED: [reason]".
      Be concise.`;

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data.split(',')[1], mimeType: "image/png" } }
          ]
        }
      });

      const text = result.text || "";
      const flagged = text.toUpperCase().includes("FLAGGED");
      
      res.json({ flagged, analysis: text });
    } catch (error) {
      console.error("AI Analysis error:", error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/admin/notify-flagged", async (req, res) => {
    const { userEmail, userName, analysis, classTitle, bookingId } = req.body;
    
    if (!finalDb) {
      console.error("Database not initialized for notification");
      return res.status(500).json({ error: "Database not initialized" });
    }

    try {
      await finalDb.collection('notifications').add({
        type: 'flagged_receipt',
        title: 'Suspicious Receipt Detected',
        message: `${userName} (${userEmail}) uploaded a suspicious receipt for ${classTitle}.`,
        bookingId: bookingId || null,
        analysis,
        timestamp: Timestamp.now(),
        read: false,
        severity: 'high'
      });
      
      console.log(`[ADMIN NOTIFICATION] Flagged Receipt saved to Firestore for ${userName}`);
      res.json({ success: true, message: "Admin notified via Firestore" });
    } catch (error) {
      console.error("Error saving notification:", error);
      res.status(500).json({ error: "Failed to save notification" });
    }
  });

  app.post("/api/admin/notify-booking", async (req, res) => {
    const { userEmail, userName, classTitle, bookingId, price, paymentMethod, startTime } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL || "rui.yi2902@gmail.com";

    if (!finalDb) {
      console.error("Database not initialized for booking notification");
      return res.status(500).json({ error: "Database not initialized" });
    }

    try {
      // 1. Save to Firestore for record keeping
      await finalDb.collection('notifications').add({
        type: 'new_booking',
        title: 'New Booking Received',
        message: `${userName} (${userEmail}) booked ${classTitle} for ${startTime}.`,
        bookingId: bookingId || null,
        timestamp: Timestamp.now(),
        read: false,
        severity: 'info'
      });

      // 2. Send actual email if SMTP is configured
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const mailOptions = {
          from: `"Studio Rui" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `New Booking: ${classTitle} - ${userName}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
              <h2 style="color: #4A4A6A;">New Booking Received</h2>
              <p><strong>Customer:</strong> ${userName} (${userEmail})</p>
              <p><strong>Class:</strong> ${classTitle}</p>
              <p><strong>Time:</strong> ${startTime}</p>
              <p><strong>Amount:</strong> $${price}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
              <p><strong>Booking ID:</strong> ${bookingId}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666;">This is an automated notification from Studio Rui.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SENT] Booking notification sent to ${adminEmail}`);
      } else {
        console.log(`[EMAIL SIMULATION] SMTP not configured. Notification for ${userName} logged to Firestore.`);
      }

      res.json({ success: true, message: "Booking notification processed" });
    } catch (error) {
      console.error("Error processing booking notification:", error);
      res.status(500).json({ error: "Failed to process notification" });
    }
  });

  app.post("/api/bookings/cancel-confirmation", async (req, res) => {
    const { userEmail, bookingId, classTitle, refundEligible } = req.body;
    
    if (!finalDb) {
      console.error("Database not initialized for cancellation confirmation");
      return res.status(500).json({ error: "Database not initialized" });
    }

    try {
      // Simulate sending an email by logging it and adding to a notifications collection
      console.log(`[EMAIL SIMULATION] To: ${userEmail}, Subject: Cancellation Confirmation - ${classTitle}`);
      
      await finalDb.collection('notifications').add({
        type: 'email_sent',
        to: userEmail,
        subject: `Cancellation Confirmation - ${classTitle}`,
        bookingId,
        message: `Your booking for ${classTitle} has been cancelled. ${refundEligible ? 'A refund has been initiated.' : 'A reschedule credit has been added to your account.'}`,
        timestamp: Timestamp.now()
      });

      res.json({ success: true, message: "Cancellation email simulated" });
    } catch (error) {
      console.error("Error simulating email:", error);
      res.status(500).json({ error: "Failed to simulate email" });
    }
  });

  app.post("/api/bookings/refund", async (req, res) => {
    const { bookingId, amount, paymentMethod } = req.body;
    
    if (!finalDb) {
      console.error("Database not initialized for refund");
      return res.status(500).json({ error: "Database not initialized" });
    }

    try {
      // Simulate triggering a refund via payment provider
      console.log(`[REFUND SIMULATION] Booking: ${bookingId}, Amount: ${amount}, Method: ${paymentMethod}`);
      
      await finalDb.collection('refunds').add({
        bookingId,
        amount,
        paymentMethod,
        status: 'initiated',
        timestamp: Timestamp.now()
      });

      res.json({ success: true, message: "Refund initiated" });
    } catch (error) {
      console.error("Error initiating refund:", error);
      res.status(500).json({ error: "Failed to initiate refund" });
    }
  });

  app.get("/api/calendar/sync", async (req, res) => {
    if (!finalDb) {
      console.error("Database not initialized for calendar sync");
      return res.status(500).json({ error: "Database not initialized" });
    }

    try {
      const snapshot = await finalDb.collection('classes').orderBy('startTime', 'asc').get();
      const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const events: ics.EventAttributes[] = classes.map((c: any) => {
        const date = c.startTime.toDate();
        return {
          start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()],
          duration: { minutes: c.duration || 60 },
          title: c.title,
          description: c.description,
          location: c.location,
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
        };
      });

      const { error, value } = ics.createEvents(events);

      if (error) {
        return res.status(500).json({ error: "Failed to generate calendar" });
      }

      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename=pilates-calendar.ics');
      res.send(value);
    } catch (err) {
      console.error("Error generating calendar sync:", err);
      res.status(500).json({ error: "Internal server error" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
  process.exit(1);
});
