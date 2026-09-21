import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Calendar,
  Info,
  Camera,
  Activity,
  Map,
  Sliders,
  BookOpen,
  Send,
  Bell,
  Search,
  Award,
  Eye,
  Share2,
  Sun,
  ChevronRight,
  UploadCloud,
  Settings,
  Sparkles,
  Zap
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, addDoc, query, serverTimestamp } from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'sky-tracker-40';
let db = null;
let auth = null;

try {
  if (typeof __firebase_config !== 'undefined') {
    const firebaseConfig = JSON.parse(__firebase_config);
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error('Firebase Initialization failed, using local fallback state', e);
}

const LOCAL_ASTRONOMICAL_EVENTS = [
  {
    id: 'evt-1',
    title: 'Perseids Meteor Shower Peak',
    date: '2026-08-12',
    type: 'Meteor Shower',
    azimuth: '45° NE',
    altitude: '35°',
    speed: '59 km/s',
    composition: 'Comet Swift-Tuttle debris (Silicate/Sodium)',
    color: '#a5f3fc'
  },
  {
    id: 'evt-2',
    title: 'Total Lunar Eclipse',
    date: '2026-09-03',
    type: 'Eclipse',
    azimuth: '180° S',
    altitude: '50°',
    speed: '1.02 km/s orbital',
    composition: 'Earth shadow scattering blue light (Copper red)',
    color: '#ef4444'
  },
  {
    id: 'evt-3',
    title: 'Conjunction of Venus and Jupiter',
    date: '2026-10-15',
    type: 'Conjunction',
    azimuth: '270° W',
    altitude: '20°',
    speed: 'N/A',
    composition: 'Atmospheric light reflection',
    color: '#fef08a'
  }
];

const tabs = [
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'reality', label: 'Reality', icon: Activity },
  { id: 'lab', label: 'Observer Lab', icon: Sliders },
  { id: 'community', label: 'Community', icon: Camera }
];

