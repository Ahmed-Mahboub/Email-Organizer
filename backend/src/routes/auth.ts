import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { logger } from "../utils/logger";

const router = Router();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate the authorization URL
router.get("/google", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force to get refresh token
  });

  res.json({ authUrl });
});

// Handle the OAuth callback
router.get("/google/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);

    // Log the refresh token (in production, you should store this securely)
    logger.info("Refresh token obtained:", tokens.refresh_token);

    res.json({
      message: "Authentication successful",
      refresh_token: tokens.refresh_token,
    });
  } catch (error) {
    logger.error("Error getting tokens:", error);
    res.status(500).json({ error: "Failed to get tokens" });
  }
});

export const authRoutes = router;
