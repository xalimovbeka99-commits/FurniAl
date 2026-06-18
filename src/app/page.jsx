"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { DESIGNS } from "@/lib/designs";
import { MATERIALS } from "@/lib/knowledgeBase";
import FurnitureModel from "@/components/builder/FurnitureModel";
import { generateQuote } from "@/lib/pricing";

// Helper to estimate price on the client side using the shared Quote Engine
function getCardPrice(design) {
  const result = generateQuote({
    furnitureType: design.config.type,
    primaryColor: design.config.material,
    doorType: design.config.doorType,
    handleStyle: design.config.handleStyle,
    width: design.config.dimensions.width,
    height: design.config.dimensions.height,
    depth: design.config.dimensions.depth,
    ledLighting: design.config.ledLighting,
    drawerRows: design.config.modules
      ? design.config.modules.reduce((acc, m) => acc + (m.drawerRows || 0), 0)
      : 0,
  });
  return result.ok ? result.quote.total : 1500;
}

// Slow rotation for the hero 3D model
function RotatingModel({ config }) {
  const groupRef = useRef();
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });
  return (
    <group ref={groupRef} position={[0, -config.dimensions.height / 2, 0]}>
      <FurnitureModel config={config} />
    </group>
  );
}

// Simple rotation for individual gallery cards
function GalleryCardModel({ config }) {
  const groupRef = useRef();
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.18;
    }
  });
  return (
    <group ref={groupRef} position={[0, -config.dimensions.height / 2.3, 0]}>
      <FurnitureModel config={config} />
    </group>
  );
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Monitor scroll for header background opacity
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Filter designs dynamically
  const filteredDesigns = useMemo(() => {
    if (selectedCategory === "all") return DESIGNS;
    return DESIGNS.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

  // Categories extracted dynamically from designs catalog
  const categories = useMemo(() => {
    return ["all", ...new Set(DESIGNS.map((d) => d.category))];
  }, []);

  // Use the walnut-glass wardrobe as our landing page hero showcase model
  const heroDesign = DESIGNS.find((d) => d.id === "wardrobe-walnut-mirror") || DESIGNS[0];

  return (
    <div className="min-h-screen bg-[#F2ECE1] text-[#211E19] font-sans selection:bg-[#B0822F] selection:text-[#F2ECE1]">
      
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 transition-all duration-300 ${
        scrolled ? "bg-[#F2ECE1]/85 backdrop-blur-md border-b border-[#C5BCA9]/50 py-3" : "bg-transparent"
      }`}>
        <div className="brand flex items-baseline gap-2 text-2xl font-bold tracking-tight">
          <span>Furni</span><span className="text-[#B0822F]">AI</span>
          <span className="text-xs font-mono tracking-widest text-[#5A5347] uppercase font-normal ml-1 hidden sm:inline-block">Parametric</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#5A5347]">
          <a href="#gallery" className="relative hover:text-[#211E19] transition-colors py-1 group">
            Gallery
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#B0822F] transition-all duration-200 group-hover:w-full"></span>
          </a>
          <a href="#pipeline" className="relative hover:text-[#211E19] transition-colors py-1 group">
            Pipeline
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#B0822F] transition-all duration-200 group-hover:w-full"></span>
          </a>
          <a href="#materials" className="relative hover:text-[#211E19] transition-colors py-1 group">
            Materials
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#B0822F] transition-all duration-200 group-hover:w-full"></span>
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/builder" className="btn bg-[#211E19] text-[#F2ECE1] border border-[#211E19] px-5 py-2.5 rounded-full font-mono text-xs tracking-wider transition-all duration-200 hover:bg-[#B0822F] hover:border-[#B0822F] hover:-translate-y-0.5 inline-flex items-center gap-2">
            <span>Configure Space</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 max-w-7xl mx-auto px-6 md:px-12 min-h-[90vh] flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <span className="eyebrow inline-flex items-center gap-2 mb-4 text-[#B0822F] font-mono text-xs uppercase tracking-widest">
              CNC Integrated config
            </span>
            <h1 className="brand text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.05] mb-6">
              Custom furniture, built to the <em className="italic text-[#B0822F] font-normal">millimetre</em>.
            </h1>
            <p className="text-base sm:text-lg text-[#5A5347] max-w-xl mb-8 leading-relaxed">
              No generic sizes, no flatpack compromises. Configure wardrobes, shelves, and kitchens to your exact room size. Live prices calculation, payment freeze, and automated direct production dispatch.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <Link href="/builder" className="btn bg-[#211E19] text-[#F2ECE1] border border-[#211E19] px-6 py-3.5 rounded-full font-mono text-sm tracking-wide transition-all duration-200 hover:bg-[#B0822F] hover:border-[#B0822F] hover:-translate-y-0.5">
                Start Customising
              </Link>
              <a href="#gallery" className="btn border border-[#211E19] text-[#211E19] px-6 py-3.5 rounded-full font-mono text-sm tracking-wide transition-all duration-200 hover:bg-[#211E19] hover:text-[#F2ECE1]">
                View Gallery
              </a>
            </div>
            
            <div className="flex flex-wrap gap-8 border-t border-[#C5BCA9] pt-8">
              <div className="font-mono">
                <span className="block text-2xl font-bold text-[#211E19] leading-none">0.0 mm</span>
                <span className="block text-[10px] uppercase tracking-wider text-[#5A5347] mt-1.5">Tolerance Limit</span>
              </div>
              <div className="font-mono">
                <span className="block text-2xl font-bold text-[#211E19] leading-none">Direct</span>
                <span className="block text-[10px] uppercase tracking-wider text-[#5A5347] mt-1.5">Factory Dispatch</span>
              </div>
              <div className="font-mono">
                <span className="block text-2xl font-bold text-[#211E19] leading-none">100%</span>
                <span className="block text-[10px] uppercase tracking-wider text-[#5A5347] mt-1.5">AED Online Pay</span>
              </div>
            </div>
          </div>

          {/* 3D Showcase Viewport */}
          <div className="lg:col-span-6 relative aspect-square w-full rounded-2xl border border-[#C5BCA9] overflow-hidden bg-gradient-to-tr from-[#E0D5C2] via-[#EDE4D4] to-[#FBF7EF] shadow-inner">
            <Canvas shadows camera={{ position: [2.5, 1.6, 2.5], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[4, 6, 3]} intensity={1.2} castShadow />
              <Environment preset="apartment" />
              <Grid args={[10, 10]} cellColor="#dcd4c6" sectionColor="#c5bca9" infiniteGrid fadeDistance={8} position={[0, -0.01, 0]} />
              <Suspense fallback={null}>
                <RotatingModel config={heroDesign.config} />
              </Suspense>
              <OrbitControls enableZoom={false} makeDefault target={[0, 0.05, 0]} />
            </Canvas>
            <div className="absolute left-4 bottom-4 font-mono text-[10px] text-[#5A5347] bg-[#F2ECE1]/70 backdrop-blur px-3 py-1.5 rounded-lg border border-[#C5BCA9]/50">
              Interactive 3D model · <b>Drag to rotate</b>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Ticker */}
      <div className="w-full border-y border-[#C5BCA9] bg-[#211E19] text-[#F2ECE1] overflow-hidden py-4">
        <div className="whitespace-nowrap flex animate-ticker">
          {Array(4).fill([
            "Designed by AI",
            "Crafted by code",
            "Exact to the millimetre",
            "Local Workshops",
            "Fast Delivery",
          ]).flat().map((text, idx) => (
            <span key={idx} className="font-mono text-xs tracking-[0.2em] uppercase inline-flex items-center">
              {text} <span className="text-[#B0822F] px-8">★</span>
            </span>
          ))}
        </div>
      </div>

      {/* Pipeline Steps Section */}
      <section id="pipeline" className="py-24 max-w-7xl mx-auto px-6 md:px-12 border-b border-[#C5BCA9]/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <span className="eyebrow inline-flex items-center gap-2 mb-3 text-[#B0822F] font-mono text-xs uppercase tracking-widest">
              Digital Craftsmanship
            </span>
            <h2 className="brand text-3xl sm:text-4xl md:text-5xl font-light tracking-tight">
              AI design, built by <em className="italic text-[#B0822F] font-normal">pure code</em>.
            </h2>
          </div>
          <p className="text-[#5A5347] max-w-md text-sm sm:text-base leading-relaxed">
            We bridge the gap between imagination and physical fabrication. No middle-man design files, just robust geometry automation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#C5BCA9] border border-[#C5BCA9] rounded-2xl overflow-hidden shadow-sm">
          {[
            {
              num: "01",
              title: "Concept & Gallery",
              desc: "Select a custom configuration template from the dynamic gallery to instantly load it.",
              badge: "Parametric presets",
            },
            {
              num: "02",
              title: "Refinement",
              desc: "Modify the width, height, or depth. The internal sections reflow dynamically in 3D.",
              badge: "Automatic rebuild",
            },
            {
              num: "03",
              title: "AED Quotation",
              desc: "Get a breakdown calculated from raw material sheets, labor base, and door hardware.",
              badge: "Exact sheet cost",
            },
            {
              num: "04",
              title: "Production Dispatch",
              desc: "Online purchase locks the configuration and automatically compiles CSV & production PDF.",
              badge: "Direct CNC Pipeline",
            },
          ].map((step, idx) => (
            <div key={idx} className="bg-[#F2ECE1] p-8 transition-colors duration-300 hover:bg-[#EAE2D4] flex flex-col justify-between min-h-[260px]">
              <div>
                <span className="font-mono text-xs text-[#B0822F] block mb-4">{step.num}</span>
                <h3 className="brand text-xl font-medium tracking-tight mb-3 text-[#211E19]">{step.title}</h3>
                <p className="text-xs sm:text-sm text-[#5A5347] leading-relaxed">{step.desc}</p>
              </div>
              <div className="mt-6">
                <span className="inline-block font-mono text-[9px] uppercase tracking-wider text-[#5A5347] px-2.5 py-1 border border-[#C5BCA9] rounded-md bg-[#F2ECE1]/60">
                  {step.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Gallery Section */}
      <section id="gallery" className="py-24 max-w-7xl mx-auto px-6 md:px-12 border-b border-[#C5BCA9]/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <span className="eyebrow inline-flex items-center gap-2 mb-3 text-[#B0822F] font-mono text-xs uppercase tracking-widest">
              Design Gallery
            </span>
            <h2 className="brand text-3xl sm:text-4xl md:text-5xl font-light tracking-tight">
              Pre-engineered <em className="italic text-[#B0822F] font-normal">catalogs</em>.
            </h2>
          </div>
          
          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`font-mono text-xs tracking-wider px-4 py-2 rounded-full border transition-all duration-150 capitalize ${
                  selectedCategory === cat
                    ? "bg-[#211E19] text-[#F2ECE1] border-[#211E19]"
                    : "bg-[#F2ECE1] text-[#5A5347] border-[#C5BCA9] hover:border-[#211E19] hover:text-[#211E19]"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDesigns.map((design) => {
            const price = getCardPrice(design);
            return (
              <Link
                key={design.id}
                href={`/builder?design=${design.id}`}
                className="group flex flex-col bg-[#EAE2D4] border border-[#C5BCA9]/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#B0822F]/60"
              >
                {/* 3D Preview inside card */}
                <div className="aspect-[4/3] relative w-full overflow-hidden bg-gradient-to-tr from-[#E2D8C7] to-[#FAF6EE] border-b border-[#C5BCA9]/50">
                  <div className="absolute top-3 right-3 z-10 font-mono text-xs bg-[#211E19] text-[#F2ECE1] px-2.5 py-1 rounded shadow-sm">
                    AED {price.toLocaleString()}
                  </div>
                  
                  <Canvas shadows camera={{ position: [2.0, 1.4, 2.0], fov: 40 }}>
                    <ambientLight intensity={0.7} />
                    <directionalLight position={[3, 5, 2]} intensity={1.0} />
                    <Suspense fallback={null}>
                      <GalleryCardModel config={design.config} />
                    </Suspense>
                  </Canvas>

                  {/* Hover Customize overlay */}
                  <div className="absolute inset-0 bg-[#211E19]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                    <span className="font-mono text-xs tracking-wider bg-[#B0822F] text-[#F2ECE1] px-4 py-2.5 rounded-full shadow-md transform translate-y-3 group-hover:translate-y-0 transition-transform duration-200">
                      Configure Preset
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <span className="font-mono text-[10px] tracking-widest text-[#B0822F] uppercase block mb-1">
                    {design.config.type} · {design.style}
                  </span>
                  <h3 className="brand text-xl font-medium tracking-tight text-[#211E19] mb-3">
                    {design.name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-mono text-[#5A5347]">
                    <span>W: <b>{Math.round(design.config.dimensions.width * 1000)}</b></span>
                    <span>H: <b>{Math.round(design.config.dimensions.height * 1000)}</b></span>
                    <span>D: <b>{Math.round(design.config.dimensions.depth * 1000)}</b> mm</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Materials Showcase Section */}
      <section id="materials" className="py-24 max-w-7xl mx-auto px-6 md:px-12 border-b border-[#C5BCA9]/60">
        <div className="mb-16">
          <span className="eyebrow inline-flex items-center gap-2 mb-3 text-[#B0822F] font-mono text-xs uppercase tracking-widest">
            Material Catalog
            </span>
          <h2 className="brand text-3xl sm:text-4xl md:text-5xl font-light tracking-tight">
            Premium finishes, <em className="italic text-[#B0822F] font-normal">durable sheets</em>.
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Object.entries(MATERIALS).map(([key, mat]) => (
            <button
              key={key}
              onClick={() => setActiveMaterial(key === activeMaterial ? null : key)}
              className="flex flex-col items-center text-center focus:outline-none group"
            >
              <div 
                style={{ backgroundColor: mat.color }} 
                className={`w-20 h-20 rounded-2xl border border-[#C5BCA9] mb-4 shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                  activeMaterial === key ? "ring-2 ring-[#B0822F] ring-offset-2 ring-offset-[#F2ECE1]" : ""
                }`}
              />
              <span className="brand text-base font-medium text-[#211E19] block">{mat.label}</span>
              <span className="font-mono text-[10px] text-[#5A5347] uppercase tracking-wider mt-1 block">
                {mat.tier} tier
              </span>
              
              {activeMaterial === key && (
                <div className="mt-2 text-xs font-mono text-[#B0822F] animate-fade-in">
                  AED {mat.costPerM2}/m²
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="py-28 text-center max-w-4xl mx-auto px-6">
        <span className="eyebrow inline-flex items-center gap-2 mb-4 text-[#B0822F] font-mono text-xs uppercase tracking-widest">
          Build Your Project
        </span>
        <h2 className="brand text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-none mb-8">
          Configure your space, <br />
          <em className="italic text-[#B0822F] font-normal">exactly as it fits</em>.
        </h2>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/builder" className="btn bg-[#211E19] text-[#F2ECE1] border border-[#211E19] px-8 py-4 rounded-full font-mono text-sm tracking-wide transition-all duration-200 hover:bg-[#B0822F] hover:border-[#B0822F] hover:-translate-y-0.5">
            Open Configurator
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#C5BCA9] bg-[#EAE2D4] py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="brand text-2xl font-bold tracking-tight mb-4">
              <span>Furni</span><span className="text-[#B0822F]">AI</span>
            </div>
            <p className="text-sm text-[#5A5347] max-w-md leading-relaxed">
              Parametric custom furniture configurator. Engineered dynamically for UAE workshops. From browser layout to factory cutting instructions in minutes.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-xs tracking-wider text-[#5A5347] uppercase mb-4">System Links</h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><Link href="/builder" className="hover:text-[#B0822F] transition-colors">3D Configurator</Link></li>
              <li><a href="#gallery" className="hover:text-[#B0822F] transition-colors">Catalog Gallery</a></li>
              <li><a href="#pipeline" className="hover:text-[#B0822F] transition-colors">Direct CNC Pipeline</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs tracking-wider text-[#5A5347] uppercase mb-4">Tech Specs</h4>
            <ul className="flex flex-col gap-2.5 text-sm text-[#5A5347]">
              <li>React 18 / Next.js 14</li>
              <li>Three.js / React Three Fiber</li>
              <li>Deterministic Quote Math</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto border-t border-[#C5BCA9] mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-[#5A5347]">
          <span>© {new Date().getFullYear()} FurniAI. CNC Integrated System.</span>
          <span>Designed & Built for UAE Fabrication Workshops.</span>
        </div>
      </footer>

    </div>
  );
}
