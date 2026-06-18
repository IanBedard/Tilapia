import { FormEvent, useMemo, useState } from "react";
import { demoAdmin, signIn } from "./auth";
import { loadPins, loadSession, savePins, saveSession } from "./storage";
import type { FishingPin, User } from "./types";

const ncrCities = ["Ottawa", "Gatineau", "Orleans", "Kanata", "Nepean", "Chelsea", "Aylmer"];

function App() {
  const [user, setUser] = useState<User | null>(() => loadSession());
  const [pins, setPins] = useState<FishingPin[]>(() => loadPins());
  const [selectedPinId, setSelectedPinId] = useState<string | null>(pins[0]?.id ?? null);
  const [view, setView] = useState<"map" | "admin">("map");

  function handleLogin(nextUser: User) {
    setUser(nextUser);
    saveSession(nextUser);
  }

  function handleLogout() {
    setUser(null);
    saveSession(null);
    setView("map");
  }

  function handleAddPin(pin: FishingPin) {
    const nextPins = [pin, ...pins];
    setPins(nextPins);
    savePins(nextPins);
    setSelectedPinId(pin.id);
  }

  function handleDeletePin(id: string) {
    const nextPins = pins.filter((pin) => pin.id !== id);
    setPins(nextPins);
    savePins(nextPins);
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
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>
            Map
          </button>
          {user.role === "admin" && (
            <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
              Admin
            </button>
          )}
          <span className="user-pill">{user.role === "admin" ? "Admin" : "User"}: {user.name}</span>
          <button onClick={handleLogout}>Log out</button>
        </nav>
      </header>

      {view === "admin" && user.role === "admin" ? (
        <AdminPanel pins={pins} user={user} onDeletePin={handleDeletePin} onUserChange={handleLogin} />
      ) : (
        <MapDashboard
          pins={pins}
          selectedPinId={selectedPinId}
          user={user}
          onAddPin={handleAddPin}
          onSelectPin={setSelectedPinId}
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
        <h1>Sign in to map fishing spots</h1>
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
  pins,
  selectedPinId,
  user,
  onAddPin,
  onSelectPin,
}: {
  pins: FishingPin[];
  selectedPinId: string | null;
  user: User;
  onAddPin: (pin: FishingPin) => void;
  onSelectPin: (id: string) => void;
}) {
  const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? pins[0];
  const cityCounts = useMemo(() => {
    return ncrCities.map((city) => ({
      city,
      count: pins.filter((pin) => pin.city === city).length,
    }));
  }, [pins]);

  return (
    <main className="dashboard-grid">
      <section className="map-section" aria-label="NCR fishing map">
        <div className="map-toolbar">
          <div>
            <p className="eyebrow">National Capital Region</p>
            <h2>Fishing zones map</h2>
          </div>
          <span>{pins.length} saved spots</span>
        </div>
        <div className="ncr-map">
          <div className="river river-ottawa" />
          <div className="river river-rideau" />
          <span className="map-label ottawa">Ottawa</span>
          <span className="map-label gatineau">Gatineau</span>
          <span className="map-label kanata">Kanata</span>
          <span className="map-label orleans">Orleans</span>
          {pins.map((pin) => (
            <button
              key={pin.id}
              className={`map-pin ${pin.id === selectedPin?.id ? "selected" : ""}`}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              onClick={() => onSelectPin(pin.id)}
              title={`${pin.spotName}: ${pin.fishCaught}`}
            >
              <span />
            </button>
          ))}
        </div>
      </section>

      <aside className="side-panel">
        {selectedPin && (
          <article className="spot-card">
            <p className="eyebrow">{selectedPin.city} - {selectedPin.waterbody}</p>
            <h2>{selectedPin.spotName}</h2>
            <p className="fish-list">{selectedPin.fishCaught}</p>
            <p>{selectedPin.notes}</p>
            <time dateTime={selectedPin.caughtAt}>Caught on {selectedPin.caughtAt}</time>
          </article>
        )}
        <PinForm user={user} onAddPin={onAddPin} />
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

function PinForm({ user, onAddPin }: { user: User; onAddPin: (pin: FishingPin) => void }) {
  const [spotName, setSpotName] = useState("");
  const [waterbody, setWaterbody] = useState("");
  const [city, setCity] = useState(ncrCities[0]);
  const [fishCaught, setFishCaught] = useState("");
  const [notes, setNotes] = useState("");
  const [caughtAt, setCaughtAt] = useState(new Date().toISOString().slice(0, 10));

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
      x: 18 + Math.random() * 64,
      y: 22 + Math.random() * 54,
      createdBy: user.email,
    });

    setSpotName("");
    setWaterbody("");
    setFishCaught("");
    setNotes("");
  }

  return (
    <form className="pin-form" onSubmit={submit}>
      <h2>Add fishing zone</h2>
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
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Access, bait, weather, conditions..." />
      </label>
      <button type="submit" className="primary-button">Drop pin</button>
    </form>
  );
}

function AdminPanel({
  pins,
  user,
  onDeletePin,
  onUserChange,
}: {
  pins: FishingPin[];
  user: User;
  onDeletePin: (id: string) => void;
  onUserChange: (user: User) => void;
}) {
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubStatus, setGithubStatus] = useState(user.githubConnected ? "Connected" : "Not connected");

  function connectGithub() {
    const nextUser = { ...user, githubConnected: true };
    setGithubStatus(githubOwner && githubRepo ? `Connected to ${githubOwner}/${githubRepo}` : "Connected locally");
    onUserChange(nextUser);
  }

  const latest = [...pins].sort((a, b) => b.caughtAt.localeCompare(a.caughtAt))[0];

  return (
    <main className="admin-grid">
      <section className="admin-hero">
        <p className="eyebrow">Admin panel</p>
        <h2>Manage NCR fishing reports</h2>
        <div className="stat-row">
          <div><strong>{pins.length}</strong><span>Total pins</span></div>
          <div><strong>{new Set(pins.map((pin) => pin.createdBy)).size}</strong><span>Contributors</span></div>
          <div><strong>{latest?.caughtAt ?? "None"}</strong><span>Latest catch</span></div>
        </div>
      </section>

      <section className="github-card">
        <h2>GitHub connection</h2>
        <p>Use this starter panel to wire a GitHub repo for issues, exports, or OAuth later.</p>
        <div className="form-pair">
          <label>
            Owner
            <input value={githubOwner} onChange={(event) => setGithubOwner(event.target.value)} placeholder="github-org" />
          </label>
          <label>
            Repo
            <input value={githubRepo} onChange={(event) => setGithubRepo(event.target.value)} placeholder="fishing-spots" />
          </label>
        </div>
        <button className="primary-button" onClick={connectGithub}>Connect GitHub</button>
        <span className="status-line">{githubStatus}</span>
      </section>

      <section className="table-card">
        <h2>Fishing reports</h2>
        <div className="reports-list">
          {pins.map((pin) => (
            <article key={pin.id} className="report-row">
              <div>
                <strong>{pin.spotName}</strong>
                <span>{pin.city} - {pin.fishCaught} - {pin.createdBy}</span>
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
