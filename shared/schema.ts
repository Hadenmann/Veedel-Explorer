import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
});

// Solo visits - individual visits to a Veedel
export const soloVisits = sqliteTable("solo_visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  veedelName: text("veedel_name").notNull(),
  visitDate: text("visit_date").notNull(),
  notes: text("notes"),
});

// Team visits - visits made together by the group
export const teamVisits = sqliteTable("team_visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  veedelName: text("veedel_name").notNull(),
  visitDate: text("visit_date").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Photos for visits
export const photos = sqliteTable("photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  veedelName: text("veedel_name").notNull(),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  visitType: text("visit_type").notNull(), // 'solo' or 'team'
  visitId: integer("visit_id").notNull(),
});

// Suggestions for next visits
export const suggestions = sqliteTable("suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  veedelName: text("veedel_name").notNull(),
  suggestedBy: integer("suggested_by").notNull().references(() => users.id),
  reason: text("reason"),
  suggestedDate: text("suggested_date"),
  status: text("status").notNull().default("open"), // 'open', 'accepted', 'done'
});

// Brauhaus recommendations per Veedel
export const brauhausSpots = sqliteTable("brauhaus_spots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  veedelName: text("veedel_name").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  description: text("description"),
  rating: integer("rating"), // user rating 1-5
  ratedBy: integer("rated_by").references(() => users.id),
  addedBy: integer("added_by").references(() => users.id),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertSoloVisitSchema = createInsertSchema(soloVisits).omit({ id: true });
export const insertTeamVisitSchema = createInsertSchema(teamVisits).omit({ id: true });
export const insertPhotoSchema = createInsertSchema(photos).omit({ id: true });
export const insertSuggestionSchema = createInsertSchema(suggestions).omit({ id: true });
export const insertBrauhausSpotSchema = createInsertSchema(brauhausSpots).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SoloVisit = typeof soloVisits.$inferSelect;
export type InsertSoloVisit = z.infer<typeof insertSoloVisitSchema>;
export type TeamVisit = typeof teamVisits.$inferSelect;
export type InsertTeamVisit = z.infer<typeof insertTeamVisitSchema>;
export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type BrauhausSpot = typeof brauhausSpots.$inferSelect;
export type InsertBrauhausSpot = z.infer<typeof insertBrauhausSpotSchema>;

// === GAMIFICATION TYPES (computed, not stored) ===

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  requirement: number;
  type: "solo" | "team" | "bezirk" | "special";
}

export interface UserScore {
  userId: number;
  displayName: string;
  points: number;
  soloCount: number;
  teamCount: number;
  achievements: Achievement[];
  level: number;
  levelTitle: string;
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Solo milestones
  { id: "solo_1", title: "Erste Schritte", description: "Erstes Veedel solo besucht", icon: "👣", requirement: 1, type: "solo" },
  { id: "solo_5", title: "Entdecker", description: "5 Veedel solo besucht", icon: "🧭", requirement: 5, type: "solo" },
  { id: "solo_10", title: "Stadtwanderer", description: "10 Veedel solo besucht", icon: "🚶", requirement: 10, type: "solo" },
  { id: "solo_25", title: "Veedels-Kenner", description: "25 Veedel solo besucht", icon: "🎯", requirement: 25, type: "solo" },
  { id: "solo_50", title: "Halb Köln", description: "50 Veedel solo besucht", icon: "⭐", requirement: 50, type: "solo" },
  { id: "solo_86", title: "Kölner Original", description: "Alle 86 Veedel solo besucht!", icon: "👑", requirement: 86, type: "solo" },
  // Team milestones
  { id: "team_1", title: "Teamwork", description: "Erstes Veedel gemeinsam besucht", icon: "🤝", requirement: 1, type: "team" },
  { id: "team_5", title: "Stammtisch", description: "5 Veedel gemeinsam besucht", icon: "🍻", requirement: 5, type: "team" },
  { id: "team_10", title: "Veedels-Trio", description: "10 Veedel gemeinsam besucht", icon: "🏅", requirement: 10, type: "team" },
  { id: "team_25", title: "Kölsche Jungs", description: "25 Veedel gemeinsam besucht", icon: "🎪", requirement: 25, type: "team" },
  { id: "team_43", title: "Halbzeit!", description: "Die Hälfte gemeinsam geschafft", icon: "🎯", requirement: 43, type: "team" },
  { id: "team_86", title: "Köln Meister", description: "Alle 86 Veedel gemeinsam besucht!", icon: "🏆", requirement: 86, type: "team" },
  // Bezirk achievements
  { id: "bezirk_innenstadt", title: "Innenstädter", description: "Alle Veedel in Innenstadt besucht", icon: "⛪", requirement: 5, type: "bezirk" },
  { id: "bezirk_rodenkirchen", title: "Süd-Explorer", description: "Alle Veedel in Rodenkirchen besucht", icon: "🌳", requirement: 13, type: "bezirk" },
  { id: "bezirk_lindenthal", title: "Linden-Liebhaber", description: "Alle Veedel in Lindenthal besucht", icon: "🌿", requirement: 9, type: "bezirk" },
  { id: "bezirk_ehrenfeld", title: "Ehrenfelder", description: "Alle Veedel in Ehrenfeld besucht", icon: "🎨", requirement: 6, type: "bezirk" },
  { id: "bezirk_nippes", title: "Nippes Fan", description: "Alle Veedel in Nippes besucht", icon: "🎭", requirement: 7, type: "bezirk" },
  { id: "bezirk_chorweiler", title: "Nördling", description: "Alle Veedel in Chorweiler besucht", icon: "🏘️", requirement: 12, type: "bezirk" },
  { id: "bezirk_porz", title: "Porzer", description: "Alle Veedel in Porz besucht", icon: "✈️", requirement: 16, type: "bezirk" },
  { id: "bezirk_kalk", title: "Kalker", description: "Alle Veedel in Kalk besucht", icon: "🏭", requirement: 9, type: "bezirk" },
  { id: "bezirk_muelheim", title: "Schäl Sick", description: "Alle Veedel in Mülheim besucht", icon: "🌉", requirement: 9, type: "bezirk" },
];

