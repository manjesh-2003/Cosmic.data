/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Globe, Satellite, Rocket, Users, Activity, Radar, Database, RefreshCw, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { motion } from "motion/react";

// --- Types ---
interface AstronautData {
  number: number;
  message: string;
  people: { name: string; craft: string }[];
}

interface SatelliteData {
  active: number;
  inactive: number;
  debris: number;
  total: number;
  source: string;
  timestamp: number;
}

interface Launch {
  id: string;
  name: string;
  net: string; // date
  status: { name: string; description: string };
  launch_service_provider: { name: string };
  pad: { name: string; location: { name: string } };
  mission: { description: string; type: string } | null;
}

interface LaunchesData {
  count: number;
  results: Launch[];
}

export default function App() {
  const [astronauts, setAstronauts] = useState<AstronautData | null>(null);
  const [launches, setLaunches] = useState<LaunchesData | null>(null);
  const [satellites, setSatellites] = useState<SatelliteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Astronauts (Using HTTPS proxy because Open-Notify is HTTP-only, which breaks on Vercel)
      let astros = null;
      try {
        const astroRes = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("http://api.open-notify.org/astros.json"), {
          signal: AbortSignal.timeout(8000)
        });
        if (astroRes.ok) {
           astros = await astroRes.json();
        }
      } catch (err) {
         console.warn("Direct astronaut fetch failed, using fallback");
      }

      // Hardcoded fallback in case the API limit is hit or network fails
      if (!astros || !astros.people) {
        astros = {
          number: 10,
          people: [
            { name: "Oleg Kononenko", craft: "ISS" },
            { name: "Nikolai Chub", craft: "ISS" },
            { name: "Tracy Caldwell Dyson", craft: "ISS" },
            { name: "Matthew Dominick", craft: "ISS" },
            { name: "Michael Barratt", craft: "ISS" },
            { name: "Jeanette Epps", craft: "ISS" },
            { name: "Alexander Grebenkin", craft: "ISS" },
            { name: "Ye Guangfu", craft: "Tiangong" },
            { name: "Li Cong", craft: "Tiangong" },
            { name: "Li Guangsu", craft: "Tiangong" }
          ]
        };
      }

      // 2. Fetch Launches directly from Space Devs API
      let launchesData: LaunchesData | null = null;
      try {
         const launchRes = await fetch("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=6", {
           signal: AbortSignal.timeout(8000)
         });
         if (launchRes.ok) {
            launchesData = await launchRes.json();
         }
      } catch (err) {
         console.warn("Direct launch fetch failed");
      }

      // 3. Static/Approximated Satellite logic moved to Frontend
      const sats = {
        active: 10590,
        inactive: 3200,
        debris: 21000,
        total: 10590 + 3200 + 21000,
        source: "Estimated from UCS/Celestrak",
        timestamp: Date.now()
      };
      
      setAstronauts(astros);
      // Depending on API response, fallback payload might be nested
      if (launchesData) {
         setLaunches((launchesData as any).fallback ? (launchesData as any).fallback : launchesData);
      }
      setSatellites(sats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch space data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const satelliteChartData = satellites ? [
    { name: 'Operational', value: satellites.active, color: '#FF4E00' },
    { name: 'Inactive', value: satellites.inactive, color: 'rgba(255,255,255,0.4)' },
    { name: 'Debris', value: satellites.debris, color: 'rgba(255,255,255,0.1)' },
  ] : [];

  return (
    <div className="bg-[#050505] text-white font-sans min-h-screen relative overflow-x-hidden flex flex-col p-6 md:p-10 select-none">
      
      {/* Structural Accents */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#FF4E00] blur-[150px] pointer-events-none opacity-[0.08]" />
      <div className="absolute bottom-10 left-10 w-2 h-2 bg-white opacity-20" />
      <div className="absolute top-10 right-10 w-2 h-2 bg-white opacity-20" />

      {/* Header Navigation */}
      <nav className="flex flex-col md:flex-row justify-between items-start z-10 mb-12">
        <div className="flex flex-col gap-1 mb-6 md:mb-0">
          <span className="text-[10px] tracking-[0.4em] font-semibold text-[#FF4E00] uppercase">
            ORBITAL_INTELLIGENCE_SYSTEM
          </span>
          <h1 className="text-3xl font-light tracking-tighter italic flex items-center gap-2">
             Cosmic.Data <span className="opacity-30">/v4.2</span>
          </h1>
        </div>
        <div className="flex gap-6 md:gap-8 text-[11px] font-medium tracking-[0.2em] pt-2 uppercase items-center flex-wrap">
           <div className="flex flex-col md:items-end gap-1">
              <span className="opacity-40">MISSION TIME (UTC)</span>
              <span className="text-lg font-bold tracking-normal">{format(currentTime, 'HH:mm:ss')}</span>
           </div>
           <button 
             onClick={fetchData} 
             disabled={loading}
             className="opacity-100 border-b border-[#FF4E00]/50 hover:border-[#FF4E00] pb-1 hover:text-[#FF4E00] transition-colors flex items-center gap-2 cursor-pointer"
           >
             <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
             {loading ? 'SYNCING...' : `LAST SYNC: ${format(lastUpdated, 'HH:mm')}`}
           </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="grid grid-cols-1 lg:grid-cols-12 flex-grow gap-12 lg:gap-6 relative z-10">
        
        {/* Background Stylized Text */}
        <div className="hidden lg:block absolute bottom-0 right-0 opacity-[0.03] select-none pointer-events-none z-0">
          <span className="text-[180px] font-black italic leading-none uppercase">Infinity</span>
        </div>

        {/* Astronaut Hero Section */}
        <div className="lg:col-span-7 flex flex-col justify-center relative z-10">
          <div className="hidden lg:block absolute -left-10 top-0 h-full w-[1px] bg-white opacity-10"></div>
          <span className="text-[12px] tracking-[0.5em] opacity-40 mb-4 flex items-center gap-2">
             LIVING_HUMANS_IN_ORBIT
          </span>
          
          {loading && !astronauts ? (
            <div className="flex items-center h-[200px] opacity-50 tracking-widest text-sm uppercase">AQUIRING SIGNAL...</div>
          ) : astronauts && astronauts.people ? (
            <div className="flex flex-col xl:flex-row xl:items-baseline gap-6">
              <h2 className="massive-text font-black glow-orange">
                {astronauts.number}
              </h2>
              <div className="flex flex-col gap-2 pb-4 overflow-y-auto max-h-[300px] w-full max-w-sm mt-4 xl:mt-0 xl:ml-4">
                {astronauts.people.map((astro, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 border-l-2 border-white/20 hover:border-[#FF4E00] pl-3 py-2 transition-colors">
                    <span className="text-xl font-bold">{astro.name}</span>
                    <span className="text-[10px] opacity-60 tracking-widest uppercase text-right leading-tight max-w-[120px] break-words">
                      {astro.craft}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             <div className="text-[#FF4E00] tracking-widest text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> SIGNAL_LOST (NO CREW DATA)</div>
          )}
        </div>

        {/* Satellite Stats */}
        <div className="lg:col-span-5 flex flex-col justify-center gap-12 lg:border-l grid-accent lg:pl-12 relative z-10 mt-8 lg:mt-0">
           {loading && !satellites ? (
              <div className="flex justify-center items-center h-[200px] opacity-50 tracking-widest text-sm uppercase">CALCULATING_ORBITS...</div>
            ) : satellites ? (
              <div>
                <span className="text-[11px] tracking-[0.3em] opacity-30 block mb-6 flex items-center gap-2 uppercase">
                   SATELLITE_DISTRIBUTION
                </span>
                
                <div className="flex flex-col gap-8">
                  <div className="group">
                    <div className="flex justify-between items-baseline mb-2">
                      <h3 className="text-sm tracking-widest opacity-60">OPERATIONAL</h3>
                      <span className="text-4xl font-light">{satellites.active.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-[1px] bg-white opacity-10"></div>
                  </div>
                  <div className="group">
                    <div className="flex justify-between items-baseline mb-2">
                      <h3 className="text-sm tracking-widest opacity-60">INACTIVE / DEBRIS</h3>
                      <span className="text-4xl font-light opacity-30">{(satellites.inactive + satellites.debris).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-[1px] bg-white opacity-10"></div>
                  </div>
                  <div className="group">
                    <div className="flex justify-between items-baseline mb-2">
                      <h3 className="text-sm tracking-widest font-bold text-[#FF4E00]">TOTAL_TRACKED</h3>
                      <span className="text-4xl font-black">{satellites.total.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-[2px] bg-[#FF4E00] opacity-40"></div>
                  </div>
                </div>

                <motion.div 
                  key={satellites.timestamp}
                  initial={{ opacity: 0, scale: 0.8, rotate: -30 }}
                  animate={{ opacity: 0.8, scale: 1, rotate: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-[140px] mt-8"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={satelliteChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={true}
                        animationBegin={200}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      >
                        {satelliteChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#050505', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
                <div className="mt-4 text-left font-sans text-[9px] opacity-30 tracking-widest uppercase">
                  DATA_SOURCE: {satellites.source}
                </div>
              </div>
            ) : (
                <div className="text-[#FF4E00] tracking-widest text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> SIGNAL_LOST</div>
            )}
        </div>

      </main>

      {/* Footer Missions (Launches) */}
      <footer className="mt-16 lg:mt-24 border-t grid-accent flex flex-col lg:flex-row gap-10 lg:items-stretch py-8 relative z-10 w-full overflow-hidden">
        <div className="hidden lg:flex vertical-label items-center justify-center py-4 text-[10px] tracking-[0.4em] opacity-30 uppercase">
          UPCOMING_MISSIONS
        </div>
        
        {loading && !launches ? (
           <div className="flex-grow flex justify-center items-center h-[100px] opacity-50 tracking-widest text-sm uppercase">INTERCEPTING_MANIFEST...</div>
        ) : launches && launches.results ? (
          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-10">
             {launches.results.map((launch, idx) => {
                const launchDate = new Date(launch.net);
                const isSoon = launchDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;
                // Add left border only for items that are not the first in their grid row 
                // Using a simplified logic: first column in lg gets no border, others do.
                const needsBorder = idx % 3 !== 0;

                return (
                  <div key={launch.id} className={`flex flex-col ${needsBorder ? 'lg:border-l grid-accent lg:pl-10' : ''}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[#FF4E00] text-[10px] font-bold uppercase tracking-widest">
                        {format(launchDate, "MMM dd, yyyy")}
                      </span>
                      {isSoon && <span className="bg-[#FF4E00]/20 text-[#FF4E00] text-[8px] tracking-widest px-1.5 py-0.5 border border-[#FF4E00]/30 uppercase">Imminent</span>}
                    </div>
                    
                    <h4 className="text-lg font-light tracking-tight mb-2 pr-2" title={launch.name}>{launch.name}</h4>
                    
                    <div className="text-[11px] opacity-40 leading-relaxed font-light mb-4 line-clamp-3">
                      {launch.mission?.description || `${launch.launch_service_provider?.name || 'Unknown Provider'} launch from ${launch.pad?.location?.name || 'Unknown Location'}.`}
                    </div>
                    
                    <div className="mt-auto text-[9px] uppercase tracking-widest opacity-60 flex items-center gap-2">
                       {launch.status?.name || 'TBD'} • {launch.launch_service_provider?.name || 'AGENCY TBD'}
                    </div>
                  </div>
                )
             })}
          </div>
        ) : (
          <div className="flex-grow text-[#FF4E00] tracking-widest text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> SIGNAL_LOST</div>
        )}

        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 min-w-[120px] pt-8 lg:pt-0">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-[#FF4E00]"></div>
            <div className="w-1 h-1 bg-white opacity-20"></div>
            <div className="w-1 h-1 bg-white opacity-20"></div>
          </div>
          <span className="text-[9px] tracking-widest opacity-40">PAGE_01_OF_04</span>
        </div>
      </footer>

    </div>
  );
}
