import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import {
  ACHIEVEMENTS, LEVELS, BEZIRKE,
  type UserScore,
} from "@shared/schema";

// Simple password hashing
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Session-based auth middleware
function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ message: "Nicht eingeloggt" });
  }
  next();
}

// Setup multer for photo uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext || mime);
  },
});

// Brauhaus seed data — real Kölner Brauhäuser
const BRAUHAUS_SEED = [
  // Altstadt/Nord
  { veedelName: "Altstadt/Nord", name: "Früh am Dom", address: "Am Hof 12-18", description: "Traditionsbrauhaus direkt am Dom, seit 1904. Berühmt für sein eigenes Kölsch." },
  { veedelName: "Altstadt/Nord", name: "Gaffel am Dom", address: "Bahnhofsvorplatz 1", description: "Modernes Brauhaus am Hauptbahnhof mit klassischer Kölner Küche." },
  { veedelName: "Altstadt/Nord", name: "Peters Brauhaus", address: "Mühlengasse 1", description: "Historisches Brauhaus in der Altstadt, bekannt für Himmel un Ääd." },
  { veedelName: "Altstadt/Nord", name: "Brauhaus Sion", address: "Unter Taschenmacher 5-7", description: "Eines der ältesten Brauhäuser Kölns, seit 1318. Gemütliche Atmosphäre." },
  // Altstadt/Süd
  { veedelName: "Altstadt/Süd", name: "Malzmühle", address: "Heumarkt 6", description: "Traditionsbrauhaus am Heumarkt. Braut sein eigenes Mühlen Kölsch." },
  { veedelName: "Altstadt/Süd", name: "Lommerzheim", address: "Siegesstr. 18", description: "Kultkneipe, legendär für riesige Koteletts. Wird von Locals geliebt." },
  // Neustadt/Nord
  { veedelName: "Neustadt/Nord", name: "Schreckenskammer", address: "Ursulagartenstr. 11-15", description: "Brauhaus-Klassiker nahe dem Dom. Traditionsreiches Lokal mit Kölsch vom Fass." },
  // Neustadt/Süd
  { veedelName: "Neustadt/Süd", name: "Johann Schäfer", address: "Alteburger Str. 11", description: "Kleine Brauerei im Südstadt-Veedel, braut eigene Craft-Sorten." },
  { veedelName: "Neustadt/Süd", name: "Brauhaus Reissdorf am Chlodwigplatz", address: "Chlodwigplatz 1", description: "Gemütliches Reissdorf-Brauhaus am Chlodwigplatz." },
  // Deutz
  { veedelName: "Deutz", name: "Gaffel am Deutzer Freiheit", address: "Deutzer Freiheit 64", description: "Gaffel-Kneipe auf der Schäl Sick mit Blick Richtung Dom." },
  { veedelName: "Deutz", name: "Hyatt Regency - Glashaus", address: "Kennedy-Ufer 2A", description: "Stilvolles Brauhaus-Restaurant mit Rhein- und Dom-Panorama." },
  // Ehrenfeld
  { veedelName: "Ehrenfeld", name: "Helios Brauhaus", address: "Heliosstr. 43", description: "Kreatives Brauhaus im Szeneviertel Ehrenfeld, eigene Biersorten." },
  { veedelName: "Ehrenfeld", name: "Braustelle", address: "Christianstr. 2", description: "Craft-Beer-Brauerei mit innovativen Sorten. Kölner Braukunst neu interpretiert." },
  // Nippes
  { veedelName: "Nippes", name: "Em Golde Kappes", address: "Neusser Str. 295", description: "Uriges Brauhaus in Nippes, bekannt für deftiges Essen und frisches Kölsch." },
  // Sülz
  { veedelName: "Sülz", name: "Haus Unkelbach", address: "Luxemburger Str. 260", description: "Traditionsbrauhaus im Studentenviertel Sülz, seit 1903." },
  // Lindenthal
  { veedelName: "Lindenthal", name: "Dörpfeld", address: "Dürener Str. 207", description: "Gemütliches Lokal in Lindenthal mit gutem Kölsch und rheinischer Küche." },
  // Mülheim
  { veedelName: "Mülheim", name: "Brauhaus zur Schreckenskammer Mülheim", address: "Mülheimer Freiheit 80", description: "Traditionelle Brauhaus-Küche auf der Schäl Sick." },
  // Rodenkirchen
  { veedelName: "Rodenkirchen", name: "Gasthaus Hensen", address: "Maternusstr. 2", description: "Familiäres Brauhaus im Süden Kölns, direkt am Rhein." },
  // Kalk
  { veedelName: "Kalk", name: "Brauhaus Kalk Post", address: "Kalker Hauptstr. 166", description: "Moderne Brauhaus-Küche im aufstrebenden Veedel Kalk." },
  // Poll
  { veedelName: "Poll", name: "Zum Treppchen", address: "Auf dem Sandberg 1", description: "Traditionswirtschaft in Poll mit Blick auf den Rhein." },
  // Bayenthal
  { veedelName: "Bayenthal", name: "Brauhaus am Rheinauhafen", address: "Bayenstr. 28", description: "Modernes Brauhaus im Rheinauhafen mit Kranhäuser-Blick." },
  // Riehl
  { veedelName: "Riehl", name: "Biergarten am Zoo", address: "Riehler Str. 180", description: "Beliebter Biergarten direkt am Kölner Zoo." },
  // Klettenberg
  { veedelName: "Klettenberg", name: "Haus Scholzen", address: "Luxemburger Str. 356", description: "Brauhaus mit kölscher Gemütlichkeit in Klettenberg." },
  // Braunsfeld
  { veedelName: "Braunsfeld", name: "Bei d'r Tant", address: "Aachener Str. 517", description: "Kölsche Kneipe mit hausgemachten Spezialitäten." },
];