const formatTabTitle = (tab) => {
  switch (tab) {
    case 'calendar':
      return 'Sky Calendar';
    case 'reality':
      return 'Reality Simulation';
    case 'lab':
      return 'Observer Lab';
    case 'community':
      return 'Citizen Sky Map';
    default:
      return 'Overview';
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [user, setUser] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(LOCAL_ASTRONOMICAL_EVENTS[0]);
  const [countdownStr, setCountdownStr] = useState('');
  const [latitude, setLatitude] = useState('11.72');
  const [longitude, setLongitude] = useState('77.35');
  const [azimuthBearing, setAzimuthBearing] = useState(45);
  const [altitudeBearing, setAltitudeBearing] = useState(35);

  const [kpIndex, setKpIndex] = useState(4.2);
  const [solarWind, setSolarWind] = useState(412);
  const [auroraProbability, setAuroraProbability] = useState(15);
  const [apodData, setApodData] = useState(null);
  const [apodLoading, setApodLoading] = useState(true);

  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [massValue, setMassValue] = useState(3.5);
  const [rayCount, setRayCount] = useState(12);

  const [lensType, setLensType] = useState('convex');
  const [focalLength, setFocalLength] = useState(120);

  const [galleryPosts, setGalleryPosts] = useState([]);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const starMapCanvasRef = useRef(null);
  const physicsCanvasRef = useRef(null);
  const opticsCanvasRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: '🚀 ISS Overpass in 15m',
      body: 'Magnitude -3.5. Visible heading West to South-East.',
      time: 'Just now'
    }
  ]);

  useEffect(() => {
    if (!auth) return;

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Authentication Error', err);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'gallery');

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const posts = [];
        snapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() });
        });
        setGalleryPosts(posts.sort((a, b) => b.timestamp - a.timestamp));
      },
      (err) => {
        console.error('Firestore loading error:', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const fetchAPOD = async () => {
      setApodLoading(true);
      try {
        const response = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
        if (response.ok) {
          const data = await response.json();
          setApodData(data);
        } else {
          throw new Error();
        }
      } catch {
        setApodData({
          title: 'The Pillars of Creation Captured by JWST',
          explanation:
            'This near-infrared view from NASA’s James Webb Space Telescope reveals new details about the dust and gas in this iconic star-forming region. Stars appear as bright red orbs with diffraction spikes.',
          url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80',
          copyright: 'NASA, ESA, CSA'
        });
      } finally {
        setApodLoading(false);
      }
    };

    fetchAPOD();
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      if (!selectedEvent) return;
      const targetTime = new Date(`${selectedEvent.date}T00:00:00`).getTime();
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setCountdownStr('Event is live right now! Look up!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownStr(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedEvent]);

  useEffect(() => {
    if (activeTab !== 'lab') return;
    const canvas = starMapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let angle = 0;

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random() * 2 - 1,
      radius: Math.random() * 1.5 + 0.5,
      color: ['#ffffff', '#a5f3fc', '#fef08a', '#fca5a5'][Math.floor(Math.random() * 4)]
    }));

    const constellations = [
      { name: 'Ursa Major (Big Dipper)', links: [[0, 5], [5, 12], [12, 18], [18, 25]] },
      { name: 'Orion', links: [[30, 35], [35, 40], [40, 45], [45, 30]] }
    ];

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, (width / 5) * r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(width / 2, 20);
      ctx.lineTo(width / 2, height - 20);
      ctx.moveTo(20, height / 2);
      ctx.lineTo(width / 2 * 2 - 20, height / 2);
      ctx.stroke();

      angle += 0.002 * simulationSpeed;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const projected = stars.map((star) => {
        const rx = star.x * cosA - star.z * sinA;
        const rz = star.x * sinA + star.z * cosA;
        const ry = star.y;

        const zoomFactor = 1.3;
        const screenX = (rx / (rz + 2)) * width * zoomFactor + width / 2;
        const screenY = (ry / (rz + 2)) * height * zoomFactor + height / 2;

        return { x: screenX, y: screenY, z: rz, r: star.radius, color: star.color };
      });

      projected.forEach((p) => {
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) return;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.z < 0 ? 8 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1.5 - p.z), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 1.5;
      constellations.forEach((c) => {
        c.links.forEach(([from, to]) => {
          const ptA = projected[from % projected.length];
          const ptB = projected[to % projected.length];
          ctx.beginPath();
          ctx.moveTo(ptA.x, ptA.y);
          ctx.lineTo(ptB.x, ptB.y);
          ctx.stroke();
        });
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [activeTab, simulationSpeed]);

  useEffect(() => {
    if (activeTab !== 'reality') return;
    const canvas = physicsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;

    const drawPhysics = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2;
      const schwarzschildRadius = massValue * 15;

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        schwarzschildRadius / 3,
        centerX,
        centerY,
        schwarzschildRadius * 2
      );
      gradient.addColorStop(0, '#000000');
      gradient.addColorStop(0.3, '#020617');
      gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.2)');
      gradient.addColorStop(0.7, 'rgba(234, 179, 8, 0.1)');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, schwarzschildRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      time += 0.05 * simulationSpeed;
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        schwarzschildRadius * 2.5,
        schwarzschildRadius * 0.6,
        Math.PI / 12 + Math.sin(time * 0.1) * 0.05,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      ctx.lineWidth = 1.5;
      for (let i = 0; i < rayCount; i++) {
        const startY = (h / rayCount) * i + h / (rayCount * 2);
        let rx = 10;
        let ry = startY;
        let vx = 4;
        let vy = 0;

        ctx.strokeStyle = 'rgba(165, 243, 252, 0.6)';
        ctx.beginPath();
        ctx.moveTo(rx, ry);

        for (let step = 0; step < 150; step++) {
          const dx = centerX - rx;
          const dy = centerY - ry;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist < schwarzschildRadius) {
            ctx.lineTo(rx, ry);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
            break;
          }

          const force = (massValue * 250) / (distSq * dist);
          vx += (dx / dist) * force;
          vy += (dy / dist) * force;

          const vMag = Math.sqrt(vx * vx + vy * vy);
          vx = (vx / vMag) * 5;
          vy = (vy / vMag) * 5;

          rx += vx;
          ry += vy;

          ctx.lineTo(rx, ry);

          if (rx > w || ry < 0 || ry > h) break;
        }
        ctx.stroke();
      }

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX, centerY, schwarzschildRadius, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(drawPhysics);
    };

    drawPhysics();
    return () => cancelAnimationFrame(animId);
  }, [activeTab, massValue, rayCount, simulationSpeed]);

  useEffect(() => {
    if (activeTab !== 'lab') return;
    const canvas = opticsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const drawOptics = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2;

      ctx.strokeStyle = '#334155';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(10, centerY);
      ctx.lineTo(w - 10, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#6366f1';
      ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
      ctx.lineWidth = 3;

      if (lensType === 'convex') {
        ctx.beginPath();
        ctx.arc(centerX - 80, centerY, 120, -Math.PI / 4, Math.PI / 4);
        ctx.arc(centerX + 80, centerY, 120, Math.PI * 0.75, Math.PI * 1.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (lensType === 'concave') {
        ctx.beginPath();
        ctx.moveTo(centerX - 25, centerY - 60);
        ctx.lineTo(centerX + 25, centerY - 60);
        ctx.quadraticCurveTo(centerX, centerY, centerX + 25, centerY + 60);
        ctx.lineTo(centerX - 25, centerY + 60);
        ctx.quadraticCurveTo(centerX, centerY, centerX - 25, centerY - 60);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(centerX + 120, centerY, 100, Math.PI * 0.8, Math.PI * 1.2);
        ctx.stroke();
      }

      ctx.lineWidth = 1.5;
      const rayStartYs = [centerY - 40, centerY - 20, centerY, centerY + 20, centerY + 40];

      rayStartYs.forEach((startY) => {
        ctx.strokeStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(20, startY);

        if (lensType === 'convex') {
          ctx.lineTo(centerX, startY);
          const fPointX = centerX + focalLength;
          ctx.lineTo(fPointX, centerY);
          ctx.lineTo(w - 20, centerY + (centerY - startY) * 1.5);
        } else if (lensType === 'concave') {
          ctx.lineTo(centerX, startY);
          const fPointX = centerX - focalLength;
          const angle = Math.atan2(startY - centerY, centerX - fPointX);
          ctx.lineTo(w - 20, startY + Math.tan(angle) * (w - 20 - centerX));
        } else {
          const mirrorSurfaceX = centerX + 120 - Math.sqrt(10000 - Math.pow(startY - centerY, 2));
          ctx.lineTo(mirrorSurfaceX, startY);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineTo(centerX - 50, centerY + (centerY - startY) * 0.8);
        }
        ctx.stroke();
      });

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${lensType.toUpperCase()} LENS ELEMENT`, centerX - 55, centerY - 80);
      if (lensType !== 'mirror') {
        ctx.fillText(`Focal Point f ≈ ${focalLength}mm`, centerX + 40, centerY + 80);
      }
    };

    drawOptics();
  }, [activeTab, lensType, focalLength]);

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!newPhotoTitle || !newPhotoUrl) return;

    setIsUploading(true);
    try {
      if (db && user) {
        const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'gallery');
        await addDoc(collectionRef, {
          title: newPhotoTitle,
          imageUrl: newPhotoUrl,
          author: user.uid,
          authorName: `AstronomyObserver_${user.uid.slice(0, 5)}`,
          timestamp: Date.now(),
          likes: 0,
          lat: parseFloat(latitude) + (Math.random() - 0.5) * 0.1,
          lng: parseFloat(longitude) + (Math.random() - 0.5) * 0.1
        });
      } else {
        const localPost = {
          id: `local-${Date.now()}`,
          title: newPhotoTitle,
          imageUrl: newPhotoUrl,
          authorName: 'LocalStargazer',
          timestamp: Date.now(),
          likes: 3,
          lat: parseFloat(latitude),
          lng: parseFloat(longitude)
        };
        setGalleryPosts((prev) => [localPost, ...prev]);
      }
      setNewPhotoTitle('');
      setNewPhotoUrl('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const eventMetrics = [
    { label: 'Kp', value: kpIndex.toFixed(1), icon: Activity },
    { label: 'Solar Wind', value: `${solarWind} km/s`, icon: Sun },
    { label: 'Aurora', value: `${auroraProbability}%`, icon: Sparkles },
    { label: 'Tracking', value: 'Live', icon: Compass }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-emerald-800/70 bg-gradient-to-r from-emerald-950 via-teal-900 to-indigo-950 px-4 py-2 text-xs text-emerald-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold text-emerald-300">Space Weather Status:</span>
            <span>Aurora forecasts index Kp: {kpIndex} • Solar flare radiation is Normal</span>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <span className="font-mono text-indigo-300">ISS Lat/Long: {latitude}° N, {longitude}° E</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-900/80 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 p-2.5 text-lg font-extrabold tracking-widest text-white shadow-lg shadow-indigo-500/20">
              ST-40
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-50">Sky Tracker 40</div>
              <div className="text-xs text-slate-400">Orbital observer dashboard</div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 p-1.5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${
                  activeTab === id
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" className="rounded-full border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-500">
              <Search size={16} />
            </button>
            <button type="button" className="rounded-full border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-500">
              <Bell size={16} />
            </button>
            <button type="button" className="rounded-full border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-500">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="mb-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="glass-panel grid-glow rounded-3xl p-5 shadow-2xl shadow-slate-950/50">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  <Compass size={12} />
                  Next celestial event
                </div>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">{selectedEvent.title}</h1>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800/75 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Countdown</div>
                <div className="mt-1 text-lg font-semibold text-emerald-300">{countdownStr || 'Loading...'}</div>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Type</div>
                <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
                  {selectedEvent.type}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Azimuth</div>
                <div className="mt-2 text-lg font-semibold text-white">{selectedEvent.azimuth}</div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Altitude</div>
                <div className="mt-2 text-lg font-semibold text-white">{selectedEvent.altitude}</div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Map size={16} className="text-sky-400" />
                    Observation window
                  </div>
                  <button type="button" className="text-sm text-sky-300">View map</button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-800/80 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Best visibility</div>
                    <div className="mt-2 font-semibold text-white">{selectedEvent.date}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-800/80 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Velocity</div>
                    <div className="mt-2 font-semibold text-white">{selectedEvent.speed}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-100">
                  {selectedEvent.composition}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <BookOpen size={16} className="text-violet-400" />
                  Quick guidance
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• Find a dark, open horizon away from city glow.</li>
                  <li>• Set your phone compass to {selectedEvent.azimuth}.</li>
                  <li>• Start 20 minutes before the estimated peak.</li>
                  <li>• Keep your eyes adapted for 15 minutes.</li>
                </ul>
              </div>
            </div>
          </div>

          <aside className="glass-panel rounded-3xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-indigo-300">Mission control</div>
                <h2 className="mt-1 text-xl font-semibold text-white">Field status</h2>
              </div>
              <button type="button" className="rounded-full border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-500">
                <Share2 size={15} />
              </button>
            </div>

            <div className="space-y-3">
              {eventMetrics.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Icon size={15} className="text-sky-400" />
                      <span>{label}</span>
                    </div>
                    <span className="text-base font-semibold text-white">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-200">Live alerts</div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                  Active
                </span>
              </div>

              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-xl border border-slate-700 bg-slate-800/80 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-white">{n.title}</div>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-300">{n.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="glass-panel rounded-3xl p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Eye size={15} className="text-cyan-400" />
              Visibility model
            </div>
            <div className="text-2xl font-semibold text-white">{altitudeBearing}°</div>
            <div className="mt-2 text-sm text-slate-400">Projected elevation above horizon</div>
          </div>
          <div className="glass-panel rounded-3xl p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Compass size={15} className="text-indigo-400" />
              Bearing
            </div>
            <div className="text-2xl font-semibold text-white">{azimuthBearing}°</div>
            <div className="mt-2 text-sm text-slate-400">Azimuth and target heading alignment</div>
          </div>
          <div className="glass-panel rounded-3xl p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Zap size={15} className="text-amber-400" />
              Observation score
            </div>
            <div className="text-2xl font-semibold text-white">84%</div>
            <div className="mt-2 text-sm text-slate-400">Excellent condition for light-frame optics</div>
          </div>
        </section>

        {activeTab === 'calendar' && (
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-indigo-300">Celestial timeline</div>
                  <h3 className="mt-1 text-2xl font-semibold text-white">Upcoming sky events</h3>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  {LOCAL_ASTRONOMICAL_EVENTS.length} events tracked
                </div>
              </div>

              <div className="space-y-3">
                {LOCAL_ASTRONOMICAL_EVENTS.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedEvent.id === event.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{event.type}</div>
                        <div className="mt-1 text-lg font-semibold text-white">{event.title}</div>
                      </div>
                      <div className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                        {event.date}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                      <span>{event.azimuth}</span>
                      <span>{event.altitude}</span>
                      <span>{event.speed}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
                <Award size={16} className="text-amber-400" />
                Astronomy Picture of the Day
              </div>

              {apodLoading ? (
                <div className="flex h-[370px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 text-slate-400">
                  Loading APOD...
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
                  <img src={apodData?.url} alt={apodData?.title} className="h-64 w-full object-cover" />
                  <div className="p-4">
                    <div className="text-lg font-semibold text-white">{apodData?.title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {apodData?.copyright || 'NASA'}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{apodData?.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'reality' && (
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="glass-panel rounded-3xl p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-pink-300">Scale of reality</div>
                  <h3 className="mt-1 text-2xl font-semibold text-white">Gravitational lensing model</h3>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">
                  LIVE
                </div>
              </div>
              <canvas ref={physicsCanvasRef} width={900} height={430} className="rounded-2xl border border-slate-800" />
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
                <Sliders size={16} className="text-violet-400" />
                Simulation controls
              </div>

              <div className="space-y-5">
                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>Simulation speed</span>
                    <span className="font-semibold text-white">{simulationSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>Black hole mass</span>
                    <span className="font-semibold text-white">{massValue.toFixed(1)}M☉</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.1"
                    value={massValue}
                    onChange={(e) => setMassValue(parseFloat(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>Ray count</span>
                    <span className="font-semibold text-white">{rayCount}</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="28"
                    step="1"
                    value={rayCount}
                    onChange={(e) => setRayCount(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm leading-6 text-slate-300">
                Light bending increases with gravitational mass and proximity. The simulator approximates Einstein’s curvature by tracing a photon path that accelerates toward the singularity while preserving a nearly constant local velocity.
              </div>
            </div>
          </section>
        )}

        {activeTab === 'lab' && (
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-panel rounded-3xl p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300">Observer’s Lab</div>
                  <h3 className="mt-1 text-2xl font-semibold text-white">Virtual sky map + optics</h3>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">
                  3D render
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-2">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Compass size={15} className="text-sky-400" />
                    Star map
                  </div>
                  <canvas ref={starMapCanvasRef} width={430} height={240} className="rounded-xl border border-slate-800" />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-2">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                    <BookOpen size={15} className="text-violet-400" />
                    Optics simulator
                  </div>
                  <canvas ref={opticsCanvasRef} width={430} height={240} className="rounded-xl border border-slate-800" />
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
                <Sliders size={16} className="text-cyan-400" />
                Optical controls
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-sm text-slate-300">Lens preset</div>
                  <div className="grid grid-cols-3 gap-2">
                    {['convex', 'concave', 'mirror'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setLensType(preset)}
                        className={`rounded-xl border px-3 py-2 text-sm capitalize transition ${
                          lensType === preset
                            ? 'border-indigo-500 bg-indigo-500/10 text-white'
                            : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>Focal length</span>
                    <span className="font-semibold text-white">{focalLength}mm</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="220"
                    step="10"
                    value={focalLength}
                    onChange={(e) => setFocalLength(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm leading-6 text-slate-300">
                Convex lenses bring parallel rays toward a focal point; concave lenses spread them; mirrors redirect the path back toward the eyepiece. This model helps estimate the required optical architecture for a target field of view.
              </div>
            </div>
          </section>
        )}

        {activeTab === 'community' && (
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300">Citizen sky map</div>
                  <h3 className="mt-1 text-2xl font-semibold text-white">Community images</h3>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">
                  {galleryPosts.length} posts
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {(galleryPosts.length ? galleryPosts : [
                  {
                    id: 'demo-1',
                    title: 'Milky Way Over Coimbatore',
                    imageUrl: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=900&q=80',
                    authorName: 'NightDrift',
                    likes: 11
                  },
                  {
                    id: 'demo-2',
                    title: 'Moonrise over the western horizon',
                    imageUrl: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=900&q=80',
                    authorName: 'OrbitFix',
                    likes: 8
                  },
                  {
                    id: 'demo-3',
                    title: 'Aurora domes above the cloud line',
                    imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80',
                    authorName: 'PolarChaser',
                    likes: 15
                  },
                  {
                    id: 'demo-4',
                    title: 'Slow-tracked comet tail',
                    imageUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=900&q=80',
                    authorName: 'StarTrail',
                    likes: 9
                  }
                ]).map((post) => (
                  <div key={post.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
                    <img src={post.imageUrl} alt={post.title} className="h-44 w-full object-cover" />
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-medium text-white">{post.title}</div>
                          <div className="text-xs text-slate-400">by {post.authorName}</div>
                        </div>
                        <div className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">❤ {post.likes || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
                <UploadCloud size={16} className="text-amber-400" />
                Share a new capture
              </div>

              <form onSubmit={handleUploadPhoto} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Photo title</span>
                  <input
                    type="text"
                    value={newPhotoTitle}
                    onChange={(e) => setNewPhotoTitle(e.target.value)}
                    placeholder="Moonlit valley over the observatory"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Image URL</span>
                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://example.com/astro-photo.jpg"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-300">Latitude</span>
                    <input
                      type="number"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-300">Longitude</span>
                    <input
                      type="number"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !newPhotoTitle || !newPhotoUrl}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isUploading ? 'Uploading...' : 'Upload observation'}
                  {isUploading ? <Info size={15} /> : <Send size={15} />}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Map size={15} className="text-cyan-400" />
                  Location footprint
                </div>
                <div className="text-sm text-slate-300">
                  Snapshot coordinate pinned to {latitude}° N, {longitude}° E for connected community validation.
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-indigo-300">Mission brief</div>
              <h3 className="mt-1 text-2xl font-semibold text-white">{formatTabTitle(activeTab)}</h3>
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-indigo-500/50 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200">
              Open report
              <ChevronRight size={15} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
