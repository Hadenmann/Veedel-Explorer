import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lightbulb, Plus, Check, X, MapPin } from "lucide-react";

interface Suggestion {
  id: number;
  veedelName: string;
  suggestedBy: number;
  reason: string | null;
  suggestedDate: string | null;
  status: string;
}

interface UserInfo {
  id: number;
  username: string;
  displayName: string;
}

const VEEDEL_LIST = [
  "Altstadt/Nord","Altstadt/Süd","Bayenthal","Bickendorf","Bilderstöckchen","Blumenberg",
  "Bocklemünd/Mengenich","Braunsfeld","Brück","Buchforst","Buchheim","Chorweiler",
  "Dellbrück","Deutz","Dünnwald","Ehrenfeld","Eil","Elsdorf","Ensen","Esch/Auweiler",
  "Finkenberg","Flittard","Fühlingen","Godorf","Gremberghoven","Grengel","Hahnwald",
  "Heimersdorf","Holweide","Humboldt/Gremberg","Höhenberg","Höhenhaus","Immendorf",
  "Junkersdorf","Kalk","Klettenberg","Langel","Libur","Lind","Lindenthal","Lindweiler",
  "Longerich","Lövenich","Marienburg","Mauenheim","Merheim","Merkenich","Meschenich",
  "Mülheim","Müngersdorf","Neubrück","Neuehrenfeld","Neustadt/Nord","Neustadt/Süd",
  "Niehl","Nippes","Ossendorf","Ostheim","Pesch","Poll","Porz","Raderberg","Raderthal",
  "Rath/Heumar","Riehl","Rodenkirchen","Roggendorf/Thenhoven","Rondorf","Seeberg",
  "Stammheim","Sülz","Sürth","Urbach","Vingst","Vogelsang","Volkhoven/Weiler",
  "Wahn","Wahnheide","Weiden","Weidenpesch","Weiß","Westhoven","Widdersdorf",
  "Worringen","Zollstock","Zündorf"
];

export default function SuggestionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [veedelName, setVeedelName] = useState("");
  const [reason, setReason] = useState("");
  const [suggestedDate, setSuggestedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: suggestions = [] } = useQuery<Suggestion[]>({
    queryKey: ["/api/suggestions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/suggestions");
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

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.displayName]));

  const addSuggestion = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/suggestions", {
        veedelName,
        reason: reason || null,
        suggestedDate: suggestedDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions"] });
      setVeedelName("");
      setReason("");
      setSuggestedDate("");
      setShowForm(false);
      toast({ title: "Vorschlag eingetragen" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/suggestions/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions"] });
    },
  });

  const deleteSuggestion = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/suggestions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions"] });
    },
  });

  const filteredVeedel = VEEDEL_LIST.filter((v) =>
    v.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openSuggestions = suggestions.filter((s) => s.status === "open");
  const doneSuggestions = suggestions.filter((s) => s.status !== "open");

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-base">Vorschläge</h1>
        </div>
        <Button
          variant="default"
          size="sm"
          className="ml-auto"
          onClick={() => setShowForm(!showForm)}
          data-testid="button-new-suggestion"
        >
          <Plus className="w-4 h-4 mr-1" /> Neu
        </Button>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {showForm && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Neuer Vorschlag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Veedel suchen..."
                  value={veedelName || searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setVeedelName("");
                  }}
                  data-testid="input-search-veedel"
                />
                {searchTerm && !veedelName && (
                  <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md mt-1 max-h-40 overflow-y-auto z-20 shadow-lg">
                    {filteredVeedel.slice(0, 10).map((v) => (
                      <button
                        key={v}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => {
                          setVeedelName(v);
                          setSearchTerm("");
                        }}
                        data-testid={`option-veedel-${v}`}
                      >
                        <MapPin className="w-3 h-3 inline mr-1.5" />{v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                type="date"
                placeholder="Vorgeschlagenes Datum"
                value={suggestedDate}
                onChange={(e) => setSuggestedDate(e.target.value)}
                data-testid="input-suggested-date"
              />
              <Textarea
                placeholder="Warum dieses Veedel? (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[60px]"
                data-testid="input-reason"
              />
              <Button
                size="sm"
                onClick={() => addSuggestion.mutate()}
                disabled={!veedelName || addSuggestion.isPending}
                data-testid="button-save-suggestion"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Vorschlagen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Open suggestions */}
        {openSuggestions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Offene Vorschläge</h2>
            {openSuggestions.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {s.veedelName}
                      </div>
                      {s.suggestedDate && (
                        <p className="text-xs text-muted-foreground">
                          Vorgeschlagen für {new Date(s.suggestedDate).toLocaleDateString("de-DE")}
                        </p>
                      )}
                      {s.reason && <p className="text-xs text-muted-foreground">{s.reason}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        von {userMap[s.suggestedBy] || "?"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: s.id, status: "done" })}
                        data-testid={`button-done-${s.id}`}
                      >
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSuggestion.mutate(s.id)}
                        data-testid={`button-delete-suggestion-${s.id}`}
                      >
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Done suggestions */}
        {doneSuggestions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Erledigt</h2>
            {doneSuggestions.map((s) => (
              <Card key={s.id} className="opacity-60">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="line-through">{s.veedelName}</span>
                    <span className="text-xs text-muted-foreground">({userMap[s.suggestedBy] || "?"})</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {suggestions.length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Noch keine Vorschläge</p>
            <p className="text-xs mt-1">Schlage ein Veedel für den nächsten Besuch vor</p>
          </div>
        )}
      </div>
    </div>
  );
}