// Compute gamification scores for all users (now async)
async function computeScores(): Promise<UserScore[]> {
  const allUsers = await storage.getAllUsers();
  const teamVisitsList = await storage.getTeamVisits();
  const teamVeedel = new Set(teamVisitsList.map((v) => v.veedelName));
  const teamCount = teamVeedel.size;

  return Promise.all(allUsers.map(async (user) => {
    const soloVisitsList = await storage.getSoloVisits(user.id);
    const soloVeedel = new Set(soloVisitsList.map((v) => v.veedelName));
    const soloCount = soloVeedel.size;

    // Points: 10 per solo visit, 20 per team visit
    const points = soloCount * 10 + teamCount * 20;

    // Check achievements
    const earned: typeof ACHIEVEMENTS = [];
    for (const ach of ACHIEVEMENTS) {
      if (ach.type === "solo" && soloCount >= ach.requirement) {
        earned.push(ach);
      } else if (ach.type === "team" && teamCount >= ach.requirement) {
        earned.push(ach);
      } else if (ach.type === "bezirk") {
        const bezirkVeedel = BEZIRKE[ach.id] || [];
        const allVisited = bezirkVeedel.every(
          (v) => soloVeedel.has(v) || teamVeedel.has(v)
        );
        if (allVisited && bezirkVeedel.length > 0) {
          earned.push(ach);
        }
      }
    }

    // Achievement bonus: 50 per achievement
    const totalPoints = points + earned.length * 50;

    // Level
    let level = 0;
    let levelTitle = LEVELS[0].title;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalPoints >= LEVELS[i].min) {
        level = i;
        levelTitle = LEVELS[i].title;
        break;
      }
    }

    return {
      userId: user.id,
      displayName: user.displayName,
      points: totalPoints,
      soloCount,
      teamCount,
      achievements: earned,
      level,
      levelTitle,
    };
  }));
}

