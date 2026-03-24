import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BarChart3, Users, User as UserIcon, MapPin, Trophy } from "lucide-react";

interface UserInfo {
  id: number;
  username: string;
  displayName: string;
}

interface Stats {
  totalVeedel: number;
  teamVisited: number;
  soloVisited: number;
  teamVeedel: string[];
  soloVeedel: string[];
  allSoloVisits: Record<string, string[]>;
}

export default function StatsPage() {
  const { user } = useAuth();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stats");
      return res.json();
    },
  });

  const { data: allUsers = [] } = useQuery<UserInfo[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
  });

  if (!stats) return null;

  const teamPct = Math.round((stats.teamVisited / stats.totalVeedel) * 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-base">Statistik</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Team progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" /> Team-Fortschritt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-green-600">{stats.teamVisited}</span>
              <span className="text-sm text-muted-foreground">von {stats.totalVeedel} Veedeln</span>
            </div>
            <Progress value={teamPct} className="h-3" />
            <p className="text-xs text-muted-foreground">{teamPct}% der Kölner Veedel gemeinsam besucht</p>
            {stats.teamVisited === stats.totalVeedel && (
              <div className="flex items-center gap-2 p-3 bg-green-600/10 rounded-lg text-green-700 dark:text-green-400">
                <Trophy className="w-5 h-5" />
                <span className="text-sm font-medium">Alle Veedel besucht — Herzlichen Glückwunsch!</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-user solo stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-blue-600" /> Solo-Besuche pro Person
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allUsers.map((u) => {
              const userVeedel = stats.allSoloVisits[String(u.id)] || [];
              const count = userVeedel.length;
              const pct = Math.round((count / stats.totalVeedel) * 100);
              const isMe = u.id === user?.id;
              return (
                <div key={u.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isMe ? "font-semibold" : ""}>
                      {u.displayName} {isMe && "(Du)"}
                    </span>
                    <span className="text-muted-foreground">{count} Veedel ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Unvisited veedel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" /> Noch nicht besucht (Team)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {stats.totalVeedel - stats.teamVisited === 0 ? (
                <p className="text-sm text-muted-foreground">Alle besucht!</p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Noch {stats.totalVeedel - stats.teamVisited} Veedel offen
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
