import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Trophy, Medal, Crown, Target, Flame,
} from "lucide-react";
import { ACHIEVEMENTS, LEVELS, type UserScore, type Achievement } from "@shared/schema";

export default function AchievementsPage() {
  const { user } = useAuth();

  const { data: scores = [] } = useQuery<UserScore[]>({
    queryKey: ["/api/scores"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/scores");
      return res.json();
    },
  });

  const myScore = scores.find((s) => s.userId === user?.id);
  const myAchievementIds = new Set(myScore?.achievements.map((a) => a.id) || []);

  // Next level info
  const currentLevelIdx = myScore?.level ?? 0;
  const nextLevel = LEVELS[currentLevelIdx + 1];
  const currentLevelMin = LEVELS[currentLevelIdx]?.min ?? 0;
  const nextLevelMin = nextLevel?.min ?? currentLevelMin;
  const progressToNext = nextLevel
    ? Math.min(100, Math.round(((myScore?.points ?? 0) - currentLevelMin) / (nextLevelMin - currentLevelMin) * 100))
    : 100;

  const rankIcon = (idx: number) => {
    if (idx === 0) return <Crown className="w-5 h-5 text-amber-500" />;
    if (idx === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (idx === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs text-muted-foreground font-bold">{idx + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-base">Achievements</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* My Level Card */}
        {myScore && (
          <Card className="border-primary/20 bg-gradient-to-br from-card to-accent/30">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Dein Level</p>
                  <p className="text-xl font-bold mt-0.5">{myScore.levelTitle}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-primary" />
                    <span className="text-2xl font-bold text-primary">{myScore.points}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Punkte</p>
                </div>
              </div>
              {nextLevel && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Level {currentLevelIdx + 1}</span>
                    <span>{nextLevel.title} ({nextLevelMin} Pkt.)</span>
                  </div>
                  <Progress value={progressToNext} className="h-2" />
                </div>
              )}
              <div className="flex gap-4 pt-1">
                <div className="text-center">
                  <p className="text-lg font-semibold">{myScore.soloCount}</p>
                  <p className="text-[10px] text-muted-foreground">Solo</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{myScore.teamCount}</p>
                  <p className="text-[10px] text-muted-foreground">Team</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{myScore.achievements.length}</p>
                  <p className="text-[10px] text-muted-foreground">Achievements</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Rangliste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {scores.map((s, idx) => {
              const isMe = s.userId === user?.id;
              return (
                <div
                  key={s.userId}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                    isMe ? "bg-primary/10 ring-1 ring-primary/20" : "bg-accent/30"
                  }`}
                  data-testid={`leaderboard-${s.userId}`}
                >
                  <div className="shrink-0">{rankIcon(idx)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${isMe ? "font-semibold" : ""}`}>
                        {s.displayName} {isMe && "(Du)"}
                      </span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {s.levelTitle}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{s.soloCount} Solo</span>
                      <span>{s.teamCount} Team</span>
                      <span>{s.achievements.length} 🏆</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold">{s.points}</span>
                    <p className="text-[10px] text-muted-foreground">Pkt.</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" /> Achievements ({myScore?.achievements.length ?? 0}/{ACHIEVEMENTS.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Earned first */}
              {ACHIEVEMENTS.map((ach) => {
                const earned = myAchievementIds.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      earned
                        ? "bg-green-600/10 ring-1 ring-green-600/20"
                        : "bg-accent/20 opacity-50"
                    }`}
                    data-testid={`achievement-${ach.id}`}
                  >
                    <span className="text-xl shrink-0">{ach.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${earned ? "font-semibold" : ""}`}>{ach.title}</p>
                      <p className="text-[10px] text-muted-foreground">{ach.description}</p>
                    </div>
                    {earned && (
                      <Badge className="bg-green-600 text-white text-[10px] shrink-0">
                        +50
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Punkte-Erklärung */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Punkte-System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Solo-Besuch (neues Veedel)</span>
              <span className="font-medium text-foreground">+10 Pkt.</span>
            </div>
            <div className="flex justify-between">
              <span>Team-Besuch (neues Veedel)</span>
              <span className="font-medium text-foreground">+20 Pkt.</span>
            </div>
            <div className="flex justify-between">
              <span>Achievement freigeschaltet</span>
              <span className="font-medium text-foreground">+50 Pkt.</span>
            </div>
            <div className="pt-2 border-t border-border space-y-1">
              <p className="font-medium text-foreground text-xs mb-1.5">Level-Stufen</p>
              {LEVELS.map((lvl, i) => (
                <div key={i} className="flex justify-between">
                  <span>{lvl.title}</span>
                  <span>{lvl.min} Pkt.</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
