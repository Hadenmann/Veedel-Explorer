import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, isNull } from "drizzle-orm";
import path from "path";
import fs from "fs";
import {
  users, soloVisits, teamVisits, photos, suggestions, brauhausSpots,
  type User, type InsertUser,
  type SoloVisit, type InsertSoloVisit,
  type TeamVisit, type InsertTeamVisit,
  type Photo, type InsertPhoto,
  type Suggestion, type InsertSuggestion,
  type BrauhausSpot, type InsertBrauhausSpot,
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Solo visits
  getSoloVisits(userId: number): Promise<SoloVisit[]>;
  getSoloVisitsByVeedel(veedelName: string): Promise<SoloVisit[]>;
  createSoloVisit(visit: InsertSoloVisit): Promise<SoloVisit>;
  deleteSoloVisit(id: number, userId: number): Promise<void>;

  // Team visits
  getTeamVisits(): Promise<TeamVisit[]>;
  getTeamVisitByVeedel(veedelName: string): Promise<TeamVisit | undefined>;
  createTeamVisit(visit: InsertTeamVisit): Promise<TeamVisit>;
  deleteTeamVisit(id: number): Promise<void>;

  // Photos
  getPhotosByVisit(visitType: string, visitId: number): Promise<Photo[]>;
  getPhotosByVeedel(veedelName: string): Promise<Photo[]>;
  createPhoto(photo: InsertPhoto & { data?: Buffer; mimeType?: string }): Promise<Photo>;
  getPhotoData(filename: string): Promise<{ data: Buffer; mimeType: string } | undefined>;
  deletePhoto(id: number): Promise<void>;

  // Suggestions
  getAllSuggestions(): Promise<Suggestion[]>;
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  updateSuggestionStatus(id: number, status: string): Promise<Suggestion | undefined>;
  deleteSuggestion(id: number): Promise<void>;

  // Brauhaus spots
  getBrauhausByVeedel(veedelName: string): Promise<BrauhausSpot[]>;
  getAllBrauhaus(): Promise<BrauhausSpot[]>;
  createBrauhaus(spot: InsertBrauhausSpot): Promise<BrauhausSpot>;
  rateBrauhaus(id: number, rating: number, userId: number): Promise<BrauhausSpot | undefined>;
  deleteBrauhaus(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async initialize() {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS solo_visits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        veedel_name TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS team_visits (
        id SERIAL PRIMARY KEY,
        veedel_name TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        veedel_name TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        visit_type TEXT NOT NULL,
        visit_id INTEGER NOT NULL,
        mime_type TEXT,
        data BYTEA
      );
      ALTER TABLE photos ADD COLUMN IF NOT EXISTS mime_type TEXT;
      ALTER TABLE photos ADD COLUMN IF NOT EXISTS data BYTEA;
      CREATE TABLE IF NOT EXISTS suggestions (
        id SERIAL PRIMARY KEY,
        veedel_name TEXT NOT NULL,
        suggested_by INTEGER NOT NULL REFERENCES users(id),
        reason TEXT,
        suggested_date TEXT,
        status TEXT NOT NULL DEFAULT 'open'
      );
      CREATE TABLE IF NOT EXISTS brauhaus_spots (
        id SERIAL PRIMARY KEY,
        veedel_name TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        description TEXT,
        rating INTEGER,
        rated_by INTEGER REFERENCES users(id),
        added_by INTEGER REFERENCES users(id)
      );
    `);

    // Migrate legacy file-based photos to database, delete orphans
    await this.migrateLegacyPhotos();
  }

  // Migrate any photos that still reference files on disk into bytea.
  // If the file is gone (ephemeral filesystem / redeploy), delete the DB row.
  async migrateLegacyPhotos(): Promise<void> {
    const uploadDir = path.join(process.cwd(), "uploads");
    const legacy = await db.select().from(photos).where(isNull(photos.data));
    if (legacy.length === 0) return;

    let migrated = 0;
    let deleted = 0;
    for (const p of legacy) {
      const filePath = path.join(uploadDir, p.filename);
      if (fs.existsSync(filePath)) {
        try {
          const buf = fs.readFileSync(filePath);
          const ext = path.extname(p.filename).toLowerCase().replace(".", "");
          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
            gif: "image/gif", webp: "image/webp", heic: "image/heic",
          };
          const mimeType = mimeMap[ext] || "application/octet-stream";
          await db.update(photos).set({ data: buf, mimeType }).where(eq(photos.id, p.id));
          migrated++;
        } catch (err) {
          console.error(`[photos] failed to migrate ${p.filename}:`, err);
          await db.delete(photos).where(eq(photos.id, p.id));
          deleted++;
        }
      } else {
        // Orphan: file gone, delete stale row so UI stops showing ghost thumbnails
        await db.delete(photos).where(eq(photos.id, p.id));
        deleted++;
      }
    }
    console.log(`[photos] legacy migration: migrated=${migrated}, deleted_orphans=${deleted}`);
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Solo visits
  async getSoloVisits(userId: number): Promise<SoloVisit[]> {
    return db.select().from(soloVisits).where(eq(soloVisits.userId, userId));
  }

  async getSoloVisitsByVeedel(veedelName: string): Promise<SoloVisit[]> {
    return db.select().from(soloVisits).where(eq(soloVisits.veedelName, veedelName));
  }

  async createSoloVisit(visit: InsertSoloVisit): Promise<SoloVisit> {
    const result = await db.insert(soloVisits).values(visit).returning();
    return result[0];
  }

  async deleteSoloVisit(id: number, userId: number): Promise<void> {
    await db.delete(soloVisits).where(and(eq(soloVisits.id, id), eq(soloVisits.userId, userId)));
  }

  // Team visits
  async getTeamVisits(): Promise<TeamVisit[]> {
    return db.select().from(teamVisits);
  }

  async getTeamVisitByVeedel(veedelName: string): Promise<TeamVisit | undefined> {
    const result = await db.select().from(teamVisits).where(eq(teamVisits.veedelName, veedelName));
    return result[0];
  }

  async createTeamVisit(visit: InsertTeamVisit): Promise<TeamVisit> {
    const result = await db.insert(teamVisits).values(visit).returning();
    return result[0];
  }

  async deleteTeamVisit(id: number): Promise<void> {
    await db.delete(teamVisits).where(eq(teamVisits.id, id));
  }

  // Photos
  // NOTE: exclude the `data` bytea column from list queries to avoid
  // shipping megabytes of binary per request. Bytes are only read via
  // getPhotoData(filename) when serving /api/uploads/:filename.
  async getPhotosByVisit(visitType: string, visitId: number): Promise<Photo[]> {
    const rows = await db.select({
      id: photos.id,
      filename: photos.filename,
      originalName: photos.originalName,
      veedelName: photos.veedelName,
      uploadedBy: photos.uploadedBy,
      visitType: photos.visitType,
      visitId: photos.visitId,
      mimeType: photos.mimeType,
    }).from(photos)
      .where(and(eq(photos.visitType, visitType), eq(photos.visitId, visitId)));
    return rows as unknown as Photo[];
  }

  async getPhotosByVeedel(veedelName: string): Promise<Photo[]> {
    const rows = await db.select({
      id: photos.id,
      filename: photos.filename,
      originalName: photos.originalName,
      veedelName: photos.veedelName,
      uploadedBy: photos.uploadedBy,
      visitType: photos.visitType,
      visitId: photos.visitId,
      mimeType: photos.mimeType,
    }).from(photos).where(eq(photos.veedelName, veedelName));
    return rows as unknown as Photo[];
  }

  async createPhoto(photo: InsertPhoto & { data?: Buffer; mimeType?: string }): Promise<Photo> {
    const result = await db.insert(photos).values(photo).returning();
    return result[0];
  }

  async getPhotoData(filename: string): Promise<{ data: Buffer; mimeType: string } | undefined> {
    const result = await db.select().from(photos).where(eq(photos.filename, filename));
    const row = result[0];
    if (!row || !row.data) return undefined;
    return { data: row.data as Buffer, mimeType: row.mimeType || "application/octet-stream" };
  }

  async deletePhoto(id: number): Promise<void> {
    await db.delete(photos).where(eq(photos.id, id));
  }

  // Suggestions
  async getAllSuggestions(): Promise<Suggestion[]> {
    return db.select().from(suggestions);
  }

  async createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion> {
    const result = await db.insert(suggestions).values(suggestion).returning();
    return result[0];
  }

  async updateSuggestionStatus(id: number, status: string): Promise<Suggestion | undefined> {
    const result = await db.update(suggestions)
      .set({ status })
      .where(eq(suggestions.id, id))
      .returning();
    return result[0];
  }

  async deleteSuggestion(id: number): Promise<void> {
    await db.delete(suggestions).where(eq(suggestions.id, id));
  }

  // Brauhaus spots
  async getBrauhausByVeedel(veedelName: string): Promise<BrauhausSpot[]> {
    return db.select().from(brauhausSpots).where(eq(brauhausSpots.veedelName, veedelName));
  }

  async getAllBrauhaus(): Promise<BrauhausSpot[]> {
    return db.select().from(brauhausSpots);
  }

  async createBrauhaus(spot: InsertBrauhausSpot): Promise<BrauhausSpot> {
    const result = await db.insert(brauhausSpots).values(spot).returning();
    return result[0];
  }

  async rateBrauhaus(id: number, rating: number, userId: number): Promise<BrauhausSpot | undefined> {
    const result = await db.update(brauhausSpots)
      .set({ rating, ratedBy: userId })
      .where(eq(brauhausSpots.id, id))
      .returning();
    return result[0];
  }

  async deleteBrauhaus(id: number): Promise<void> {
    await db.delete(brauhausSpots).where(eq(brauhausSpots.id, id));
  }
}

export const storage = new DatabaseStorage();