export async function registerRoutes(server: Server, app: Express) {
  // === AUTH ===

  // Seed users on first run
  const existingUsers = await storage.getAllUsers();
  if (existingUsers.length === 0) {
    await storage.createUser({ username: "andreas", password: hashPassword("koeln2026"), displayName: "Andreas" });
    await storage.createUser({ username: "christian", password: hashPassword("koeln2026"), displayName: "Christian" });
    await storage.createUser({ username: "sharjeel", password: hashPassword("koeln2026"), displayName: "Sharjeel" });
  }

  // Seed brauhaus spots on first run
  const existingBrauhaus = await storage.getAllBrauhaus();
  if (existingBrauhaus.length === 0) {
    for (const spot of BRAUHAUS_SEED) {
      await storage.createBrauhaus({ ...spot, rating: null, ratedBy: null, addedBy: null });
    }
  }

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username?.toLowerCase());
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Falscher Benutzername oder Passwort" });
    }
    (req.session as any).userId = user.id;
    res.json({ id: user.id, username: user.username, displayName: user.displayName });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Nicht eingeloggt" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "Benutzer nicht gefunden" });
    res.json({ id: user.id, username: user.username, displayName: user.displayName });
  });

  app.get("/api/users", requireAuth, async (_req: Request, res: Response) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(u => ({ id: u.id, username: u.username, displayName: u.displayName })));
  });

  // === SOLO VISITS ===

  app.get("/api/solo-visits", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    res.json(await storage.getSoloVisits(userId));
  });

  app.get("/api/solo-visits/:veedel", requireAuth, async (req: Request, res: Response) => {
    const visits = await storage.getSoloVisitsByVeedel(req.params.veedel);
    res.json(visits);
  });

  app.post("/api/solo-visits", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const { veedelName, visitDate, notes } = req.body;
    const visit = await storage.createSoloVisit({ userId, veedelName, visitDate, notes });
    res.json(visit);
  });

  app.delete("/api/solo-visits/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    await storage.deleteSoloVisit(parseInt(req.params.id), userId);
    res.json({ ok: true });
  });

  // === TEAM VISITS ===

  app.get("/api/team-visits", requireAuth, async (_req: Request, res: Response) => {
    res.json(await storage.getTeamVisits());
  });

  app.post("/api/team-visits", requireAuth, async (req: Request, res: Response) => {
    const createdBy = (req.session as any).userId;
    const { veedelName, visitDate, notes } = req.body;
    const visit = await storage.createTeamVisit({ veedelName, visitDate, notes, createdBy });
    res.json(visit);
  });

  app.delete("/api/team-visits/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.deleteTeamVisit(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // === PHOTOS ===

  app.get("/api/photos/:veedel", requireAuth, async (req: Request, res: Response) => {
    res.json(await storage.getPhotosByVeedel(req.params.veedel));
  });

  app.post("/api/photos", requireAuth, upload.single("photo"), async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "Kein Foto hochgeladen" });
    const uploadedBy = (req.session as any).userId;
    const { veedelName, visitType, visitId } = req.body;
    const photo = await storage.createPhoto({
      filename: req.file.filename,
      originalName: req.file.originalname,
      veedelName,
      uploadedBy,
      visitType,
      visitId: parseInt(visitId),
    });
    res.json(photo);
  });

  // Serve uploaded photos
  app.get("/api/uploads/:filename", (req: Request, res: Response) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "Datei nicht gefunden" });
    }
  });

  app.delete("/api/photos/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.deletePhoto(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // === SUGGESTIONS ===

  app.get("/api/suggestions", requireAuth, async (_req: Request, res: Response) => {
    res.json(await storage.getAllSuggestions());
  });

  app.post("/api/suggestions", requireAuth, async (req: Request, res: Response) => {
    const suggestedBy = (req.session as any).userId;
    const { veedelName, reason, suggestedDate } = req.body;
    const suggestion = await storage.createSuggestion({
      veedelName,
      suggestedBy,
      reason,
      suggestedDate,
      status: "open",
    });
    res.json(suggestion);
  });

  app.patch("/api/suggestions/:id", requireAuth, async (req: Request, res: Response) => {
    const { status } = req.body;
    const updated = await storage.updateSuggestionStatus(parseInt(req.params.id), status);
    res.json(updated);
  });

  app.delete("/api/suggestions/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.deleteSuggestion(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // === BRAUHAUS ===

  app.get("/api/brauhaus/:veedel", requireAuth, async (req: Request, res: Response) => {
    const spots = await storage.getBrauhausByVeedel(decodeURIComponent(req.params.veedel));
    res.json(spots);
  });

  app.get("/api/brauhaus", requireAuth, async (_req: Request, res: Response) => {
    res.json(await storage.getAllBrauhaus());
  });

  app.post("/api/brauhaus", requireAuth, async (req: Request, res: Response) => {
    const addedBy = (req.session as any).userId;
    const { veedelName, name, address, description } = req.body;
    const spot = await storage.createBrauhaus({ veedelName, name, address, description, rating: null, ratedBy: null, addedBy });
    res.json(spot);
  });

  app.patch("/api/brauhaus/:id/rate", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Bewertung muss zwischen 1 und 5 sein" });
    }
    const updated = await storage.rateBrauhaus(parseInt(req.params.id), rating, userId);
    res.json(updated);
  });

  // === STATS ===

  app.get("/api/stats", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const allUsers = await storage.getAllUsers();
    const teamVisitsList = await storage.getTeamVisits();
    const mySoloVisits = await storage.getSoloVisits(userId);

    const teamVeedel = new Set(teamVisitsList.map(v => v.veedelName));
    const soloVeedel = new Set(mySoloVisits.map(v => v.veedelName));

    const allSoloVisits: Record<number, string[]> = {};
    for (const user of allUsers) {
      const visits = await storage.getSoloVisits(user.id);
      allSoloVisits[user.id] = [...new Set(visits.map(v => v.veedelName))];
    }

    res.json({
      totalVeedel: 86,
      teamVisited: teamVeedel.size,
      soloVisited: soloVeedel.size,
      teamVeedel: Array.from(teamVeedel),
      soloVeedel: Array.from(soloVeedel),
      allSoloVisits,
    });
  });

  // === GEOJSON ===

  app.get("/api/geojson", (_req: Request, res: Response) => {
    const geojsonPath = path.join(process.cwd(), "dist", "public", "cologne.geojson");
    const geojsonPathDev = path.join(process.cwd(), "client", "public", "cologne.geojson");
    const filePath = fs.existsSync(geojsonPath) ? geojsonPath : geojsonPathDev;
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/json");
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "GeoJSON nicht gefunden" });
    }
  });

  // === GAMIFICATION ===

  app.get("/api/scores", requireAuth, async (_req: Request, res: Response) => {
    const scores = await computeScores();
    scores.sort((a, b) => b.points - a.points);
    res.json(scores);
  });
}