// Level system
export const LEVELS = [
  { min: 0, title: "Immi" },
  { min: 50, title: "Zugezogener" },
  { min: 150, title: "Veedels-Gänger" },
  { min: 300, title: "Kölner Jung" },
  { min: 500, title: "Kölsche Frohnatur" },
  { min: 800, title: "Bürgermeister" },
  { min: 1200, title: "Kölner Original" },
  { min: 1800, title: "Ehrenbürger" },
];

// Bezirk mapping for achievements
export const BEZIRKE: Record<string, string[]> = {
  "bezirk_innenstadt": ["Altstadt/Nord", "Altstadt/Süd", "Neustadt/Nord", "Neustadt/Süd", "Deutz"],
  "bezirk_rodenkirchen": ["Bayenthal", "Godorf", "Hahnwald", "Immendorf", "Marienburg", "Meschenich", "Raderberg", "Raderthal", "Rodenkirchen", "Rondorf", "Sürth", "Weiß", "Zollstock"],
  "bezirk_lindenthal": ["Braunsfeld", "Junkersdorf", "Klettenberg", "Lindenthal", "Lövenich", "Müngersdorf", "Sülz", "Weiden", "Widdersdorf"],
  "bezirk_ehrenfeld": ["Bickendorf", "Bocklemünd/Mengenich", "Ehrenfeld", "Neuehrenfeld", "Ossendorf", "Vogelsang"],
  "bezirk_nippes": ["Bilderstöckchen", "Longerich", "Mauenheim", "Niehl", "Nippes", "Riehl", "Weidenpesch"],
  "bezirk_chorweiler": ["Blumenberg", "Chorweiler", "Esch/Auweiler", "Fühlingen", "Heimersdorf", "Lindweiler", "Merkenich", "Pesch", "Roggendorf/Thenhoven", "Seeberg", "Volkhoven/Weiler", "Worringen"],
  "bezirk_porz": ["Eil", "Elsdorf", "Ensen", "Finkenberg", "Gremberghoven", "Grengel", "Langel", "Libur", "Lind", "Poll", "Porz", "Urbach", "Wahn", "Wahnheide", "Westhoven", "Zündorf"],
  "bezirk_kalk": ["Brück", "Höhenberg", "Humboldt/Gremberg", "Kalk", "Merheim", "Neubrück", "Ostheim", "Rath/Heumar", "Vingst"],
  "bezirk_muelheim": ["Buchforst", "Buchheim", "Dellbrück", "Dünnwald", "Flittard", "Höhenhaus", "Holweide", "Mülheim", "Stammheim"],
};
