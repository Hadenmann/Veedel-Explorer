import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";
import {
  users, soloVisits, teamVisits, photos, suggestions, brauhausSpots,
  type User, type InsertUser,
  type SoloVisit, type InsertSoloVisit,
  type TeamVisit, type InsertTeamVisit,
  type Photo, type InsertPhoto,
  type Suggestion, type InsertSuggestion,
  type BrauhausSpot, type InsertBrauhausSpot,
} from "@shared/schema";

const sqlite = new Database("veedel.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByUsername(username: string): User | undefined;
  createUser(user: InsertUser): User;
  getAllUsers(): User[];

  // Solo visits
  getSoloVisits(userId: number): SoloVisit[];
  getSoloVisitsByVeedel(veedelName: string): SoloVisit[];
  createSoloVisit(visit: InsertSoloVisit): SoloVisit;
  deleteSoloVisit(id: number, userId: number): void;

  // Team visits
  getTeamVisits(): TeamVisit[];
  getTeamVisitByVeedel(veedelName: string): TeamVisit | undefined;
  createTeamVisit(visit: InsertTeamVisit): TeamVisit;
  deleteTeamVisit(id: number): void;

  // Photos
  getPhotosByVisit(visitType: string, visitId: number): Photo[];
  getPhotosByVeedel(veedelName: string): Photo[];
  createPhoto(photo: InsertPhoto): Photo;
  deletePhoto(id: number): void;

  // Suggestions
  getAllSuggestions(): Suggestion[];
  createSuggestion(suggestion: InsertSuggestion): Suggestion;
  updateSuggestionStatus(id: number, status: string): Suggestion | undefined;
  deleteSuggestion(id: number): void;

  // Brauhaus spots
  getBrauhausByVeedel(veedelName: string): BrauhausSpot[];
  getAllBrauhaus(): BrauhausSpot[];
  createBrauhaus(spot: InsertBrauhausSpot): BrauhausSpot;
  rateBrauhaus(id: number, rating: number, userId: number): BrauhausSpot | undefined;
  deleteBrauhaus(id: number): void;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Create tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS solo_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        veedel_name TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS team_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veedel_name TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        veedel_name TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        visit_type TEXT NOT NULL,
        visit_id INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veedel_name TEXT NOT NULL,
        suggested_by INTEGER NOT NULL REFERENCES users(id),
        reason TEXT,
        suggested_date TEXT,
        status TEXT NOT NULL DEFAULT 'open'
      );
      CREATE TABLE IF NOT EXISTS brauhaus_spots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veedel_name TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        description TEXT,
        rating INTEGER,
        rated_by INTEGER REFERENCES users(id),
        added_by INTEGER REFERENCES users(id)
      );
    `);
  }

  // Users
  getUser(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  createUser(user: InsertUser): User {
    return db.insert(users).values(user).returning().get();
  }

  getAllUsers(): User[] {
    return db.select().from(users).all();
  }

  // Solo visits
  getSoloVisits(userId: number): SoloVisit[] {
    return db.select().from(soloVisits).where(eq(soloVisits.userId, userId)).all();
  }

  getSoloVisitsByVeedel(veedelName: string): SoloVisit[] {
    return db.select().from(soloVisits).where(eq(soloVisits.veedelName, veedelName)).all();
  }

  createSoloVisit(visit: InsertSoloVisit): SoloVisit {
    return db.insert(soloVisits).values(visit).returning().get();
  }

  deleteSoloVisit(id: number, userId: number): void {
    db.delete(soloVisits).where(and(eq(soloVisits.id, id), eq(soloVisits.userId, userId))).run();
  }

  // Team visits
  getTeamVisits(): TeamVisit[] {
    return db.select().from(teamVisits).all();
  }

  getTeamVisitByVeedel(veedelName: string): TeamVisit | undefined {
    return db.select().from(teamVisits).where(eq(teamVisits.veedelName, veedelName)).get();
  }

  createTeamVisit(visit: InsertTeamVisit): TeamVisit {
    return db.insert(teamVisits).values(visit).returning().get();
  }

  deleteTeamVisit(id: number): void {
    db.delete(teamVisits).where(eq(teamVisits.id, id)).run();
  }

  // Photos
  getPhotosByVisit(visitType: string, visitId: number): Photo[] {
    return db.select().from(photos)
      .where(and(eq(photos.visitType, visitType), eq(photos.visitId, visitId)))
      .all();
  }

  getPhotosByVeedel(veedelName: string): Photo[] {
    return db.select().from(photos).where(eq(photos.veedelName, veedelName)).all();
  }

  createPhoto(photo: InsertPhoto): Photo {
    return db.insert(photos).values(photo).returning().get();
  }

  deletePhoto(id: number): void {
    db.delete(photos).where(eq(photos.id, id)).run();
  }

  // Suggestions
  getAllSuggestions(): Suggestion[] {
    return db.select().from(suggestions).all();
  }

  createSuggestion(suggestion: InsertSuggestion): Suggestion {
    return db.insert(suggestions).values(suggestion).returning().get();
  }

  updateSuggestionStatus(id: number, status: string): Suggestion | undefined {
    return db.update(suggestions)
      .set({ status })
      .where(eq(suggestions.id, id))
      .returning()
      .get();
  }

  deleteSuggestion(id: number): void {
    db.delete(suggestions).where(eq(suggestions.id, id)).run();
  }

  // Brauhaus spots
  getBrauhausByVeedel(veedelName: string): BrauhausSpot[] {
    return db.select().from(brauhausSpots).where(eq(brauhausSpots.veedelName, veedelName)).all();
  }

  getAllBrauhaus(): BrauhausSpot[] {
    return db.select().from(brauhausSpots).all();
  }

  createBrauhaus(spot: InsertBrauhausSpot): BrauhausSpot {
    return db.insert(brauhausSpots).values(spot).returning().get();
  }

  rateBrauhaus(id: number, rating: number, userId: number): BrauhausSpot | undefined {
    return db.update(brauhausSpots)
      .set({ rating, ratedBy: userId })
      .where(eq(brauhausSpots.id, id))
      .returning()
      .get();
  }

  deleteBrauhaus(id: number): void {
    db.delete(brauhausSpots).where(eq(brauhausSpots.id, id)).run();
  }
}

export const storage = new DatabaseStorage();
