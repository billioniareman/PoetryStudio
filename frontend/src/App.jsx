import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Languages, 
  Activity, 
  Users, 
  Image as ImageIcon, 
  Share2, 
  History, 
  Database, 
  ChevronRight, 
  ArrowLeft, 
  Plus, 
  Check, 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  Heart, 
  BookOpenCheck, 
  Instagram, 
  Copy, 
  Download, 
  Send 
} from 'lucide-react';

const API_BASE = "http://localhost:8000";

// Standard sample poems for offline fallback
const CLIENT_MOCK_POEMS = [];


export default function App() {
  // Navigation & Core State
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, poems, publish, logs
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [poems, setPoems] = useState([]);
  const [selectedPoemId, setSelectedPoemId] = useState(null);
  
  // Active selected poem details
  const [poemDetails, setPoemDetails] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingText, setEditingText] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState("editor"); // editor, translations, meter, reviews, design, publish, history
  
  // Pipeline Loading Status
  const [importing, setImporting] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(null); // fetch, translation, meter, audience, design, publish, done
  const [logs, setLogs] = useState([]);
  
  // Editor AI suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Auto-save feedback message
  const [saveStatus, setSaveStatus] = useState("Saved");

  // Pillow template selection
  const [activeTemplate, setActiveTemplate] = useState("Dark");

  // Check backend server health on mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        setIsBackendOnline(true);
        fetchPoems(true);
      } else {
        loadMockState();
      }
    } catch (e) {
      loadMockState();
    }
  };

  const loadMockState = () => {
    setIsBackendOnline(false);
    setPoems(CLIENT_MOCK_POEMS);
    setLogs([
      { id: 1, poem_id: null, event_name: "system.offline", payload_json: { msg: "API Offline. Running in simulated Client Mode." }, emitted_at: new Date().toISOString() }
    ]);
  };

  // Fetch list of poems
  const fetchPoems = async (selectFirst = false) => {
    try {
      const res = await fetch(`${API_BASE}/poems`);
      if (res.ok) {
        const data = await res.json();
        setPoems(data);
        if (selectFirst && data.length > 0) {
          selectPoem(data[0].id);
        }
      }
    } catch (e) {
      console.error("Fetch poems failed", e);
    }
  };

  // Select a poem and fetch full analysis details
  const selectPoem = async (poemId) => {
    setSelectedPoemId(poemId);
    setActiveDetailTab("editor");
    setSuggestions([]);
    
    if (!isBackendOnline) {
      // Load local mock details
      const poem = poems.find(p => p.id === poemId) || CLIENT_MOCK_POEMS[0];
      setEditingTitle(poem.title);
      setEditingText(poem.original_text);
      
      // Compute local mockup reviews, translations, meter counts
      setPoemDetails(generateLocalMockDetails(poem));
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/poems/${poemId}`);
      if (res.ok) {
        const data = await res.json();
        setPoemDetails(data);
        setEditingTitle(data.poem.title);
        setEditingText(data.poem.original_text);
      }
    } catch (e) {
      console.error("Fetch poem details failed", e);
    }
  };

  // Generates offline mock statistics for display
  const generateLocalMockDetails = (poem) => {
    // Basic matra counts for lines
    const lines = poem.original_text.split('\n').filter(l => l.trim());
    const matras = lines.map((l, i) => ({
      line_number: i + 1,
      line_text: l,
      matra_count: Math.round(18 + Math.random() * 8)
    }));

    return {
      poem,
      versions: [
        { id: 1, version_number: 1, created_by: "FetchAgent", content: poem.original_text, diff_summary: "Initial clean import", created_at: poem.created_at }
      ],
      translations: [
        { id: 1, language: "English", content: "Softly whispers the evening breeze,\nCarrying secrets through the trees.\nIn your silence, I find my peace,\nMay this beautiful night never cease." },
        { id: 2, language: "Hinglish", content: "Dheere se chalti hai shaam ki hawa,\nPedon ke beech chupaye koi raaz.\nTeri khamoshi mein milta hai sukoon,\nKaash ye haseen raat kabhi khatam na ho." }
      ],
      meter_analysis: {
        bahr_chhand: "Baseline Matra: " + (matras[0]?.matra_count || 24),
        rhyming_consistency: "Consistent",
        suggestions_json: [
          {
            line_number: 2,
            line_text: lines[1] || "",
            current_matra: matras[1]?.matra_count || 26,
            target_matra: matras[0]?.matra_count || 24,
            reason: "Word count exceeds normal meter structure",
            recommendations: [{ replace: "मुस्कुराहट", with: "हँसी", reason: "Saves matras" }]
          }
        ],
        matra_counts_json: matras
      },
      audience_reviews: [
        { id: 1, persona_name: "Romantic Lover", rating: 9, strengths_json: ["Emotionally vulnerable", "Beautiful word choices"], weaknesses_json: ["Rhythm slows in line 2"], favorite_line: lines[0], confusing_line: null, suggestion: "Focus on deepening the imagery of silence", final_emotion: "Yearning (Ishq)" },
        { id: 2, persona_name: "Literary Critic", rating: 8, strengths_json: ["Classical format", "Avoids clichés"], weaknesses_json: ["Conventional metaphors"], favorite_line: lines[2], confusing_line: lines[1], suggestion: "Substitute common metaphors with local imagery", final_emotion: "Appreciation" },
        { id: 3, persona_name: "Instagram Reader", rating: 9, strengths_json: ["Extremely shareable couplets", "Captivating aesthetic"], weaknesses_json: ["A bit dense for rapid scrolling"], favorite_line: lines[0], confusing_line: null, suggestion: "Start with the main punchline directly", final_emotion: "Aesthetic Vibe" },
        { id: 4, persona_name: "Aggregator", rating: 9, strengths_json: ["Relatable", "Deep", "Structured"], weaknesses_json: ["Slight rhythm deviation"], favorite_line: lines[0], confusing_line: null, suggestion: "Apply the suggested word substitutions", final_emotion: "Romantic Melancholy" }
      ],
      generated_media: [
        { id: 1, template_name: "Dark", media_url: "placeholder_dark.png" },
        { id: 2, template_name: "Vintage", media_url: "placeholder_vintage.png" }
      ],
      events: [
        { id: 1, event_name: "poem.imported", emitted_at: new Date().toISOString() },
        { id: 2, event_name: "translation.completed", emitted_at: new Date().toISOString() },
        { id: 3, event_name: "meter.completed", emitted_at: new Date().toISOString() }
      ]
    };
  };

  // Simulated live execution loader for LangGraph Node flow
  const triggerGoogleKeepImport = async () => {
    setImporting(true);
    setPipelineStep("fetch");
    setLogs(prev => [{ id: Date.now(), event_name: "pipeline.started", payload_json: { msg: "Importing notes from Google Keep..." }, emitted_at: new Date().toISOString() }, ...prev]);

    // Stage 1: Fetch Note (2s)
    await new Promise(r => setTimeout(r, 1200));
    setPipelineStep("translation");
    setLogs(prev => [{ id: Date.now(), event_name: "poem.imported", payload_json: { msg: "FetchAgent: Normalized text & extracted title." }, emitted_at: new Date().toISOString() }, ...prev]);

    // Stage 2: Translate (2s)
    await new Promise(r => setTimeout(r, 1200));
    setPipelineStep("meter");
    setLogs(prev => [{ id: Date.now(), event_name: "translation.completed", payload_json: { msg: "TranslationAgent: Hinglish & English versions saved." }, emitted_at: new Date().toISOString() }, ...prev]);

    // Stage 3: Meter count (2s)
    await new Promise(r => setTimeout(r, 1200));
    setPipelineStep("audience");
    setLogs(prev => [{ id: Date.now(), event_name: "meter.completed", payload_json: { msg: "MeterAgent: Syllable count matched to base matra." }, emitted_at: new Date().toISOString() }, ...prev]);

    // Stage 4: Reviews (2s)
    await new Promise(r => setTimeout(r, 1200));
    setPipelineStep("design");
    setLogs(prev => [{ id: Date.now(), event_name: "audience.reviewed", payload_json: { msg: "AudienceReviewers: Merged Romantic/Critic reviews." }, emitted_at: new Date().toISOString() }, ...prev]);

    // Stage 5: Pillow draw (2s)
    await new Promise(r => setTimeout(r, 1200));
    setPipelineStep("publish");
    setLogs(prev => [{ id: Date.now(), event_name: "design.completed", payload_json: { msg: "DesignAgent: Generated themed social visual cards." }, emitted_at: new Date().toISOString() }, ...prev]);

    // Stage 6: Publish Stage (1.5s)
    await new Promise(r => setTimeout(r, 1000));
    setPipelineStep("done");
    
    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_BASE}/poems/import`, { method: 'POST' });
        if (res.ok) {
          const newPoems = await res.json();
          await fetchPoems();
          if (newPoems.length > 0) {
            selectPoem(newPoems[newPoems.length - 1].id);
          }
        }
      } catch (e) {
        console.error("Keep backend fetch failed", e);
      }
    } else {
      // Offline Simulation: Add the mock Faiz poem if not already present
      if (poems.length === 3) {
        const imported = {
          id: 104,
          title: "नक्श-ए-फ़रियादी",
          original_text: "मुझसे पहली सी मोहब्बत मेरे महबूब न माँग,\nमैंने समझा था कि तू है तो दरख़्शाँ है हयात।\nतेरा ग़म है तो ग़म-ए-दहर का झगड़ा क्या है,\nतेरी सूरत से है आलम में बहारों को सबात।",
          language: "Urdu",
          source: "google_keep",
          google_keep_id: "keep_poem_4",
          tags: "Faiz,Nostalgia",
          category: "Nazm",
          is_draft: true,
          is_published: false,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const updatedPoems = [...poems, imported];
        setPoems(updatedPoems);
        setSelectedPoemId(104);
        setEditingTitle(imported.title);
        setEditingText(imported.original_text);
        setPoemDetails(generateLocalMockDetails(imported));
      }
    }

    setImporting(false);
    setPipelineStep(null);
  };

  // Run full LangGraph pipeline re-analysis
  const runPipelineReanalysis = async () => {
    if (!isBackendOnline) {
      alert("Simulating pipeline run. Local reports re-calculated.");
      selectPoem(selectedPoemId);
      return;
    }
    
    setSaveStatus("Analyzing...");
    try {
      const res = await fetch(`${API_BASE}/poems/${selectedPoemId}/reanalyze`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPoemDetails(data);
        setSaveStatus("Analyzed & Saved");
        setTimeout(() => setSaveStatus("Saved"), 3000);
      }
    } catch (e) {
      console.error(e);
      setSaveStatus("Failed");
    }
  };

  // Handles text editor updates and sends PUT requests to backend
  const handleEditorUpdate = async (newText, newTitle = editingTitle) => {
    setEditingText(newText);
    setEditingTitle(newTitle);
    setSaveStatus("Saving...");

    if (!isBackendOnline) {
      // Local mockup update
      setPoems(prev => prev.map(p => p.id === selectedPoemId ? { ...p, original_text: newText, title: newTitle } : p));
      setSaveStatus("Saved");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/poems/${selectedPoemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_text: newText, title: newTitle })
      });
      if (res.ok) {
        const data = await res.json();
        setSaveStatus("Saved");
        // Reload details (which includes new versions list)
        const detailRes = await fetch(`${API_BASE}/poems/${selectedPoemId}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setPoemDetails(detailData);
        }
      }
    } catch (e) {
      console.error("Auto save failed", e);
      setSaveStatus("Offline/Failed");
    }
  };

  // Apply suggestions from MeterAgent
  const applyMeterSuggestion = async (originalLine, replacement) => {
    const newText = editingText.replace(originalLine, replacement);
    setEditingText(newText);
    await handleEditorUpdate(newText);
    
    // Update local state details or trigger backend re-analysis
    if (isBackendOnline) {
      await runPipelineReanalysis();
    } else {
      // Local replacement simulation
      setPoemDetails(prev => {
        const newMatras = prev.meter_analysis.matra_counts_json.map(m => 
          m.line_text === originalLine ? { ...m, line_text: replacement, matra_count: m.matra_count - 2 } : m
        );
        return {
          ...prev,
          versions: [
            { id: Date.now(), version_number: prev.versions.length + 1, created_by: "MeterAgent", content: newText, diff_summary: `Substituted "${originalLine}" -> "${replacement}"`, created_at: new Date().toISOString() },
            ...prev.versions
          ],
          meter_analysis: {
            ...prev.meter_analysis,
            rhyming_consistency: "Consistent",
            suggestions_json: [],
            matra_counts_json: newMatras
          }
        };
      });
    }
  };

  // Get voice-preserving editing improvements
  const fetchEditorImprovements = async () => {
    setLoadingSuggestions(true);
    if (!isBackendOnline) {
      await new Promise(r => setTimeout(r, 1000));
      setSuggestions([
        {
          original_line: poemDetails?.meter_analysis?.suggestions_json[0]?.line_text || "मुस्कुराहट तेरी सब कुछ बदल देती है",
          suggested_line: "हँसी तेरी सब कुछ बदल देती है",
          change_summary: "Replaced 'मुस्कुराहट' with 'हँसी'",
          reason: "Preserves the emotional flow while matching the strict 24-matra Ghazal meter count.",
          emotional_impact: "Increases structural punchiness."
        }
      ]);
      setLoadingSuggestions(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/poems/${selectedPoemId}/improvements`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingSuggestions(false);
  };

  // Approve publishing staged posts
  const approveAndPublishStaged = async (postId) => {
    if (!isBackendOnline) {
      // Mock approval
      setPoemDetails(prev => ({
        ...prev,
        events: [
          { id: Date.now(), event_name: "publish.completed", payload_json: { platform: "Instagram" }, emitted_at: new Date().toISOString() },
          ...prev.events
        ]
      }));
      alert("Simulating API Publication: Staged post successfully published to Instagram, Threads & LinkedIn!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/publish/${postId}/approve`, { method: "POST" });
      if (res.ok) {
        alert("Publication approved! Shared successfully.");
        // Reload detail events
        selectPoem(selectedPoemId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Main UI render
  return (
    <div className="flex min-h-screen bg-poetry-bg text-poetry-text font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 glass border-r border-poetry-border flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-poetry-border flex items-center gap-3">
            <div className="bg-poetry-accent/20 p-2 rounded-lg border border-poetry-accent/40">
              <BookOpen className="w-6 h-6 text-poetry-accent" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wide bg-gradient-to-r from-poetry-text to-poetry-accent bg-clip-text text-transparent">Poetry Studio</h1>
              <span className="text-xs text-poetry-accent font-semibold tracking-widest uppercase">MVP v1.0</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2 flex-1">
            <button 
              onClick={() => { setActiveTab("dashboard"); setSelectedPoemId(null); }}
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${activeTab === "dashboard" ? "bg-poetry-accent/15 text-poetry-accent font-semibold border border-poetry-accent/30" : "text-poetry-muted hover:text-poetry-text hover:bg-white/5"}`}
            >
              <Database className="w-5 h-5" />
              Dashboard
            </button>
            <button 
              onClick={() => { setActiveTab("poems"); if (poems.length > 0 && !selectedPoemId) selectPoem(poems[0].id); }}
              className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${activeTab === "poems" ? "bg-poetry-accent/15 text-poetry-accent font-semibold border border-poetry-accent/30" : "text-poetry-muted hover:text-poetry-text hover:bg-white/5"}`}
            >
              <span className="flex items-center gap-3">
                <Sparkles className="w-5 h-5" />
                AI Writing Room
              </span>
              {poems.length > 0 && <span className="bg-poetry-accent/20 text-poetry-accent text-xs px-2 py-0.5 rounded-full border border-poetry-accent/30">{poems.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab("publish")}
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${activeTab === "publish" ? "bg-poetry-accent/15 text-poetry-accent font-semibold border border-poetry-accent/30" : "text-poetry-muted hover:text-poetry-text hover:bg-white/5"}`}
            >
              <Share2 className="w-5 h-5" />
              Staging Scheduler
            </button>
            <button 
              onClick={() => setActiveTab("logs")}
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${activeTab === "logs" ? "bg-poetry-accent/15 text-poetry-accent font-semibold border border-poetry-accent/30" : "text-poetry-muted hover:text-poetry-text hover:bg-white/5"}`}
            >
              <History className="w-5 h-5" />
              Event Audit Trail
            </button>
          </nav>
        </div>

        {/* Server Status Indicators */}
        <div className="p-4 border-t border-poetry-border">
          <div className="glass-dark p-3 rounded-lg flex items-center justify-between">
            <span className="text-xs text-poetry-muted font-medium">Server Connection</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isBackendOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-amber-500 shadow-lg shadow-amber-500/50'}`} />
              <span className="text-xs font-semibold">{isBackendOnline ? 'API Connected' : 'Simulated (Offline)'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        
        {/* Top bar with quick triggers */}
        <header className="h-20 border-b border-poetry-border px-8 flex items-center justify-between glass">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight text-white capitalize">{activeTab}</h2>
            {importing && (
              <span className="bg-poetry-accent/25 border border-poetry-accent/40 text-poetry-accent text-xs px-3 py-1 rounded-full flex items-center gap-2 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                LangGraph: Processing {pipelineStep} Node...
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={triggerGoogleKeepImport}
              disabled={importing}
              className="bg-gradient-to-r from-poetry-accent to-poetry-gold text-poetry-bg hover:opacity-90 active:scale-95 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-poetry-accent/20 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
              Import Google Keep Notes
            </button>
          </div>
        </header>

        {/* Dynamic Panels */}
        <div className="flex-1 p-8">
          
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === "dashboard" && !selectedPoemId && (
            <div className="space-y-8">
              {/* Hero Banner */}
              <div className="bg-gradient-to-br from-poetry-card to-poetry-darker p-8 rounded-2xl border border-poetry-border/40 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-poetry-accent/5 rounded-full filter blur-3xl" />
                <div className="relative z-10 max-w-2xl space-y-4">
                  <span className="text-poetry-accent font-bold tracking-widest text-xs uppercase">Welcome Writer</span>
                  <h3 className="text-3xl font-bold text-white font-serif italic">"लेखनी जहाँ दिल की धड़कन बन जाए।"</h3>
                  <p className="text-poetry-muted text-sm leading-relaxed">
                    Poetry Studio integrates advanced AI models configured as specialized agents (Translators, Meter critics, Social card generators) to help you compose, analyze, refine, and publish poetry in Hindi, Hinglish, and Urdu.
                  </p>
                  <div className="pt-2 flex gap-4">
                    <button 
                      onClick={triggerGoogleKeepImport}
                      className="bg-poetry-accent/20 border border-poetry-accent/40 text-poetry-accent hover:bg-poetry-accent/30 text-sm font-semibold px-5 py-2 rounded-lg transition-all"
                    >
                      Sync Poetry Feed
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass p-6 rounded-xl space-y-2">
                  <span className="text-poetry-muted text-xs font-semibold tracking-wider uppercase block">Total Poems</span>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-extrabold text-white">{poems.length}</span>
                    <Sparkles className="w-8 h-8 text-poetry-accent/40" />
                  </div>
                </div>
                <div className="glass p-6 rounded-xl space-y-2">
                  <span className="text-poetry-muted text-xs font-semibold tracking-wider uppercase block">Translations Stored</span>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-extrabold text-white">{poems.length * 2}</span>
                    <Languages className="w-8 h-8 text-poetry-accent/40" />
                  </div>
                </div>
                <div className="glass p-6 rounded-xl space-y-2">
                  <span className="text-poetry-muted text-xs font-semibold tracking-wider uppercase block">Critic Score</span>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-extrabold text-white">8.7 <span className="text-sm text-poetry-muted">/ 10</span></span>
                    <Users className="w-8 h-8 text-poetry-accent/40" />
                  </div>
                </div>
                <div className="glass p-6 rounded-xl space-y-2">
                  <span className="text-poetry-muted text-xs font-semibold tracking-wider uppercase block">Staged Posts</span>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-extrabold text-white">1</span>
                    <Share2 className="w-8 h-8 text-poetry-accent/40" />
                  </div>
                </div>
              </div>

              {/* Recent Poems */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-white tracking-wide">Recent Composition Feed</h4>
                <div className="glass rounded-xl overflow-hidden border border-poetry-border/40">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-poetry-darker/60 border-b border-poetry-border/30 text-poetry-muted font-semibold">
                      <tr>
                        <th className="p-4">Title</th>
                        <th className="p-4">Language</th>
                        <th className="p-4">Source</th>
                        <th className="p-4">Tags</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-poetry-border/20">
                      {poems.map(poem => (
                        <tr key={poem.id} className="hover:bg-white/5 transition-all">
                          <td className="p-4 font-semibold text-white font-serif">{poem.title}</td>
                          <td className="p-4">{poem.language}</td>
                          <td className="p-4">
                            <span className="bg-white/5 border border-white/10 text-xs px-2 py-0.5 rounded text-poetry-muted capitalize">
                              {poem.source.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-poetry-muted text-xs">{poem.tags || 'General'}</td>
                          <td className="p-4">
                            <span className="bg-poetry-accent/10 border border-poetry-accent/25 text-poetry-accent text-xs px-2.5 py-0.5 rounded-full font-medium">
                              Draft
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => { setActiveTab("poems"); selectPoem(poem.id); }}
                              className="text-poetry-accent hover:text-poetry-gold font-semibold flex items-center gap-1 ml-auto"
                            >
                              Open Editor
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI WRITING ROOM (Selected Poem Detail & Editor) */}
          {activeTab === "poems" && selectedPoemId && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-230px)]">
              
              {/* LEFT BOARD: Writing canvas */}
              <div className="lg:col-span-6 flex flex-col justify-between glass p-6 rounded-2xl border border-poetry-border/40 relative">
                
                {/* Editor Header */}
                <div className="border-b border-poetry-border/30 pb-4 mb-4 flex items-center justify-between">
                  <button 
                    onClick={() => { setSelectedPoemId(null); setActiveTab("dashboard"); }}
                    className="text-poetry-muted hover:text-poetry-text flex items-center gap-1.5 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Feed
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-poetry-accent/10 border border-poetry-accent/20 px-2 py-1 rounded text-poetry-accent font-medium capitalize">
                      {saveStatus}
                    </span>
                    <button 
                      onClick={runPipelineReanalysis}
                      className="bg-poetry-accent/20 hover:bg-poetry-accent/35 text-poetry-accent border border-poetry-accent/30 p-2 rounded-lg transition-all"
                      title="Re-run AI Analysis"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Editor Canvas */}
                <div className="flex-1 flex flex-col justify-start">
                  <input 
                    type="text" 
                    value={editingTitle} 
                    onChange={(e) => handleEditorUpdate(editingText, e.target.value)}
                    placeholder="Enter Poem Title..."
                    className="w-full text-2xl font-bold bg-transparent outline-none border-b border-transparent focus:border-poetry-border/30 pb-2 mb-4 text-white font-serif italic"
                  />
                  <textarea 
                    value={editingText} 
                    onChange={(e) => handleEditorUpdate(e.target.value)}
                    placeholder="लिखना शुरू करें..."
                    className="w-full flex-1 poetry-editor overflow-y-auto"
                  />
                </div>

                {/* Editor Footer Tools */}
                <div className="border-t border-poetry-border/30 pt-4 mt-4 flex items-center justify-between">
                  <div className="text-xs text-poetry-muted font-medium">
                    Lines: {editingText.split('\n').filter(Boolean).length} | Words: {editingText.split(/\s+/).filter(Boolean).length}
                  </div>
                  
                  <button 
                    onClick={fetchEditorImprovements}
                    disabled={loadingSuggestions}
                    className="bg-poetry-accent text-poetry-bg font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-md shadow-poetry-accent/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {loadingSuggestions ? 'Polishing...' : 'Suggest AI Improvements'}
                  </button>
                </div>

                {/* Floating Suggestions Drawer */}
                {suggestions.length > 0 && (
                  <div className="absolute inset-x-6 bottom-20 glass-dark border border-poetry-accent/40 p-4 rounded-xl shadow-2xl space-y-3 z-20 max-h-60 overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-poetry-border/20 pb-2">
                      <span className="text-sm font-bold text-poetry-accent flex items-center gap-1">
                        <Sparkles className="w-4 h-4" />
                        Voice-Preserving Suggestions
                      </span>
                      <button onClick={() => setSuggestions([])} className="text-poetry-muted hover:text-white text-xs">Dismiss</button>
                    </div>
                    {suggestions.map((s, i) => (
                      <div key={i} className="text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-poetry-muted block uppercase text-[9px] font-semibold">Original:</span>
                            <span className="text-red-400 line-through font-serif">{s.original_line}</span>
                          </div>
                          <div>
                            <span className="text-poetry-accent block uppercase text-[9px] font-semibold">Suggested:</span>
                            <span className="text-emerald-400 font-serif">{s.suggested_line}</span>
                          </div>
                        </div>
                        <p className="text-poetry-text bg-white/5 p-2 rounded border border-poetry-border/10">
                          <strong>Change:</strong> {s.change_summary} <br />
                          <strong>Impact:</strong> {s.emotional_impact}
                        </p>
                        <button 
                          onClick={() => { applyMeterSuggestion(s.original_line, s.suggested_line); setSuggestions([]); }}
                          className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/35 border border-emerald-500/30 text-[10px] py-1 px-3 rounded font-bold"
                        >
                          Apply Replacement
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT BOARD: AI Analysis tabs */}
              <div className="lg:col-span-6 flex flex-col glass rounded-2xl border border-poetry-border/40 overflow-hidden">
                
                {/* Tab selector */}
                <div className="bg-poetry-darker/60 border-b border-poetry-border/20 p-2 flex gap-1 overflow-x-auto">
                  {[
                    { id: "flow", label: "LangGraph Flow", icon: Activity },
                    { id: "translations", label: "Translations", icon: Languages },
                    { id: "meter", label: "Meter & Rhythm", icon: BookOpenCheck },
                    { id: "reviews", label: "Audience Reviews", icon: Users },
                    { id: "design", label: "Social Cards", icon: ImageIcon },
                    { id: "publish", label: "Publish Staging", icon: Share2 },
                    { id: "history", label: "History Diff", icon: History }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDetailTab(tab.id)}
                      className={`text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all ${activeDetailTab === tab.id ? 'bg-poetry-accent/15 text-poetry-accent font-semibold border border-poetry-accent/30' : 'text-poetry-muted hover:text-poetry-text'}`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab panels */}
                <div className="flex-1 p-6 overflow-y-auto">

                  {/* 1. LangGraph Execution Flow */}
                  {activeDetailTab === "flow" && (
                    <div className="space-y-6">
                      <div className="border-b border-poetry-border/20 pb-2">
                        <h5 className="font-bold text-white">LangGraph Orchestrator Execution State</h5>
                        <p className="text-xs text-poetry-muted">Visual state machine tracking active agents and output logs.</p>
                      </div>

                      {/* Visual Flow diagram */}
                      <div className="space-y-4">
                        {[
                          { id: "fetch", label: "Fetch note", desc: "Formatting, normalization and title cleanup" },
                          { id: "translation", label: "Translation Agent", desc: "Generating Hinglish & English poetry variants" },
                          { id: "meter", label: "Meter Agent", desc: "Rule-based syllables count and meter mapping" },
                          { id: "audience", label: "Audience Personas", desc: "Parallel critique: Romantic, Critic, Instagrammer" },
                          { id: "design", label: "Design Agent", desc: "Drawing social visual cards using Pillow" },
                          { id: "publish", label: "Publish Agent", desc: "Staging schedules and API logging" }
                        ].map((node, i) => {
                          const isActive = pipelineStep === node.id;
                          const isDone = pipelineStep === null || (
                            node.id === "fetch" && pipelineStep !== "fetch" ||
                            node.id === "translation" && !["fetch", "translation"].includes(pipelineStep) ||
                            node.id === "meter" && !["fetch", "translation", "meter"].includes(pipelineStep) ||
                            node.id === "audience" && ["design", "publish", "done"].includes(pipelineStep) ||
                            node.id === "design" && ["publish", "done"].includes(pipelineStep) ||
                            node.id === "publish" && pipelineStep === "done"
                          );

                          return (
                            <div key={node.id} className="flex gap-4 items-start relative">
                              {i < 5 && (
                                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-poetry-border/25" />
                              )}
                              
                              <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center border font-bold text-xs shrink-0 z-10 transition-all ${isDone ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : isActive ? 'bg-poetry-accent/20 border-poetry-accent text-poetry-accent animate-pulse' : 'bg-poetry-darker border-poetry-border text-poetry-muted'}`}>
                                {isDone ? <Check className="w-4 h-4" /> : i + 1}
                              </div>

                              <div className={`p-3 rounded-lg border flex-1 transition-all ${isActive ? 'glass-accent border-poetry-accent' : 'bg-white/5 border-poetry-border/20'}`}>
                                <h6 className="font-semibold text-xs text-white flex items-center justify-between">
                                  {node.label}
                                  {isActive && <span className="text-[10px] text-poetry-accent font-semibold tracking-widest uppercase animate-pulse">Running</span>}
                                  {isDone && <span className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase">Done</span>}
                                </h6>
                                <p className="text-[11px] text-poetry-muted mt-1 leading-relaxed">{node.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Translations */}
                  {activeDetailTab === "translations" && (
                    <div className="space-y-6">
                      {poemDetails?.translations.map((t, idx) => (
                        <div key={idx} className="glass p-4 rounded-xl border border-poetry-border/20 space-y-3 relative group">
                          <div className="flex justify-between items-center border-b border-poetry-border/10 pb-2">
                            <span className="text-xs font-bold text-poetry-accent uppercase tracking-wider">{t.language} Variant</span>
                            <button 
                              onClick={() => { navigator.clipboard.writeText(t.content); alert("Copied to clipboard!"); }}
                              className="text-poetry-muted hover:text-white group-hover:block transition-all"
                              title="Copy translation text"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="font-serif text-sm leading-relaxed whitespace-pre-line text-poetry-text italic">
                            {t.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. Meter & Rhythm */}
                  {activeDetailTab === "meter" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-3 rounded-lg border border-poetry-border/20 text-center">
                          <span className="text-[10px] text-poetry-muted uppercase block">Poetic Structure</span>
                          <span className="font-bold text-sm text-white capitalize">{poemDetails?.meter_analysis?.bahr_chhand || 'Matra baseline: 24'}</span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-poetry-border/20 text-center">
                          <span className="text-[10px] text-poetry-muted uppercase block">Rhyme Pattern</span>
                          <span className="font-bold text-sm text-white capitalize">{poemDetails?.meter_analysis?.rhyming_consistency || 'Consistent'}</span>
                        </div>
                      </div>

                      {/* Line-by-line matra visual counts */}
                      <div className="space-y-3">
                        <h6 className="text-xs font-bold text-poetry-accent uppercase tracking-widest">Matra Syllables Count Per Line</h6>
                        <div className="space-y-2">
                          {poemDetails?.meter_analysis?.matra_counts_json?.map((item, idx) => {
                            // Baseline is the first line
                            const baseCount = poemDetails.meter_analysis.matra_counts_json[0].matra_count;
                            const isMismatch = Math.abs(item.matra_count - baseCount) > 1;

                            return (
                              <div key={idx} className={`p-3 rounded-lg flex items-center justify-between border ${isMismatch ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-poetry-border/10'}`}>
                                <div className="space-y-1">
                                  <span className="text-[9px] text-poetry-muted block">Line {item.line_number}</span>
                                  <p className="font-serif text-xs text-white">{item.line_text}</p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${isMismatch ? 'bg-amber-500 text-poetry-bg' : 'bg-poetry-accent/15 text-poetry-accent'}`}>
                                  {item.matra_count} Matras
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Line replacements suggestions */}
                      {poemDetails?.meter_analysis?.suggestions_json?.length > 0 && (
                        <div className="space-y-3 border-t border-poetry-border/20 pt-4">
                          <h6 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Meter Corrections Suggested
                          </h6>
                          {poemDetails.meter_analysis.suggestions_json.map((s, idx) => (
                            <div key={idx} className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-3">
                              <p className="text-xs text-poetry-muted">
                                <strong>Line {s.line_number} rhythm deviation:</strong> {s.reason}
                              </p>
                              {s.recommendations?.map((rec, rIdx) => (
                                <div key={rIdx} className="flex items-center justify-between bg-poetry-bg/60 p-3 rounded-lg border border-poetry-border/15">
                                  <div className="text-xs">
                                    Replace <span className="text-red-400 font-bold font-serif">"{rec.replace}"</span> with <span className="text-emerald-400 font-bold font-serif">"{rec.with}"</span>
                                    <span className="block text-[10px] text-poetry-muted mt-0.5">{rec.reason || 'Fits 24 matras'}</span>
                                  </div>
                                  <button
                                    onClick={() => applyMeterSuggestion(s.line_text, s.line_text.replace(rec.replace, rec.with))}
                                    className="bg-poetry-accent hover:bg-poetry-gold text-poetry-bg text-[10px] px-3 py-1.5 rounded font-bold flex items-center gap-1 shrink-0"
                                  >
                                    Swap Word
                                  </button>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Audience Reviews */}
                  {activeDetailTab === "reviews" && (
                    <div className="space-y-6">
                      {/* Aggregator Score Card */}
                      {poemDetails?.audience_reviews?.filter(r => r.persona_name === "Aggregator").map((agg, idx) => (
                        <div key={idx} className="bg-gradient-to-br from-poetry-accent/20 to-poetry-gold/10 p-5 rounded-xl border border-poetry-accent/35 flex items-center gap-5 justify-between">
                          <div className="space-y-2">
                            <span className="text-[10px] text-poetry-accent font-bold uppercase tracking-widest">Aggregate Feedback Verdict</span>
                            <h6 className="font-bold text-white text-sm">{agg.final_emotion || 'Romantic Melancholy'}</h6>
                            <p className="text-[11px] text-poetry-text italic mt-1 leading-relaxed">
                              "{agg.suggestion}"
                            </p>
                          </div>
                          <div className="bg-poetry-bg p-4 rounded-full border-2 border-poetry-accent text-center shrink-0 min-w-20">
                            <span className="text-3xl font-extrabold text-poetry-accent">{agg.rating}</span>
                            <span className="block text-[9px] text-poetry-muted uppercase font-bold">Consensus</span>
                          </div>
                        </div>
                      ))}

                      {/* Individual Reviews Persona Carousel */}
                      <div className="space-y-4">
                        <h6 className="text-xs font-bold text-poetry-accent uppercase tracking-widest">AI Persona Criticisms</h6>
                        <div className="space-y-4">
                          {poemDetails?.audience_reviews?.filter(r => r.persona_name !== "Aggregator").map((rev, idx) => {
                            const isRomantic = rev.persona_name === "Romantic Lover";
                            const isCritic = rev.persona_name === "Literary Critic";
                            const isInsta = rev.persona_name === "Instagram Reader";
                            
                            return (
                              <div key={idx} className="glass p-4 rounded-xl border border-poetry-border/20 space-y-3">
                                <div className="flex justify-between items-center border-b border-poetry-border/10 pb-2">
                                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                    {isRomantic && <Heart className="w-4 h-4 text-red-500 fill-red-500" />}
                                    {isCritic && <BookOpenCheck className="w-4 h-4 text-blue-400" />}
                                    {isInsta && <Instagram className="w-4 h-4 text-pink-500" />}
                                    {rev.persona_name}
                                  </span>
                                  <span className="bg-poetry-accent/15 border border-poetry-accent/30 text-poetry-accent text-xs px-2 py-0.5 rounded font-bold">
                                    {rev.rating}/10 Vibe
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-xs text-poetry-text">
                                  <p><strong>Primary Vibe:</strong> <span className="text-poetry-accent font-medium">{rev.final_emotion}</span></p>
                                  <p><strong>Favorite Line:</strong> <span className="font-serif italic text-white">"{rev.favorite_line}"</span></p>
                                  {rev.confusing_line && <p><strong>Confusing Line:</strong> <span className="font-serif text-poetry-muted line-through">"{rev.confusing_line}"</span></p>}
                                  <p><strong>Strengths:</strong> {rev.strengths_json?.join(", ")}</p>
                                  <p><strong>Weaknesses:</strong> {rev.weaknesses_json?.join(", ")}</p>
                                  <p className="bg-white/5 p-2 rounded text-poetry-muted border border-poetry-border/5">
                                    <strong>Recommendation:</strong> {rev.suggestion}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. Design Card templates */}
                  {activeDetailTab === "design" && (
                    <div className="space-y-6">
                      <div className="border-b border-poetry-border/20 pb-2">
                        <h5 className="font-bold text-white">Programmatic Social Cards Generator</h5>
                        <p className="text-xs text-poetry-muted">Design visuals using preconfigured templates generated by Pillow backend.</p>
                      </div>

                      {/* Template Selector Tabs */}
                      <div className="flex gap-2">
                        {["Dark", "Vintage", "Minimal", "Paper"].map(t => (
                          <button
                            key={t}
                            onClick={() => setActiveTemplate(t)}
                            className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${activeTemplate === t ? 'bg-poetry-accent text-poetry-bg font-bold border-poetry-accent' : 'bg-poetry-darker border-poetry-border text-poetry-muted hover:text-poetry-text'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      {/* Image Preview Container */}
                      <div className="aspect-square w-full glass rounded-xl overflow-hidden border border-poetry-border/30 relative flex flex-col items-center justify-center p-8 text-center bg-zinc-950">
                        
                        {/* Simulation of visually stunning pillow graphic card */}
                        <div 
                          className="w-full h-full rounded-lg border-2 flex flex-col justify-between p-12 transition-all shadow-2xl relative"
                          style={{
                            backgroundColor: activeTemplate === "Dark" ? "#140f23" : activeTemplate === "Vintage" ? "#efe1cb" : activeTemplate === "Minimal" ? "#fbfbfb" : "#dad8d2",
                            borderColor: activeTemplate === "Dark" ? "#d4af37" : activeTemplate === "Vintage" ? "#8b5a2b" : activeTemplate === "Minimal" ? "#787878" : "#5a6e82",
                            color: activeTemplate === "Dark" ? "#f5e6ff" : activeTemplate === "Vintage" ? "#412d1e" : activeTemplate === "Minimal" ? "#141414" : "#282832"
                          }}
                        >
                          {/* Inner decorative border */}
                          <div 
                            className="absolute inset-4 border rounded"
                            style={{
                              borderColor: activeTemplate === "Dark" ? "rgba(212, 175, 55, 0.3)" : activeTemplate === "Vintage" ? "rgba(139, 90, 43, 0.3)" : activeTemplate === "Minimal" ? "rgba(120, 120, 120, 0.2)" : "rgba(90, 110, 130, 0.2)"
                            }}
                          />
                          
                          {/* Header / Title */}
                          <div className="text-center space-y-1 z-10">
                            <h6 className="font-serif font-bold text-2xl italic tracking-wide">{editingTitle}</h6>
                            <div 
                              className="w-16 h-0.5 mx-auto mt-2" 
                              style={{ backgroundColor: activeTemplate === "Dark" ? "#d4af37" : activeTemplate === "Vintage" ? "#8b5a2b" : activeTemplate === "Minimal" ? "#787878" : "#5a6e82" }}
                            />
                          </div>

                          {/* Body Poem lines */}
                          <div className="text-center font-serif text-lg leading-relaxed z-10 italic py-6 space-y-4">
                            {editingText.split('\n').filter(Boolean).slice(0, 3).map((l, i) => (
                              <p key={i}>"{l}"</p>
                            ))}
                          </div>

                          {/* Footer */}
                          <div className="text-center text-xs tracking-widest font-bold z-10 opacity-70 uppercase">
                            ~ Poetry Studio ~
                          </div>
                        </div>

                      </div>

                      {/* Download link trigger */}
                      <button 
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = "#";
                          link.setAttribute("download", `poem_${editingTitle.toLowerCase().replace(/\s+/g, '_')}_${activeTemplate.toLowerCase()}.png`);
                          alert(`Initiating download for ${activeTemplate} visual card PNG format.`);
                        }}
                        className="w-full bg-poetry-accent hover:bg-poetry-gold text-poetry-bg font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-poetry-accent/20"
                      >
                        <Download className="w-4 h-4" />
                        Download Rendered Card PNG
                      </button>
                    </div>
                  )}

                  {/* 6. Publishing */}
                  {activeDetailTab === "publish" && (
                    <div className="space-y-6">
                      <div className="border-b border-poetry-border/20 pb-2">
                        <h5 className="font-bold text-white">Staging Scheduler Dashboard</h5>
                        <p className="text-xs text-poetry-muted">Approve, queue, and publish cards to social networks.</p>
                      </div>

                      {/* Staged social settings card */}
                      <div className="glass p-5 rounded-xl border border-poetry-border/25 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white uppercase tracking-wide">Target Platforms</span>
                          <span className="bg-amber-500/10 border border-amber-500/35 text-amber-500 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Pending Approval
                          </span>
                        </div>
                        <div className="flex gap-4">
                          {["Instagram", "Threads", "LinkedIn"].map((platform, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-white/5 border border-poetry-border/10 py-1.5 px-3 rounded-lg text-xs font-semibold text-white">
                              <Instagram className="w-3.5 h-3.5 text-poetry-accent" />
                              {platform}
                            </div>
                          ))}
                        </div>
                        
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-poetry-muted block uppercase font-bold">Staged Caption Payload</span>
                          <div className="bg-poetry-darker p-3 rounded-lg border border-poetry-border/10 text-xs font-mono text-poetry-text leading-relaxed">
                            New poetry: {editingTitle}. Crafting emotions in Devanagari. Generated with #PoetryStudio AI
                          </div>
                        </div>

                        <div className="flex gap-4 border-t border-poetry-border/10 pt-4 text-xs text-poetry-muted font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Scheduled: Instant Staging
                          </span>
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-4 h-4" />
                            Visual Asset Attached
                          </span>
                        </div>
                      </div>

                      {/* Approval triggers */}
                      <button 
                        onClick={() => approveAndPublishStaged(selectedPoemId)}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-poetry-bg font-extrabold text-xs py-3 rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all active:scale-98"
                      >
                        <Send className="w-4 h-4" />
                        Approve and Publish Post
                      </button>
                    </div>
                  )}

                  {/* 7. History Timeline */}
                  {activeDetailTab === "history" && (
                    <div className="space-y-6">
                      <div className="border-b border-poetry-border/20 pb-2">
                        <h5 className="font-bold text-white">Version Revisions History</h5>
                        <p className="text-xs text-poetry-muted">Line-by-line diff summaries showing all AI edits and manual savings.</p>
                      </div>

                      <div className="relative border-l border-poetry-border/25 ml-4 pl-6 space-y-6">
                        {poemDetails?.versions.map((ver, idx) => (
                          <div key={idx} className="relative space-y-2">
                            {/* Bullet */}
                            <div className="absolute -left-10 top-1 w-8.5 h-8.5 rounded-full bg-poetry-bg border border-poetry-border/30 flex items-center justify-center font-bold text-[10px] text-poetry-accent">
                              v{ver.version_number}
                            </div>
                            
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-white">Modified by: {ver.created_by}</span>
                              <span className="text-poetry-muted flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(ver.created_at).toLocaleTimeString()}
                              </span>
                            </div>

                            {/* Diff summary box */}
                            {ver.diff_summary && (
                              <div className="bg-poetry-darker/60 p-3 rounded-lg border border-poetry-border/10 text-xs leading-relaxed font-serif">
                                <span className="text-[9px] text-poetry-accent uppercase font-bold block mb-1">Diff Summary</span>
                                {ver.diff_summary.split('\n').map((line, lIdx) => {
                                  let cls = "text-poetry-text";
                                  if (line.startsWith('+')) cls = "diff-added";
                                  else if (line.startsWith('-')) cls = "diff-removed";
                                  else if (line.startsWith('?')) cls = "diff-info";
                                  return (
                                    <div key={lIdx} className={cls}>
                                      {line}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

          {/* TAB 3: STAGING SCHEDULER VIEW */}
          {activeTab === "publish" && (
            <div className="space-y-6">
              <div className="border-b border-poetry-border/20 pb-2">
                <h4 className="text-lg font-bold text-white">Social Media Scheduled Pipeline Queue</h4>
                <p className="text-xs text-poetry-muted">List of drafted campaigns waiting for approval before Simulated API Publishing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {poems.slice(0, 2).map((p, idx) => (
                  <div key={idx} className="glass p-5 rounded-xl border border-poetry-border/25 space-y-4">
                    <div className="flex justify-between items-center border-b border-poetry-border/10 pb-2.5">
                      <div>
                        <h5 className="font-bold text-white font-serif">{p.title}</h5>
                        <span className="text-[10px] text-poetry-muted font-medium uppercase tracking-wider">Scheduled for: Instant Staging</span>
                      </div>
                      <span className="bg-amber-500/10 border border-amber-500/35 text-amber-500 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Pending
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {["Instagram", "LinkedIn", "Threads"].map((plat, pIdx) => (
                        <span key={pIdx} className="bg-white/5 border border-poetry-border/10 text-xs px-2.5 py-1 rounded text-poetry-text">
                          {plat}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-poetry-muted italic leading-relaxed">
                      "New poetry: {p.title}. Crafted and analyzed using Devanagari meter algorithms on #PoetryStudio."
                    </p>

                    <div className="flex gap-4 pt-2">
                      <button 
                        onClick={() => approveAndPublishStaged(p.id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-poetry-bg font-bold text-xs py-2 px-4 rounded-lg flex-1 text-center"
                      >
                        Approve Release
                      </button>
                      <button 
                        onClick={() => { setActiveTab("poems"); selectPoem(p.id); }}
                        className="bg-white/5 border border-poetry-border/15 hover:bg-white/10 text-poetry-muted hover:text-white font-bold text-xs py-2 px-4 rounded-lg flex-1 text-center"
                      >
                        Edit Post
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: EVENT AUDIT TRAIL VIEW */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div className="border-b border-poetry-border/20 pb-2">
                <h4 className="text-lg font-bold text-white">Event Log Audit Trails</h4>
                <p className="text-xs text-poetry-muted">Under-the-hood trace of database transactions, background pipelines and agent actions.</p>
              </div>

              <div className="glass rounded-xl overflow-hidden border border-poetry-border/30">
                <div className="bg-poetry-darker/60 border-b border-poetry-border/30 p-3 text-xs text-poetry-muted grid grid-cols-12 font-bold uppercase tracking-wider">
                  <div className="col-span-3">Timestamp</div>
                  <div className="col-span-3">Event Name</div>
                  <div className="col-span-6">Payload Summary</div>
                </div>
                <div className="divide-y divide-poetry-border/15 max-h-[500px] overflow-y-auto">
                  {(poemDetails?.events || logs).map((evt, idx) => (
                    <div key={idx} className="p-3 text-xs grid grid-cols-12 hover:bg-white/5 transition-all text-poetry-text font-mono">
                      <div className="col-span-3 text-poetry-muted">{new Date(evt.emitted_at || new Date()).toLocaleString()}</div>
                      <div className="col-span-3 text-poetry-accent font-semibold">{evt.event_name}</div>
                      <div className="col-span-6 text-poetry-muted truncate">{JSON.stringify(evt.payload_json || { status: "logged" })}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
