import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { demoAdmin, signIn } from "./auth";
import { deleteRemotePin, deleteRemoteUser, loadAppData, saveRemotePins, saveRemoteUsers } from "./database";
import { loadPins, loadSession, loadUsers, savePins, saveSession, saveUsers } from "./storage";
import { isSupabaseConfigured } from "./supabaseClient";
import type { Comment, FishingPin, PinPhoto, Rating, User } from "./types";

const ncrCities = ["Ottawa", "Gatineau", "Orleans", "Kanata", "Nepean", "Chelsea", "Aylmer"];
const ncrCenter: [number, number] = [-75.6972, 45.4215];
const openFreeMapStyle = "https://tiles.openfreemap.org/styles/liberty";
type DraftLocation = { longitude: number; latitude: number };

function getAverageRating(pin: FishingPin) {
  if (!pin.ratings.length) return 0;
  return pin.ratings.reduce((sum, rating) => sum + rating.value, 0) / pin.ratings.length;
}

function getRatingColor(value: number) {
  const clamped = Math.max(0, Math.min(5, value));
  const hue = Math.round((clamped / 5) * 120);
  return `hsl(${hue} 78% 43%)`;
}

function App() {
  const [user, setUser] = useState<User | null>(() => loadSession());
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [pins, setPins] = useState<FishingPin[]>(() => loadPins());
  const [selectedPinId, setSelectedPinId] = useState<string | null>(pins[0]?.id ?? null);
  const [draftLocation, setDraftLocation] = useState<DraftLocation | null>(null);
  const [view, setView] = useState<"map" | "admin">("map");
  const [databaseStatus, setDatabaseStatus] = useState(isSupabaseConfigured ? "Connecting to Supabase..." : "Local cache");

  useEffect(() => {
    let cancelled = false;
    loadAppData()
      .then(({ pins: nextPins, users: nextUsers, source }) => {
        if (cancelled) return;
        setPins(nextPins);
        setUsers(nextUsers);
        setSelectedPinId((current) => current ?? nextPins[0]?.id ?? null);
        setDatabaseStatus(source === "supabase" ? "Supabase connected" : "Local cache");
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setDatabaseStatus("Local cache");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function persistPins(nextPins: FishingPin[]) {
    setPins(nextPins);
    savePins(nextPins);
    saveRemotePins(nextPins).catch((error) => {
      console.error(error);
      setDatabaseStatus("Supabase sync failed");
    });
  }

  function persistUsers(nextUsers: User[]) {
    setUsers(nextUsers);
    saveUsers(nextUsers);
    saveRemoteUsers(nextUsers).catch((error) => {
      console.error(error);
      setDatabaseStatus("Supabase sync failed");
    });
  }

  function handleLogin(nextUser: User) {
    setUser(nextUser);
    saveSession(nextUser);
    const existing = users.some((item) => item.email === nextUser.email);
    if (!existing) persistUsers([nextUser, ...users]);
  }

  function handleLogout() {
    setUser(null);
    saveSession(null);
    setView("map");
  }

  function handleAddPin(pin: FishingPin) {
    const nextPins = [pin, ...pins];
    persistPins(nextPins);
    setSelectedPinId(pin.id);
    setDraftLocation(null);
  }

  function handleUpdatePin(updatedPin: FishingPin) {
    persistPins(pins.map((pin) => (pin.id === updatedPin.id ? updatedPin : pin)));
  }

  function handleDeletePin(id: string) {
    const nextPins = pins.filter((pin) => pin.id !== id);
    persistPins(nextPins);
    deleteRemotePin(id).catch((error) => {
      console.error(error);
      setDatabaseStatus("Supabase sync failed");
    });
    setSelectedPinId(nextPins[0]?.id ?? null);
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">NCR fishing tracker</p>
          <h1>Tilapia Spots</h1>
        </div>
        <nav className="nav-actions" aria-label="Primary">
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Map</button>
          {user.role === "admin" && (
            <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>Admin</button>
          )}
          <span className="user-pill">{user.role === "admin" ? "Admin" : "User"}: {user.name}</span>
          <span className="user-pill">{databaseStatus}</span>
          <button onClick={handleLogout}>Log out</button>
        </nav>
      </header>

      {view === "admin" && user.role === "admin" ? (
        <AdminPanel
          pins={pins}
          users={users}
          currentUser={user}
          onDeletePin={handleDeletePin}
          onDeleteUser={(email) => {
            deleteRemoteUser(email).catch((error) => {
              console.error(error);
              setDatabaseStatus("Supabase sync failed");
            });
          }}
          onUserChange={handleLogin}
          onUsersChange={persistUsers}
        />
      ) : (
        <MapDashboard
          draftLocation={draftLocation}
          pins={pins}
          selectedPinId={selectedPinId}
          user={user}
          onAddPin={handleAddPin}
          onDraftLocation={setDraftLocation}
          onSelectPin={setSelectedPinId}
          onUpdatePin={handleUpdatePin}
        />
      )}
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      onLogin(signIn(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <p className="eyebrow">Private NCR fishing log</p>
        <h1>Sign in to explore the NCR map</h1>
        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="At least 4 characters" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="primary-button">Sign in</button>
        </form>
        <div className="demo-box">
          <strong>Admin demo</strong>
          <span>{demoAdmin.email} / {demoAdmin.password}</span>
        </div>
      </section>
    </main>
  );
}

function MapDashboard({
  draftLocation,
  pins,
  selectedPinId,
  user,
  onAddPin,
  onDraftLocation,
  onSelectPin,
  onUpdatePin,
}: {
  draftLocation: DraftLocation | null;
  pins: FishingPin[];
  selectedPinId: string | null;
  user: User;
  onAddPin: (pin: FishingPin) => void;
  onDraftLocation: (location: DraftLocation | null) => void;
  onSelectPin: (id: string) => void;
  onUpdatePin: (pin: FishingPin) => void;
}) {
  const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? null;

  const cityCounts = useMemo(() => {
    return ncrCities.map((city) => ({
      city,
      count: pins.filter((pin) => pin.city === city).length,
    }));
  }, [pins]);

  return (
    <main className={`map-workspace ${selectedPin ? "panel-open" : ""}`}>
      <SpotDrawer pin={selectedPin} user={user} onClose={() => onSelectPin("")} onUpdatePin={onUpdatePin} />

      <section className="map-section full-map" aria-label="NCR fishing map">
        <div className="map-toolbar">
          <div>
            <p className="eyebrow">National Capital Region</p>
            <h2>OpenFreeMap NCR fishing map</h2>
          </div>
          <div className="rating-key">
            <span className="key red" /> 0
            <span className="key yellow" /> 2.5
            <span className="key green" /> 5
          </div>
        </div>
        <OpenFreeMapView
          draftLocation={draftLocation}
          pins={pins}
          selectedPinId={selectedPin?.id ?? null}
          onDraftLocation={onDraftLocation}
          onSelectPin={onSelectPin}
        />
      </section>

      <aside className="right-tools">
        <PinForm draftLocation={draftLocation} user={user} onAddPin={onAddPin} />
        <section className="city-list">
          <h2>Coverage</h2>
          {cityCounts.map((item) => (
            <div key={item.city} className="city-row">
              <span>{item.city}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </section>
      </aside>
    </main>
  );
}

function OpenFreeMapView({
  draftLocation,
  pins,
  selectedPinId,
  onDraftLocation,
  onSelectPin,
}: {
  draftLocation: DraftLocation | null;
  pins: FishingPin[];
  selectedPinId: string | null;
  onDraftLocation: (location: DraftLocation | null) => void;
  onSelectPin: (id: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const draftMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: openFreeMapStyle,
      center: ncrCenter,
      zoom: 9.2,
      maxBounds: [
        [-76.25, 45.12],
        [-75.15, 45.72],
      ],
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.on("click", (event) => {
      onDraftLocation({ longitude: event.lngLat.lng, latitude: event.lngLat.lat });
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      draftMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [onDraftLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = pins.map((pin) => {
      const average = getAverageRating(pin);
      const element = document.createElement("button");
      element.className = `map-pin real-map-pin ${pin.id === selectedPinId ? "selected" : ""}`;
      element.style.setProperty("--pin-color", getRatingColor(average));
      element.title = `${pin.spotName}: ${average.toFixed(1)} stars`;
      element.type = "button";
      element.innerHTML = "<span></span>";
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectPin(pin.id);
        map.flyTo({ center: [pin.longitude, pin.latitude], zoom: Math.max(map.getZoom(), 11), speed: 0.8 });
      });
      return new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
    });
  }, [onSelectPin, pins, selectedPinId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    draftMarkerRef.current?.remove();
    draftMarkerRef.current = null;
    if (!draftLocation) return;

    const element = document.createElement("div");
    element.className = "draft-pin real-draft-pin";
    element.textContent = "New";
    draftMarkerRef.current = new maplibregl.Marker({ element, anchor: "bottom" })
      .setLngLat([draftLocation.longitude, draftLocation.latitude])
      .addTo(map);
  }, [draftLocation]);

  return (
    <div className="openfreemap-shell">
      <div ref={mapContainerRef} className="openfreemap-map" />
      <div className="map-help">Pan and zoom the NCR. Click the map to choose where the next observation pin will drop.</div>
    </div>
  );
}

function SpotDrawer({
  pin,
  user,
  onClose,
  onUpdatePin,
}: {
  pin: FishingPin | null;
  user: User;
  onClose: () => void;
  onUpdatePin: (pin: FishingPin) => void;
}) {
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const average = pin ? getAverageRating(pin) : 0;

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pin || !comment.trim()) return;
    const nextComment: Comment = {
      id: crypto.randomUUID(),
      author: user.email,
      body: comment.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onUpdatePin({ ...pin, comments: [nextComment, ...pin.comments] });
    setComment("");
  }

  function submitRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pin) return;
    const nextRatings = pin.ratings.filter((item) => item.userEmail !== user.email);
    const nextRating: Rating = { id: crypto.randomUUID(), userEmail: user.email, value: Number(rating) };
    onUpdatePin({ ...pin, ratings: [nextRating, ...nextRatings] });
  }

  return (
    <aside className={`spot-drawer ${pin ? "open" : ""}`} aria-hidden={!pin}>
      {pin && (
        <>
          <button className="drawer-close" onClick={onClose}>Close</button>
          <p className="eyebrow">{pin.city} - {pin.waterbody}</p>
          <h2>{pin.spotName}</h2>
          <div className="rating-summary">
            <strong>{average.toFixed(1)}</strong>
            <span>average rating from {pin.ratings.length} vote{pin.ratings.length === 1 ? "" : "s"}</span>
          </div>
          <p className="fish-list">{pin.fishCaught}</p>
          <p>{pin.notes || "No notes yet."}</p>
          <time dateTime={pin.caughtAt}>Observed on {pin.caughtAt}</time>

          <section className="gallery">
            <h3>Image gallery</h3>
            {pin.photos.length ? (
              <div className="photo-grid">
                {pin.photos.map((photo) => (
                  <figure key={photo.id}>
                    <img src={photo.src} alt={photo.caption || pin.spotName} />
                    <figcaption>{photo.caption}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="empty-note">No pictures yet.</p>
            )}
          </section>

          <form className="compact-form" onSubmit={submitRating}>
            <label>
              Your rating
              <input min="0" max="5" step="1" type="range" value={rating} onChange={(event) => setRating(Number(event.target.value))} />
            </label>
            <button className="primary-button" type="submit">Rate {rating}/5</button>
          </form>

          <form className="compact-form" onSubmit={submitComment}>
            <label>
              Add comment
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share access notes, fish activity, bait, or conditions..." />
            </label>
            <button className="primary-button" type="submit">Post comment</button>
          </form>

          <section className="comments-list">
            <h3>Comments</h3>
            {pin.comments.length ? pin.comments.map((item) => (
              <article key={item.id} className="comment-card">
                <strong>{item.author}</strong>
                <p>{item.body}</p>
                <time dateTime={item.createdAt}>{item.createdAt}</time>
              </article>
            )) : <p className="empty-note">No comments yet.</p>}
          </section>
        </>
      )}
    </aside>
  );
}

function PinForm({
  draftLocation,
  user,
  onAddPin,
}: {
  draftLocation: DraftLocation | null;
  user: User;
  onAddPin: (pin: FishingPin) => void;
}) {
  const [spotName, setSpotName] = useState("");
  const [waterbody, setWaterbody] = useState("");
  const [city, setCity] = useState(ncrCities[0]);
  const [fishCaught, setFishCaught] = useState("");
  const [notes, setNotes] = useState("");
  const [caughtAt, setCaughtAt] = useState(new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState(5);
  const [photos, setPhotos] = useState<PinPhoto[]>([]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!spotName || !waterbody || !fishCaught) return;

    onAddPin({
      id: crypto.randomUUID(),
      spotName,
      waterbody,
      city,
      fishCaught,
      notes,
      caughtAt,
      x: 50,
      y: 50,
      longitude: draftLocation?.longitude ?? ncrCenter[0],
      latitude: draftLocation?.latitude ?? ncrCenter[1],
      createdBy: user.email,
      ratings: [{ id: crypto.randomUUID(), userEmail: user.email, value: Number(rating) }],
      comments: notes ? [{ id: crypto.randomUUID(), author: user.email, body: notes, createdAt: caughtAt }] : [],
      photos,
    });

    setSpotName("");
    setWaterbody("");
    setFishCaught("");
    setNotes("");
    setPhotos([]);
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    Array.from(files).slice(0, 4).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((current) => [
          ...current,
          { id: crypto.randomUUID(), src: String(reader.result), caption: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }

  return (
    <form className="pin-form" onSubmit={submit}>
      <h2>Add observed zone</h2>
      <p className="hint">{draftLocation ? "Using the pin location you selected on the map." : "Click the map to choose a location, or save at map center."}</p>
      <label>
        Spot name
        <input value={spotName} onChange={(event) => setSpotName(event.target.value)} placeholder="Example: Shirley's Bay" />
      </label>
      <label>
        Waterbody
        <input value={waterbody} onChange={(event) => setWaterbody(event.target.value)} placeholder="Ottawa River, Rideau River..." />
      </label>
      <div className="form-pair">
        <label>
          City
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            {ncrCities.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Date
          <input value={caughtAt} onChange={(event) => setCaughtAt(event.target.value)} type="date" />
        </label>
      </div>
      <label>
        Fish caught
        <input value={fishCaught} onChange={(event) => setFishCaught(event.target.value)} placeholder="Bass, pike, walleye..." />
      </label>
      <label>
        Rating: {rating}/5
        <input min="0" max="5" step="1" type="range" value={rating} onChange={(event) => setRating(Number(event.target.value))} />
      </label>
      <label>
        Picture
        <input accept="image/*" multiple type="file" onChange={(event) => addPhotos(event.target.files)} />
      </label>
      {photos.length > 0 && <div className="upload-strip">{photos.map((photo) => <img key={photo.id} src={photo.src} alt={photo.caption} />)}</div>}
      <label>
        Comment / notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Access, bait, weather, conditions..." />
      </label>
      <button type="submit" className="primary-button">Drop observation pin</button>
    </form>
  );
}

function AdminPanel({
  currentUser,
  pins,
  users,
  onDeletePin,
  onDeleteUser,
  onUserChange,
  onUsersChange,
}: {
  currentUser: User;
  pins: FishingPin[];
  users: User[];
  onDeletePin: (id: string) => void;
  onDeleteUser: (email: string) => void;
  onUserChange: (user: User) => void;
  onUsersChange: (users: User[]) => void;
}) {
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubStatus, setGithubStatus] = useState(currentUser.githubConnected ? "Connected" : "Not connected");

  function connectGithub() {
    const nextUser = { ...currentUser, githubConnected: true };
    setGithubStatus(githubOwner && githubRepo ? `Connected to ${githubOwner}/${githubRepo}` : "Connected locally");
    onUserChange(nextUser);
    onUsersChange(users.map((user) => (user.email === nextUser.email ? nextUser : user)));
  }

  function toggleStatus(target: User) {
    if (target.email === currentUser.email) return;
    onUsersChange(users.map((user) => (
      user.email === target.email ? { ...user, status: user.status === "active" ? "suspended" : "active" } : user
    )));
  }

  function toggleRole(target: User) {
    if (target.email === currentUser.email) return;
    onUsersChange(users.map((user) => (
      user.email === target.email ? { ...user, role: user.role === "admin" ? "user" : "admin" } : user
    )));
  }

  function removeUser(target: User) {
    if (target.email === currentUser.email) return;
    onUsersChange(users.filter((user) => user.email !== target.email));
    onDeleteUser(target.email);
  }

  const latest = [...pins].sort((a, b) => b.caughtAt.localeCompare(a.caughtAt))[0];
  const averageRating = pins.length ? pins.reduce((sum, pin) => sum + getAverageRating(pin), 0) / pins.length : 0;

  return (
    <main className="admin-grid">
      <section className="admin-hero">
        <p className="eyebrow">Admin dashboard</p>
        <h2>Manage NCR fishing reports and users</h2>
        <div className="stat-row">
          <div><strong>{pins.length}</strong><span>Total pins</span></div>
          <div><strong>{users.length}</strong><span>Users</span></div>
          <div><strong>{averageRating.toFixed(1)}</strong><span>Average spot rating</span></div>
          <div><strong>{latest?.caughtAt ?? "None"}</strong><span>Latest catch</span></div>
        </div>
      </section>

      <section className="github-card">
        <h2>GitHub connection</h2>
        <p>Use this panel to wire exports, issues, or OAuth in the next backend pass.</p>
        <div className="form-pair">
          <label>
            Owner
            <input value={githubOwner} onChange={(event) => setGithubOwner(event.target.value)} placeholder="IanBedard" />
          </label>
          <label>
            Repo
            <input value={githubRepo} onChange={(event) => setGithubRepo(event.target.value)} placeholder="Tilapia" />
          </label>
        </div>
        <button className="primary-button" onClick={connectGithub}>Connect GitHub</button>
        <span className="status-line">{githubStatus}</span>
      </section>

      <section className="table-card">
        <h2>Manage users</h2>
        <div className="reports-list">
          {users.map((item) => (
            <article key={item.email} className="report-row user-row">
              <div>
                <strong>{item.name}</strong>
                <span>{item.email} - {item.role} - {item.status}</span>
              </div>
              <div className="row-actions">
                <button disabled={item.email === currentUser.email} onClick={() => toggleRole(item)}>Role</button>
                <button disabled={item.email === currentUser.email} onClick={() => toggleStatus(item)}>
                  {item.status === "active" ? "Suspend" : "Activate"}
                </button>
                <button disabled={item.email === currentUser.email} onClick={() => removeUser(item)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="table-card">
        <h2>Fishing reports</h2>
        <div className="reports-list">
          {pins.map((pin) => (
            <article key={pin.id} className="report-row">
              <div>
                <strong>{pin.spotName}</strong>
                <span>{pin.city} - {getAverageRating(pin).toFixed(1)}/5 - {pin.createdBy}</span>
              </div>
              <button onClick={() => onDeletePin(pin.id)}>Delete</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
