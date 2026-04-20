import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Camera, Check, Users, User as UserIcon, Plus, Trash2, Calendar,
  Beer, Star, MapPin, X, ChevronLeft, ChevronRight,
} from "lucide-react";


interface Visit {
  id: number;
  userId: number;
  veedelName: string;
  visitDate: string;
  notes: string | null;
}

interface TeamVisit {
  id: number;
  veedelName: string;
  visitDate: string;
  notes: string | null;
  createdBy: number;
}

interface Photo {
  id: number;
  filename: string;
  originalName: string;
  veedelName: string;
  uploadedBy: number;
  visitType: string;
  visitId: number;
}

interface UserInfo {
  id: number;
  username: string;
  displayName: string;
}

interface BrauhausSpot {
  id: number;
  veedelName: string;
  name: string;
  address: string | null;
  description: string | null;
  rating: number | null;
  ratedBy: number | null;
  addedBy: number | null;
}

function StarRating({ rating, onRate }: { rating: number | null; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`transition-colors ${onRate ? "cursor-pointer" : "cursor-default"}`}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => onRate && setHover(star)}
          onMouseLeave={() => onRate && setHover(0)}
          data-testid={`star-${star}`}
        >
          <Star
            className={`w-4 h-4 ${
              (hover || rating || 0) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function VeedelDetail() {
  const [, params] = useRoute("/veedel/:name");
  const veedelName = decodeURIComponent(params?.name || "");
  const { user } = useAuth();
  const { toast } = useToast();

  const [soloDate, setSoloDate] = useState(new Date().toISOString().split("T")[0]);
  const [soloNotes, setSoloNotes] = useState("");
  const [teamDate, setTeamDate] = useState(new Date().toISOString().split("T")[0]);
  const [teamNotes, setTeamNotes] = useState("");
  const [showSoloForm, setShowSoloForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showAddBrauhaus, setShowAddBrauhaus] = useState(false);
  const [newBrauhausName, setNewBrauhausName] = useState("");
  const [newBrauhausAddress, setNewBrauhausAddress] = useState("");
  const [newBrauhausDesc, setNewBrauhausDesc] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: soloVisits = [] } = useQuery<Visit[]>({
    queryKey: ["/api/solo-visits", veedelName],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/solo-visits/${encodeURIComponent(veedelName)}`);
      return res.json();
    },
  });

  const { data: teamVisits = [] } = useQuery<TeamVisit[]>({
    queryKey: ["/api/team-visits"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/team-visits");
      return res.json();
    },
    select: (data) => data.filter((v) => v.veedelName === veedelName),
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: ["/api/photos", veedelName],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/photos/${encodeURIComponent(veedelName)}`);
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

  const { data: brauhausList = [] } = useQuery<BrauhausSpot[]>({
    queryKey: ["/api/brauhaus", veedelName],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/brauhaus/${encodeURIComponent(veedelName)}`);
      return res.json();
    },
  });

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.displayName]));

  const addSoloVisit = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/solo-visits", {
        veedelName,
        visitDate: soloDate,
        notes: soloNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-visits", veedelName] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scores"] });
      setSoloNotes("");
      setShowSoloForm(false);
      toast({ title: "Solo-Besuch eingetragen" });
    },
  });

  const addTeamVisit = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/team-visits", {
        veedelName,
        visitDate: teamDate,
        notes: teamNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scores"] });
      setTeamNotes("");
      setShowTeamForm(false);
      toast({ title: "Team-Besuch eingetragen" });
    },
  });

  const deleteSoloVisit = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/solo-visits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-visits", veedelName] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scores"] });
    },
  });

  const deleteTeamVisit = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/team-visits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scores"] });
    },
  });

  const uploadPhoto = useMutation({
    mutationFn: async ({ file, visitType, visitId }: { file: File; visitType: string; visitId: number }) => {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("veedelName", veedelName);
      formData.append("visitType", visitType);
      formData.append("visitId", String(visitId));
      const res = await apiRequest("POST", "/api/photos", formData, true);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", veedelName] });
      toast({ title: "Foto hochgeladen" });
    },
  });

  const addBrauhaus = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/brauhaus", {
        veedelName,
        name: newBrauhausName,
        address: newBrauhausAddress || null,
        description: newBrauhausDesc || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brauhaus", veedelName] });
      setNewBrauhausName("");
      setNewBrauhausAddress("");
      setNewBrauhausDesc("");
      setShowAddBrauhaus(false);
      toast({ title: "Brauhaus hinzugefügt" });
    },
  });

  const rateBrauhaus = useMutation({
    mutationFn: async ({ id, rating }: { id: number; rating: number }) => {
      await apiRequest("PATCH", `/api/brauhaus/${id}/rate`, { rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brauhaus", veedelName] });
      toast({ title: "Bewertung gespeichert" });
    },
  });

  const handlePhotoUpload = (visitType: string, visitId: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) uploadPhoto.mutate({ file, visitType, visitId });
    };
    input.click();
  };

  const mySoloVisits = soloVisits.filter((v) => v.userId === user?.id);
  const othersSoloVisits = soloVisits.filter((v) => v.userId !== user?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-semibold text-base" data-testid="text-veedel-name">{veedelName}</h1>
          <div className="flex gap-1.5 mt-0.5">
            {teamVisits.length > 0 && (
              <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-700">
                <Users className="w-3 h-3 mr-1" /> Team
              </Badge>
            )}
            {mySoloVisits.length > 0 && (
              <Badge variant="default" className="text-[10px] bg-blue-600 hover:bg-blue-700">
                <UserIcon className="w-3 h-3 mr-1" /> Solo
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Solo Visits */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-blue-600" /> Meine Solo-Besuche
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSoloForm(!showSoloForm)}
                data-testid="button-add-solo"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showSoloForm && (
              <div className="space-y-2 p-3 bg-accent/50 rounded-lg">
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={soloDate}
                    onChange={(e) => setSoloDate(e.target.value)}
                    className="flex-1"
                    data-testid="input-solo-date"
                  />
                </div>
                <Textarea
                  placeholder="Notizen (optional)"
                  value={soloNotes}
                  onChange={(e) => setSoloNotes(e.target.value)}
                  className="min-h-[60px]"
                  data-testid="input-solo-notes"
                />
                <Button
                  size="sm"
                  onClick={() => addSoloVisit.mutate()}
                  disabled={addSoloVisit.isPending}
                  data-testid="button-save-solo"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Eintragen
                </Button>
              </div>
            )}

            {mySoloVisits.length === 0 && !showSoloForm && (
              <p className="text-sm text-muted-foreground">Noch kein Solo-Besuch eingetragen</p>
            )}

            {mySoloVisits.map((v) => (
              <div key={v.id} className="flex items-start justify-between p-2 rounded-md bg-accent/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(v.visitDate).toLocaleDateString("de-DE")}
                  </div>
                  {v.notes && <p className="text-xs text-muted-foreground">{v.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePhotoUpload("solo", v.id)}
                    data-testid={`button-photo-solo-${v.id}`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSoloVisit.mutate(v.id)}
                    data-testid={`button-delete-solo-${v.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Others' solo visits */}
            {othersSoloVisits.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Andere Besuche:</p>
                {othersSoloVisits.map((v) => (
                  <div key={v.id} className="text-xs text-muted-foreground py-1">
                    <span className="font-medium">{userMap[v.userId] || "?"}</span> am{" "}
                    {new Date(v.visitDate).toLocaleDateString("de-DE")}
                    {v.notes && ` — ${v.notes}`}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Visits */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" /> Team-Besuche
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTeamForm(!showTeamForm)}
                data-testid="button-add-team"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showTeamForm && (
              <div className="space-y-2 p-3 bg-accent/50 rounded-lg">
                <Input
                  type="date"
                  value={teamDate}
                  onChange={(e) => setTeamDate(e.target.value)}
                  data-testid="input-team-date"
                />
                <Textarea
                  placeholder="Notizen zum Team-Besuch (optional)"
                  value={teamNotes}
                  onChange={(e) => setTeamNotes(e.target.value)}
                  className="min-h-[60px]"
                  data-testid="input-team-notes"
                />
                <Button
                  size="sm"
                  onClick={() => addTeamVisit.mutate()}
                  disabled={addTeamVisit.isPending}
                  data-testid="button-save-team"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Eintragen
                </Button>
              </div>
            )}

            {teamVisits.length === 0 && !showTeamForm && (
              <p className="text-sm text-muted-foreground">Noch kein gemeinsamer Besuch</p>
            )}

            {teamVisits.map((v) => (
              <div key={v.id} className="flex items-start justify-between p-2 rounded-md bg-accent/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(v.visitDate).toLocaleDateString("de-DE")}
                  </div>
                  {v.notes && <p className="text-xs text-muted-foreground">{v.notes}</p>}
                  <p className="text-[10px] text-muted-foreground">
                    Eingetragen von {userMap[v.createdBy] || "?"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePhotoUpload("team", v.id)}
                    data-testid={`button-photo-team-${v.id}`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTeamVisit.mutate(v.id)}
                    data-testid={`button-delete-team-${v.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Brauhaus Empfehlungen */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Beer className="w-4 h-4 text-amber-600" /> Brauhaus-Tipps
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddBrauhaus(!showAddBrauhaus)}
                data-testid="button-add-brauhaus"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showAddBrauhaus && (
              <div className="space-y-2 p-3 bg-accent/50 rounded-lg">
                <Input
                  placeholder="Name des Brauhauses"
                  value={newBrauhausName}
                  onChange={(e) => setNewBrauhausName(e.target.value)}
                  data-testid="input-brauhaus-name"
                />
                <Input
                  placeholder="Adresse (optional)"
                  value={newBrauhausAddress}
                  onChange={(e) => setNewBrauhausAddress(e.target.value)}
                  data-testid="input-brauhaus-address"
                />
                <Textarea
                  placeholder="Beschreibung (optional)"
                  value={newBrauhausDesc}
                  onChange={(e) => setNewBrauhausDesc(e.target.value)}
                  className="min-h-[60px]"
                  data-testid="input-brauhaus-desc"
                />
                <Button
                  size="sm"
                  onClick={() => addBrauhaus.mutate()}
                  disabled={addBrauhaus.isPending || !newBrauhausName.trim()}
                  data-testid="button-save-brauhaus"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Hinzufügen
                </Button>
              </div>
            )}

            {brauhausList.length === 0 && !showAddBrauhaus && (
              <p className="text-sm text-muted-foreground">Keine Brauhaus-Tipps für dieses Veedel</p>
            )}

            {brauhausList.map((b) => (
              <div key={b.id} className="p-3 rounded-lg bg-accent/30 space-y-1.5" data-testid={`brauhaus-${b.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm">{b.name}</h3>
                    {b.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{b.address}</span>
                      </p>
                    )}
                  </div>
                  <StarRating
                    rating={b.rating}
                    onRate={(r) => rateBrauhaus.mutate({ id: b.id, rating: r })}
                  />
                </div>
                {b.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Photos */}
        {photos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Camera className="w-4 h-4" /> Fotos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className="relative group block w-full p-0 border-0 bg-transparent cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
                    aria-label={`Foto ${p.originalName} öffnen`}
                    data-testid={`button-open-photo-${p.id}`}
                  >
                    <img
                      src={`/api/uploads/${p.filename}`}
                      alt={p.originalName}
                      className="w-full h-32 object-cover rounded-md"
                      data-testid={`img-photo-${p.id}`}
                      onError={(e) => {
                        // Hide broken thumbnails (e.g. legacy uploads lost on redeploy)
                        const el = e.currentTarget;
                        el.closest("button")?.classList.add("hidden");
                      }}
                    />
                    <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {userMap[p.uploadedBy] || "?"}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PhotoLightbox
        photos={photos}
        index={lightboxIndex}
        userMap={userMap}
        onClose={() => setLightboxIndex(null)}
        onPrev={() =>
          setLightboxIndex((i) =>
            i === null ? null : (i - 1 + photos.length) % photos.length
          )
        }
        onNext={() =>
          setLightboxIndex((i) =>
            i === null ? null : (i + 1) % photos.length
          )
        }
      />
    </div>
  );
}

function PhotoLightbox({
  photos,
  index,
  userMap,
  onClose,
  onPrev,
  onNext,
}: {
  photos: Photo[];
  index: number | null;
  userMap: Record<number, string>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  // Keyboard nav: ESC to close, arrows to navigate
  useEffect(() => {
    if (index === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    // Lock body scroll while lightbox open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, onClose, onPrev, onNext]);

  // Touch swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx > 0) onPrev();
      else onNext();
    }
    setTouchStartX(null);
  };

  if (index === null || !photos[index]) return null;
  const p = photos[index];
  const hasMultiple = photos.length > 1;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      data-testid="photo-lightbox"
    >
      {/* Close button */}
      <button
        type="button"
        className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Schließen"
        data-testid="button-lightbox-close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev */}
      {hasMultiple && (
        <button
          type="button"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Vorheriges Foto"
          data-testid="button-lightbox-prev"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}

      {/* Image */}
      <img
        src={`/api/uploads/${p.filename}`}
        alt={p.originalName}
        className="max-h-[90vh] max-w-[92vw] object-contain rounded shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid={`img-lightbox-${p.id}`}
      />

      {/* Next */}
      {hasMultiple && (
        <button
          type="button"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Nächstes Foto"
          data-testid="button-lightbox-next"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}

      {/* Caption */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 px-3 py-1.5 rounded-full"
        onClick={(e) => e.stopPropagation()}
      >
        {userMap[p.uploadedBy] || "?"}
        {hasMultiple && <span className="opacity-70"> · {index + 1}/{photos.length}</span>}
      </div>
    </div>
  );
}
