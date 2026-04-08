import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as ics from "ics";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

// Load Firebase config from file
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase Admin for server-side use
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

// Get the correct Firestore instance (handling named databases)
const finalDb = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(firebaseConfig.firestoreDatabaseId) 
  : getFirestore();

const app = express();
const PORT = 3000;

async function startServer() {
  app.use(express.json({ limit: '10mb' }));

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

  app.post("/api/bookings/cancel-confirmation", async (req, res) => {
    const { userEmail, bookingId, classTitle, refundEligible } = req.body;
    
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

startServer();
