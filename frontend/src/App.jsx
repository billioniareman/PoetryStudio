import React, { useState, useEffect } from 'react';

const API_BASE = "http://localhost:8000";

// Standard sample poems for offline fallback
const CLIENT_MOCK_POEMS = [
  {
    id: 101,
    title: "Ozymandias",
    original_text: "I met a traveller from an antique land,\nWho said—“Two vast and trunkless legs of stone\nStand in the desert. . . . Near them, on the sand,\nHalf sunk a shattered visage lies, whose frown,\nAnd wrinkled lip, and sneer of cold command,\nTell that its sculptor well those passions read\nWhich yet survive, stamped on these lifeless things,\nThe hand that mocked them, and the heart that fed;\nAnd on the pedestal, these words appear:\nMy name is Ozymandias, King of Kings;\nLook on my Works, ye Mighty, and despair!\nNothing beside remains. Round the decay\nOf that colossal Wreck, boundless and bare\nThe lone and level sands stretch far away.",
    author: "Percy Bysshe Shelley",
    tags: "Classic,Philosophical",
    category: "Sonnet",
    is_draft: false,
    is_published: true,
    created_at: "2023-10-01T12:00:00Z",
    updated_at: "2023-10-01T12:00:00Z"
  },
  {
    id: 102,
    title: "Autumn's Sigh",
    original_text: "Leaves fall like whispered secrets,\nGolden hues upon the grey stone,\nA chill wind carries memories...",
    author: "Percy Bysshe Shelley",
    tags: "Nature,Melancholy",
    category: "Free Verse",
    is_draft: true,
    is_published: false,
    created_at: "2023-10-24T12:00:00Z",
    updated_at: "2023-10-24T12:00:00Z"
  },
  {
    id: 103,
    title: "The Midnight Sea",
    original_text: "Dark waters churning beneath a pale moon,\nStars reflected in the violent swell,\nA lonely lighthouse cuts the gloom...",
    author: "Percy Bysshe Shelley",
    tags: "Mysterious,Atmospheric",
    category: "Sonnet",
    is_draft: false,
    is_published: true,
    created_at: "2023-10-12T12:00:00Z",
    updated_at: "2023-10-12T12:00:00Z"
  },
  {
    id: 104,
    title: "Echoes of Dawn",
    original_text: "First light breaking through the pines,\nBirdsong answers the fading night,\nA new day written in golden lines...",
    author: "Percy Bysshe Shelley",
    tags: "Hope,Morning",
    category: "Haiku",
    is_draft: true,
    is_published: false,
    created_at: "2023-09-28T12:00:00Z",
    updated_at: "2023-09-28T12:00:00Z"
  }
];

export default function App() {
  // Navigation & Core State
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, kaagaz, kitabghar, review
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [poems, setPoems] = useState(CLIENT_MOCK_POEMS);
  const [selectedPoemId, setSelectedPoemId] = useState(101);
  const [focusMode, setFocusMode] = useState(false);
  
  // Active selected poem details
  const [poemDetails, setPoemDetails] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingText, setEditingText] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  
  // Pipeline Loading Status for Keep Import
  const [importing, setImporting] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(null); // fetch, translation, meter, audience, design, publish, done
  const [logs, setLogs] = useState([]);
  
  // Editor AI suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Auto-save & AI status feedback messages
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEvaluatingAudience, setIsEvaluatingAudience] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("translation"); // translation, audience
  const [audienceFilter, setAudienceFilter] = useState("all"); // all, romantic, critic, instagram, aggregator

  const getPersonaConfig = (personaName) => {
    const name = (personaName || "").toLowerCase();
    if (name.includes("romantic")) {
      return {
        icon: "favorite",
        cardBorder: "border-l-4 border-l-rose-500",
        badgeBg: "bg-rose-50 text-rose-700 border border-rose-200",
        accent: "text-rose-600",
        label: "Romantic Lover"
      };
    } else if (name.includes("critic")) {
      return {
        icon: "menu_book",
        cardBorder: "border-l-4 border-l-indigo-500",
        badgeBg: "bg-indigo-50 text-indigo-700 border border-indigo-200",
        accent: "text-indigo-600",
        label: "Literary Critic"
      };
    } else if (name.includes("instagram")) {
      return {
        icon: "share",
        cardBorder: "border-l-4 border-l-purple-500",
        badgeBg: "bg-purple-50 text-purple-700 border border-purple-200",
        accent: "text-purple-600",
        label: "Instagram Reader"
      };
    } else {
      return {
        icon: "auto_awesome",
        cardBorder: "border-l-4 border-l-amber-500",
        badgeBg: "bg-amber-50 text-amber-800 border border-amber-200",
        accent: "text-amber-600",
        label: "Consensus Aggregator"
      };
    }
  };

  // Check backend server health on mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Update focus-mode class on body
  useEffect(() => {
    if (focusMode) {
      document.body.classList.add('focus-mode');
    } else {
      document.body.classList.remove('focus-mode');
    }
  }, [focusMode]);

  // Debounced auto-save and live translation effect
  useEffect(() => {
    if (!editingText && !editingTitle) return;
    setSaveStatus("Typing...");

    const delayDebounceFn = setTimeout(async () => {
      // 1. Save changes to server/local state
      const savedId = await savePoemToServer(editingText, editingTitle);
      const activeId = savedId || selectedPoemId;
      if (!activeId) return;

      // 2. Perform live translation update
      if (isBackendOnline) {
        try {
          const res = await fetch(`${API_BASE}/poems/${activeId}/translate`, { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ original_text: editingText })
          });
          if (res.ok) {
            const transData = await res.json();
            setPoemDetails(prev => {
              const updatedTranslations = prev ? [...prev.translations] : [];
              const hasHindi = updatedTranslations.some(t => t.language.includes("Hindi"));
              
              let newTrans;
              if (hasHindi) {
                newTrans = updatedTranslations.map(t => 
                  t.language.includes("Hindi") ? { ...t, content: transData.translation } : t
                );
              } else {
                newTrans = [
                  ...updatedTranslations,
                  { id: Date.now(), language: "Hindi", content: transData.translation }
                ];
              }
              
              return prev ? {
                ...prev,
                translations: newTrans
              } : {
                poem: { id: activeId, title: editingTitle, original_text: editingText, category: "Free Verse" },
                translations: newTrans,
                versions: [],
                meter_analysis: { bahr_chhand: "Baseline", rhyming_consistency: "Consistent", suggestions_json: [], matra_counts_json: [] },
                audience_reviews: [],
                generated_media: [],
                events: []
              };
            });
          }
        } catch (e) {
          console.error("Live translation error", e);
        }
      } else {
        // Offline translation simulation using dynamic rules
        setPoemDetails(prev => {
          const updatedTranslations = prev ? [...prev.translations] : [];
          const hasHindi = updatedTranslations.some(t => t.language.includes("Hindi"));
          
          const translatedMockContent = "Simulated Live Hindi Translation:\n" + 
            editingText.split('\n').map(line => {
              let l = line.toLowerCase();
              l = l.replace(/\bhello\b/g, "नमस्ते")
                   .replace(/\bwater\b/g, "पानी")
                   .replace(/\brain\b/g, "बरसात")
                   .replace(/\bpain\b/g, "दर्द")
                   .replace(/\bwhisper\b/g, "फुसफुसाहट")
                   .replace(/\bsigh\b/g, "आह")
                   .replace(/\bsea\b/g, "समुद्र")
                   .replace(/\bmoon\b/g, "चाँद")
                   .replace(/\bstar\b/g, "तारा")
                   .replace(/\bsolace\b/g, "सुकून");
              return l;
            }).join('\n');

          let newTrans;
          if (hasHindi) {
            newTrans = updatedTranslations.map(t => 
              t.language.includes("Hindi") ? { ...t, content: translatedMockContent } : t
            );
          } else {
            newTrans = [
              ...updatedTranslations,
              { id: Date.now(), language: "Hindi", content: translatedMockContent }
            ];
          }

          return prev ? {
            ...prev,
            translations: newTrans
          } : {
            poem: { id: activeId, title: editingTitle, original_text: editingText, category: "Free Verse" },
            translations: newTrans,
            versions: [],
            meter_analysis: { bahr_chhand: "Baseline", rhyming_consistency: "Consistent", suggestions_json: [], matra_counts_json: [] },
            audience_reviews: [],
            generated_media: [],
            events: []
          };
        });
      }
    }, 1200);

    return () => clearTimeout(delayDebounceFn);
  }, [editingText, editingTitle]);

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
    setShowTranslation(false);
    if (CLIENT_MOCK_POEMS.length > 0) {
      const defaultPoem = CLIENT_MOCK_POEMS[0];
      setSelectedPoemId(defaultPoem.id);
      setEditingTitle(defaultPoem.title);
      setEditingText(defaultPoem.original_text);
      setPoemDetails(generateLocalMockDetails(defaultPoem));
    }
    setLogs([
      { id: 1, event_name: "system.offline", payload_json: { msg: "API Offline. Running in simulated Client Mode." }, emitted_at: new Date().toISOString() }
    ]);
  };

  // Fetch list of poems
  const fetchPoems = async (selectFirst = false) => {
    try {
      const res = await fetch(`${API_BASE}/poems`);
      if (res.ok) {
        const data = await res.json();
        setPoems(data);
        if (data.length > 0) {
          const firstId = data[0].id;
          if (selectFirst || !selectedPoemId) {
            selectPoem(firstId, data);
          }
        }
      }
    } catch (e) {
      console.error("Fetch poems failed", e);
    }
  };

  // Select a poem and fetch full analysis details
  const selectPoem = async (poemId, poemList = poems) => {
    if (!poemId) return;
    setSelectedPoemId(poemId);
    setSuggestions([]);
    setShowTranslation(false);
    
    const poem = poemList.find(p => p.id === poemId);
    if (poem) {
      setEditingTitle(poem.title || "");
      setEditingText(poem.original_text || "");
    }

    if (!isBackendOnline) {
      if (poem) {
        setPoemDetails(generateLocalMockDetails(poem));
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/poems/${poemId}`);
      if (res.ok) {
        const data = await res.json();
        setPoemDetails(data);
        setEditingTitle(data?.poem?.title || "");
        setEditingText(data?.poem?.original_text || "");
      }
    } catch (e) {
      console.error("Fetch poem details failed", e);
    }
  };

  // Generates offline mock statistics for display
  const generateLocalMockDetails = (poem) => {
    if (!poem || !poem.original_text) return null;
    const lines = poem.original_text.split('\n').filter(l => l.trim());
    
    const countSyllables = (word) => {
      // Latin script syllable counting approximation
      if (/[a-zA-Z]/.test(word)) {
        let w = word.toLowerCase();
        if (w.endsWith('e')) w = w.slice(0, -1);
        const vowelClusters = w.match(/[aeiouy]+/g);
        return (vowelClusters ? vowelClusters.length : 1) * 2;
      }
      
      // Devanagari matra counting approximation
      let matras = 0;
      for (let i = 0; i < word.length; i++) {
        const c = word[i];
        if (/[आईऊएऐओऔाीूेैोौंः]/.test(c)) {
          matras += 2;
        } else if (c === '्') {
          matras = Math.max(0, matras - 1);
        } else if (/[अइउऋ]/.test(c) || (c >= '\u0905' && c <= '\u0939')) {
          matras += 1;
        }
      }
      return Math.max(1, matras);
    };

    const matras = lines.map((l, i) => {
      const words = l.trim().split(/\s+/).filter(Boolean);
      const totalMatras = words.reduce((sum, w) => sum + countSyllables(w), 0);
      return {
        line_number: i + 1,
        line_text: l,
        matra_count: totalMatras
      };
    });

    const secondLine = lines[1] || "";
    const secondLineWords = secondLine.split(/\s+/).filter(Boolean);
    const suggestionWord = secondLineWords[secondLineWords.length - 1] || "rain";
    const replacementWord = suggestionWord === "rain" ? "pain" : "solace";

    return {
      poem,
      versions: [
        { id: 1, version_number: 1, created_by: "FetchAgent", content: poem.original_text, diff_summary: "Initial clean import", created_at: poem.created_at }
      ],
      translations: [
        { id: 1, language: "English", content: "Translation of '" + poem.title + "' into English:\n" + lines.map(l => "Eng: " + l).join('\n') },
        { id: 2, language: "Hindi/Translation", content: "Hindi translation of '" + poem.title + "':\n" + lines.map(l => "हिंदी: " + l).join('\n') }
      ],
      meter_analysis: {
        bahr_chhand: "Baseline Matra: " + (matras[0]?.matra_count || 24),
        rhyming_consistency: "Consistent",
        suggestions_json: secondLine ? [
          {
            line_number: 2,
            line_text: secondLine,
            current_matra: matras[1]?.matra_count || 24,
            target_matra: matras[0]?.matra_count || 24,
            reason: `Meter variation found at the end of the line.`,
            recommendations: [{ replace: suggestionWord, with: replacementWord, reason: "Aligns matras count" }]
          }
        ] : [],
        matra_counts_json: matras
      },
      audience_reviews: [
        { 
          id: 1, 
          persona_name: "Romantic Lover", 
          rating: 9, 
          appeal_score: 9,
          engagement_score: 9,
          strengths_json: ["Emotionally vulnerable confession", "Beautiful, tender word choices"], 
          weaknesses_json: ["Rhythm softens slightly at the couplet transition"], 
          favorite_line: lines[0] || "No text", 
          confusing_line: null, 
          suggestion: "Deepen the sensory intimacy and emotional contrast in: '" + (lines[0] || "") + "'", 
          actionable_enhancements_json: [
            "Amplify tactile sensory details (warmth, breath, touch) around the opening line.",
            "Contrast lingering longing with the physical presence of the beloved.",
            "Let couplets breathe for a more tender, unforgettable afterglow."
          ],
          final_emotion: "Yearning (Ishq-e-Haqiqi)" 
        },
        { 
          id: 2, 
          persona_name: "Literary Critic", 
          rating: 8, 
          appeal_score: 8,
          engagement_score: 8,
          strengths_json: ["Lyrical ghazal cadence", "Avoids tired romantic clichés"], 
          weaknesses_json: ["Rhyme scheme leans slightly conventional in line 2"], 
          favorite_line: lines[0] || "No text", 
          confusing_line: lines[1] || null, 
          suggestion: "Refine word choices in '" + (lines[1] || "") + "' to elevate technical craftsmanship.", 
          actionable_enhancements_json: [
            "Substitute predictable end-rhymes with fresher, unexpected lexical terms.",
            "Tighten metric syllable weights across both lines for classical symmetry.",
            "Let the central metaphor carry deeper philosophical subtext."
          ],
          final_emotion: "Aesthetic Appreciation" 
        },
        { 
          id: 3, 
          persona_name: "Instagram Reader", 
          rating: 9, 
          appeal_score: 10,
          engagement_score: 9,
          strengths_json: ["High screenshot and save appeal", "Relatable quote aesthetic"], 
          weaknesses_json: ["Line 2 could be slightly punchier for rapid mobile reading"], 
          favorite_line: lines[0] || "No text", 
          confusing_line: null, 
          suggestion: "Feature the opening couplet '" + (lines[0] || "") + "' as a high-contrast quote card.", 
          actionable_enhancements_json: [
            "Make line 1 punchier as an instant 2-second scroll-stopping hook.",
            "Deliver a memorable mic-drop punchline in the final couplet.",
            "Pair with dark, minimalist aesthetics and mood ambient audio."
          ],
          final_emotion: "Aesthetic Romance & Cozy Vibes" 
        },
        {
          id: 4,
          persona_name: "Aggregator",
          rating: 9,
          appeal_score: 9,
          engagement_score: 9,
          strengths_json: ["Lyrical ghazal cadence", "High screenshot and save appeal", "Emotionally vulnerable confession"],
          weaknesses_json: ["Rhythm softens slightly at the couplet break", "Line 2 could be slightly punchier"],
          favorite_line: lines[0] || "No text",
          confusing_line: null,
          suggestion: "Harmonize classical depth with punchy modern delivery for maximum audience reach.",
          actionable_enhancements_json: [
            "Anchor romantic vulnerability with concrete, tangible imagery.",
            "Maintain tight metric flow while preserving conversational intimacy.",
            "Structure the couplets for both deep contemplative reading and visual social sharing."
          ],
          final_emotion: "Consensus: Resonant Longing"
        }
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

  // Simulated live execution loader for Google Keep Import
  const triggerGoogleKeepImport = async () => {
    setImporting(true);
    setPipelineStep("fetch");
    setLogs(prev => [{ id: Date.now(), event_name: "pipeline.started", payload_json: { msg: "Importing notes from Google Keep..." }, emitted_at: new Date().toISOString() }, ...prev]);

    await new Promise(r => setTimeout(r, 1000));
    setPipelineStep("translation");
    setLogs(prev => [{ id: Date.now(), event_name: "poem.imported", payload_json: { msg: "FetchAgent: Normalized text & extracted title." }, emitted_at: new Date().toISOString() }, ...prev]);

    await new Promise(r => setTimeout(r, 1000));
    setPipelineStep("meter");
    setLogs(prev => [{ id: Date.now(), event_name: "translation.completed", payload_json: { msg: "TranslationAgent: Hinglish & English versions saved." }, emitted_at: new Date().toISOString() }, ...prev]);

    await new Promise(r => setTimeout(r, 1000));
    setPipelineStep("audience");
    setLogs(prev => [{ id: Date.now(), event_name: "meter.completed", payload_json: { msg: "MeterAgent: Syllable count matched to base matra." }, emitted_at: new Date().toISOString() }, ...prev]);

    await new Promise(r => setTimeout(r, 1000));
    setPipelineStep("design");
    setLogs(prev => [{ id: Date.now(), event_name: "audience.reviewed", payload_json: { msg: "AudienceReviewers: Merged Romantic/Critic reviews." }, emitted_at: new Date().toISOString() }, ...prev]);

    await new Promise(r => setTimeout(r, 1000));
    setPipelineStep("publish");
    setLogs(prev => [{ id: Date.now(), event_name: "design.completed", payload_json: { msg: "DesignAgent: Generated themed social visual cards." }, emitted_at: new Date().toISOString() }, ...prev]);

    await new Promise(r => setTimeout(r, 800));
    setPipelineStep("done");
    
    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_BASE}/poems/import`, { method: 'POST' });
        if (res.ok) {
          const newPoems = await res.json();
          await fetchPoems();
          if (newPoems.length > 0) {
            selectPoem(newPoems[newPoems.length - 1].id, newPoems);
          }
        }
      } catch (e) {
        console.error("Keep backend fetch failed", e);
      }
    } else {
      // Offline Simulation: Add the mock Faiz poem
      if (poems.length < 5) {
        const imported = {
          id: 105,
          title: "नक्श-ए-फ़रियादी",
          original_text: "मुझसे पहली सी मोहब्बत मेरे महबूब न माँग,\nमैंने समझा था कि तू है तो दरख़्शाँ है हयात।\nतेरा ग़म है तो ग़म-ए-दहर का झगड़ा क्या है,\nतेरी सूरत से है आलम में बहारों को सबात।",
          author: "Faiz Ahmed Faiz",
          tags: "Faiz,Nostalgia",
          category: "Nazm",
          is_draft: true,
          is_published: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const updatedPoems = [...poems, imported];
        setPoems(updatedPoems);
        setSelectedPoemId(105);
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
    if (!selectedPoemId) return;
    setIsAnalyzing(true);
    setSaveStatus("Analyzing...");
    
    if (!isBackendOnline) {
      await new Promise(r => setTimeout(r, 1200));
      const poem = poems.find(p => p.id === selectedPoemId);
      if (poem) {
        setPoemDetails(generateLocalMockDetails(poem));
      }
      setSaveStatus("Saved & Analyzed");
      setIsAnalyzing(false);
      setActiveTab("review");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/poems/${selectedPoemId}/reanalyze`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPoemDetails(data);
        setSaveStatus("Saved & Analyzed");
        setActiveTab("review");
      }
    } catch (e) {
      console.error(e);
      setSaveStatus("Failed");
    }
    setIsAnalyzing(false);
  };

  // Run fast Audience evaluation on the active poem
  const runAudienceEvaluation = async () => {
    if (!selectedPoemId) return;
    setIsEvaluatingAudience(true);
    setSaveStatus("Audience evaluating...");

    if (!isBackendOnline) {
      await new Promise(r => setTimeout(r, 600));
      const poem = poems.find(p => p.id === selectedPoemId);
      if (poem) {
        setPoemDetails(generateLocalMockDetails(poem));
      }
      setSaveStatus("Audience Reviewed");
      setIsEvaluatingAudience(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/poems/${selectedPoemId}/audience-review`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPoemDetails(data);
        setSaveStatus("Audience Reviewed");
      }
    } catch (e) {
      console.error("Audience review failed", e);
      setSaveStatus("Review Failed");
    }
    setIsEvaluatingAudience(false);
  };

  // Handles fast local updates on typing
  const handleEditorUpdate = async (newText, newTitle = editingTitle) => {
    setEditingText(newText);
    setEditingTitle(newTitle);
    setSaveStatus("Typing...");
  };

  // Save/Create poem backend call
  const savePoemToServer = async (text, title) => {
    if (!text && !title) return null;

    if (!selectedPoemId) {
      // Create new poem record
      if (!isBackendOnline) {
        const newPoem = {
          id: Date.now(),
          title: title || "Untitled Poem",
          original_text: text,
          author: "user",
          tags: "Draft",
          category: "Free Verse",
          is_draft: true,
          is_published: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setPoems(prev => [newPoem, ...prev]);
        setSelectedPoemId(newPoem.id);
        setPoemDetails(generateLocalMockDetails(newPoem));
        setSaveStatus("Saved");
        return newPoem.id;
      }

      try {
        const res = await fetch(`${API_BASE}/poems`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title || "Untitled", original_text: text, language: "Hindi", source: "manual" })
        });
        if (res.ok) {
          const created = await res.json();
          setPoems(prev => [created, ...prev]);
          setSelectedPoemId(created.id);
          const detailRes = await fetch(`${API_BASE}/poems/${created.id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            setPoemDetails(detailData);
          }
          setSaveStatus("Saved");
          return created.id;
        }
      } catch (e) {
        console.error("Failed to create poem", e);
      }
      return null;
    }

    // Save existing poem
    setPoems(prev => prev.map(p => p.id === selectedPoemId ? { ...p, original_text: text, title: title } : p));

    if (!isBackendOnline) {
      const poem = poems.find(p => p.id === selectedPoemId);
      if (poem) {
        setPoemDetails(generateLocalMockDetails({ ...poem, original_text: text, title: title }));
      }
      setSaveStatus("Saved");
      return selectedPoemId;
    }

    try {
      const res = await fetch(`${API_BASE}/poems/${selectedPoemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_text: text, title: title })
      });
      if (res.ok) {
        setSaveStatus("Saved");
      }
    } catch (e) {
      console.error("Auto save failed", e);
      setSaveStatus("Offline/Failed");
    }
    return selectedPoemId;
  };

  // Apply suggestions from MeterAgent
  const applyMeterSuggestion = async (originalLine, replacement) => {
    const newText = editingText.replace(originalLine, replacement);
    setEditingText(newText);
    await savePoemToServer(newText, editingTitle);
    
    if (isBackendOnline) {
      await runPipelineReanalysis();
    } else {
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
            suggestions_json: [],
            matra_counts_json: newMatras
          }
        };
      });
    }
  };

  // Fetch voice-preserving editing improvements
  const fetchEditorImprovements = async () => {
    setLoadingSuggestions(true);
    if (!isBackendOnline) {
      await new Promise(r => setTimeout(r, 600));
      setSuggestions([
        {
          original_line: poemDetails?.meter_analysis?.suggestions_json[0]?.line_text || "A thousand whispers spoken all in vain.",
          suggested_line: "A thousand whispers spoken in our pain.",
          change_summary: "Replaced 'all in vain' with 'in our pain'",
          reason: "Preserves emotional cadence.",
          emotional_impact: "Rhythmic balance."
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

  // Publish staged posts
  const approveAndPublishStaged = async () => {
    if (!isBackendOnline) {
      setPoems(prev => prev.map(p => p.id === selectedPoemId ? { ...p, is_published: true, is_draft: false } : p));
      alert("Publication approved! Shared successfully to Instagram, Threads & LinkedIn.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/poems/${selectedPoemId}/publish`, { method: "POST" });
      if (res.ok) {
        alert("Publication approved! Shared successfully.");
        fetchPoems();
        selectPoem(selectedPoemId);
      }
    } catch (e) {
      console.error(e);
      alert("Publish failed.");
    }
  };

  // Helper: word count calculation
  const getWordCount = (text) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  return (
    <div className="bg-background text-on-background font-body-md text-body-md antialiased min-h-screen flex flex-col selection:bg-tertiary-fixed selection:text-on-tertiary-fixed">
      
      {/* Top Navigation Shell */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-50 flex justify-between items-center px-6 md:px-12 bg-surface-container-lowest/70 backdrop-blur-md border border-outline-variant/60 h-16 rounded-full shadow-lg top-nav-transition sidebar-transition">
        <div className="flex items-center gap-base">
          <span 
            className="font-headline-lg text-headline-lg font-bold text-primary cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            PoetryStudio
          </span>
          {isBackendOnline ? (
            <span className="text-[11px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-label-caps">
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
              Online
            </span>
          ) : (
            <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-label-caps">
              <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
              Simulated
            </span>
          )}
        </div>
        
        <div className="hidden md:flex items-center gap-gutter">
          {/* Navigation Links */}
          <button 
            className={`font-label-caps text-label-caps pb-1 transition-all duration-200 ${
              activeTab === "kaagaz" 
                ? "text-primary border-b-2 border-primary" 
                : "text-on-surface-variant hover:text-primary hover:opacity-80"
            }`}
            onClick={() => { 
              setActiveTab("kaagaz"); 
              setFocusMode(false); 
              // Clicking Kaagaz from navigation header opens a blank canvas!
              setSelectedPoemId(null);
              setEditingTitle("");
              setEditingText("");
              setPoemDetails(null);
            }}
          >
            Kaagaz
          </button>
          <button 
            className={`font-label-caps text-label-caps pb-1 transition-all duration-200 ${
              activeTab === "dashboard" 
                ? "text-primary border-b-2 border-primary" 
                : "text-on-surface-variant hover:text-primary hover:opacity-80"
            }`}
            onClick={() => { setActiveTab("dashboard"); setFocusMode(false); }}
          >
            Dashboard
          </button>
          <button 
            className={`font-label-caps text-label-caps pb-1 transition-all duration-200 ${
              activeTab === "kitabghar" 
                ? "text-primary border-b-2 border-primary" 
                : "text-on-surface-variant hover:text-primary hover:opacity-80"
            }`}
            onClick={() => { setActiveTab("kitabghar"); setFocusMode(false); }}
          >
            Kitabghar
          </button>
        </div>

        <div className="flex items-center gap-base">
          <button 
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-outline-variant/30 transition-colors"
            onClick={() => setFocusMode(!focusMode)} 
            title="Toggle Focus Mode"
          >
            <span className="material-symbols-outlined text-on-surface">
              {focusMode ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>
        </div>
      </nav>

      {/* Main Workspace based on active Tab */}
      <main className="flex-grow w-full flex flex-col">
        
        {/* ==================== 1. DASHBOARD VIEW ==================== */}
        {activeTab === "dashboard" && (
          <div className="flex-grow pt-32 pb-stack-lg px-container-padding-mobile md:px-container-padding-desktop max-w-7xl mx-auto w-full">
            <header className="mb-stack-lg text-center md:text-left">
              <h1 className="font-display-hero text-display-hero text-primary">Your Studio</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-base">A sanctuary for your words.</p>
            </header>
            
            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
              {/* KPI Section (Left Column, Spanning 8 cols) */}
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-gutter">
                {/* KPI Card 1 */}
                <div className="bg-surface-container-lowest border border-surface-variant rounded hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-shadow duration-300 p-stack-md flex flex-col justify-center items-center text-center">
                  <span className="material-symbols-outlined text-secondary mb-base" style={{ fontSize: "32px" }}>menu_book</span>
                  <h3 className="font-headline-lg text-headline-lg text-primary">{poems.length}</h3>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">Total Poems</p>
                </div>
                {/* KPI Card 2 */}
                <div className="bg-surface-container-lowest border border-surface-variant rounded hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-shadow duration-300 p-stack-md flex flex-col justify-center items-center text-center">
                  <span className="material-symbols-outlined text-secondary mb-base" style={{ fontSize: "32px" }}>edit_document</span>
                  <h3 className="font-headline-lg text-headline-lg text-primary">
                    {(poems.reduce((acc, p) => acc + getWordCount(p.original_text), 0)).toLocaleString()}
                  </h3>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">Words Written</p>
                </div>
                {/* KPI Card 3 */}
                <div className="bg-surface-container-lowest border border-surface-variant rounded hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-shadow duration-300 p-stack-md flex flex-col justify-center items-center text-center">
                  <span className="material-symbols-outlined text-secondary mb-base" style={{ fontSize: "32px" }}>public</span>
                  <h3 className="font-headline-lg text-headline-lg text-primary">
                    {poems.filter(p => !p.is_draft).length}
                  </h3>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">Published Pieces</p>
                </div>
              </div>

              {/* Connected Sources Section (Right Column, Spanning 4 cols) */}
              <div className="md:col-span-4 bg-surface-container-lowest border border-surface-variant rounded p-stack-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-stack-md">
                    <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">Sources</h2>
                    <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">settings</span>
                  </div>
                  
                  {importing ? (
                    <div className="p-4 border border-outline-variant rounded bg-surface-container-low space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-label-caps text-label-caps font-bold text-secondary animate-pulse">Syncing notes...</span>
                        <span className="text-xs text-on-surface-variant capitalize">{pipelineStep} Agent active</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-secondary h-full transition-all duration-500" 
                          style={{ 
                            width: pipelineStep === "fetch" ? "15%" :
                                   pipelineStep === "translation" ? "35%" :
                                   pipelineStep === "meter" ? "60%" :
                                   pipelineStep === "audience" ? "80%" :
                                   pipelineStep === "design" ? "90%" : "100%" 
                          }}
                        ></div>
                      </div>
                      <div className="text-[11px] text-on-surface-variant max-h-24 overflow-y-auto font-mono space-y-1">
                        {logs.slice(0, 3).map(l => (
                          <div key={l.id}>• {l.payload_json?.msg || l.event_name}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-stack-sm p-4 border border-outline-variant rounded bg-surface transition-colors hover:bg-surface-container-low cursor-pointer"
                      onClick={triggerGoogleKeepImport}
                    >
                      <span className="material-symbols-outlined text-[#F4B400]" style={{ fontVariationSettings: '"FILL" 1' }}>note</span>
                      <div className="flex-grow">
                        <h4 className="font-body-md text-body-md font-bold text-primary">Google Keep</h4>
                        <p className="font-label-caps text-label-caps text-on-surface-variant">Sync from Google Keep</p>
                      </div>
                      <span className="material-symbols-outlined text-secondary">sync</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-base flex items-center justify-center p-4 border border-dashed border-outline-variant rounded cursor-pointer hover:bg-surface-container-low transition-colors">
                  <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Source
                  </span>
                </div>
              </div>

              {/* Recent Poems List (Full Width, Spanning 12 cols) */}
              <div className="md:col-span-12 mt-stack-md">
                <div className="flex items-center justify-between mb-stack-md">
                  <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">Recent Works</h2>
                  <button 
                    className="font-label-caps text-label-caps text-secondary hover:underline"
                    onClick={() => setActiveTab("kitabghar")}
                  >
                    View All Collection
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                  {poems.slice(0, 3).map((poem, index) => (
                    <div 
                      key={poem.id} 
                      className="bg-surface-container-lowest border border-surface-variant rounded p-8 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 group cursor-pointer flex flex-col"
                      onClick={() => {
                        selectPoem(poem.id);
                        setActiveTab("kaagaz");
                      }}
                    >
                      <div className="flex justify-between items-start mb-stack-sm">
                        <span className={`px-2 py-1 rounded font-label-caps text-label-caps ${
                          poem.is_draft 
                            ? "bg-secondary-container text-on-secondary-container" 
                            : "bg-tertiary-fixed text-on-tertiary-fixed"
                        }`}>
                          {poem.is_draft ? "Draft" : "Published"}
                        </span>
                        <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">more_vert</span>
                      </div>
                      <h3 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-2 font-display-hero">
                        {poem.title || "Untitled"}
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 mb-stack-md flex-grow whitespace-pre-wrap">
                        {poem.original_text}
                      </p>
                      <div className="mt-auto flex justify-between items-center border-t border-surface-variant pt-4">
                        <span className="font-label-caps text-label-caps text-on-surface-variant">
                          {new Date(poem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="font-label-caps text-label-caps text-on-surface-variant">
                          {poem.category || "Poem"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. KAAGAZ EDITOR VIEW ==================== */}
        {activeTab === "kaagaz" && (
          <div className="flex-grow flex pt-28 pb-stack-lg max-w-7xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop gap-stack-md relative">
            
            {/* Central Editor Canvas */}
            <section className="flex-grow py-8 relative flex flex-col w-full max-w-[720px] mx-auto">
              
              {/* Metadata Area */}
              <div className="mb-stack-lg sidebar-transition">
                <input 
                  className="w-full bg-transparent border-0 border-b border-surface-variant focus:border-primary focus:ring-0 font-headline-lg text-headline-lg text-primary placeholder:text-outline-variant pb-2 px-0 transition-colors" 
                  value={editingTitle}
                  onChange={(e) => handleEditorUpdate(editingText, e.target.value)}
                  placeholder="Untitled Poem" 
                  type="text"
                />
                <div className="flex gap-4 mt-4 items-center">
                  <span className="font-label-caps text-label-caps bg-surface-container-highest px-3 py-1 rounded border border-outline-variant text-on-surface-variant">
                    {poemDetails?.poem?.category || "Free Verse"}
                  </span>
                  <span className="text-xs text-on-surface-variant italic font-label-caps">
                    {saveStatus}
                  </span>
                </div>
              </div>

              {/* The Editor Canvas (Simulating physical sheet of paper) */}
              <div className="flex-grow relative bg-surface-container-lowest border border-surface-variant rounded-lg p-8 shadow-sm flex flex-col min-h-[500px]">
                <textarea 
                  className="w-full flex-grow resize-none bg-transparent border-0 focus:ring-0 font-verse-primary text-verse-primary text-primary placeholder:text-outline p-0 leading-loose outline-none focus:outline-none"
                  value={editingText}
                  onChange={(e) => handleEditorUpdate(e.target.value)}
                  placeholder="Let the words breathe..."
                />
                
                {/* Save status / Word count count indicator */}
                <div className="mt-4 pt-2 border-t border-surface-variant flex justify-between items-center text-xs text-on-surface-variant font-label-caps">
                  <span>Words: {getWordCount(editingText)}</span>
                  <span>Lines: {editingText.split('\n').filter(Boolean).length}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-6 flex justify-between items-center">
                <button 
                  className="flex items-center gap-2 bg-primary text-on-primary hover:opacity-80 transition-opacity px-6 py-3 rounded shadow-sm font-label-caps text-label-caps text-xs uppercase tracking-wider disabled:opacity-50"
                  onClick={runPipelineReanalysis}
                  disabled={isAnalyzing || (!editingText && !editingTitle)}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isAnalyzing ? "sync" : "auto_awesome"}
                  </span>
                  {isAnalyzing ? "Analyzing with LangGraph..." : "Run AI Critique"}
                </button>
                
                <button 
                  className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-caps text-label-caps text-xs"
                  onClick={() => setActiveTab("kitabghar")}
                >
                  <span className="material-symbols-outlined text-sm">book</span>
                  View Reading Layout
                </button>
              </div>
            </section>

            {/* Right Sidebar: Dual Tab (Translation & Audience Insights) */}
            <aside className="w-1/3 py-8 sidebar-transition sidebar-transition-right hidden lg:flex flex-col gap-stack-sm">
              <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                <div className="flex gap-2">
                  <button 
                    className={`font-label-caps text-label-caps uppercase tracking-wider px-3 py-1 rounded transition-colors ${sidebarTab === "translation" ? "bg-primary text-on-primary font-bold shadow-xs" : "text-on-surface-variant hover:text-primary"}`}
                    onClick={() => setSidebarTab("translation")}
                  >
                    Live Translation
                  </button>
                  <button 
                    className={`font-label-caps text-label-caps uppercase tracking-wider px-3 py-1 rounded transition-colors flex items-center gap-1 ${sidebarTab === "audience" ? "bg-secondary text-on-secondary font-bold shadow-xs" : "text-on-surface-variant hover:text-secondary"}`}
                    onClick={() => setSidebarTab("audience")}
                  >
                    <span className="material-symbols-outlined text-[14px]">groups</span>
                    Audience Feedback
                  </button>
                </div>
              </div>

              {sidebarTab === "translation" ? (
                <div className="flex-grow bg-surface-container-low rounded-lg p-6 border border-outline-variant shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <p className="font-label-caps text-[11px] text-secondary uppercase tracking-widest font-bold">Hindi & Hinglish Render</p>
                    <div className="font-verse-primary text-verse-primary text-on-surface-variant whitespace-pre-wrap leading-loose italic max-h-[400px] overflow-y-auto">
                      {poemDetails?.translations?.find(t => t.language.includes("Hindi"))?.content || 
                       (editingText ? "अनुवाद लोड हो रहा है..." : "लेखन शुरू करें...")}
                    </div>
                  </div>
                  <div className="border-t border-outline-variant pt-4 text-xs text-outline italic">
                    Translation updates dynamically as you type.
                  </div>
                </div>
              ) : (
                <div className="flex-grow bg-surface-container-low rounded-lg p-6 border border-outline-variant shadow-sm flex flex-col justify-between overflow-hidden">
                  <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-[11px] text-primary uppercase tracking-widest font-bold">Audience Insights</span>
                      <button 
                        className="text-[11px] font-label-caps text-secondary hover:underline flex items-center gap-1 disabled:opacity-50"
                        onClick={runAudienceEvaluation}
                        disabled={isEvaluatingAudience || (!editingText && !editingTitle)}
                      >
                        <span className={`material-symbols-outlined text-[13px] ${isEvaluatingAudience ? "animate-spin" : ""}`}>refresh</span>
                        {isEvaluatingAudience ? "Evaluating..." : "Re-evaluate"}
                      </button>
                    </div>

                    {poemDetails?.audience_reviews && poemDetails.audience_reviews.length > 0 ? (
                      poemDetails.audience_reviews.slice(0, 3).map(rev => {
                        const cfg = getPersonaConfig(rev.persona_name);
                        const enhancements = rev.actionable_enhancements_json || rev.actionable_enhancements || [];
                        return (
                          <div key={rev.id} className={`bg-surface-container-lowest p-4 rounded border border-outline-variant ${cfg.cardBorder} shadow-xs space-y-2`}>
                            <div className="flex justify-between items-center">
                              <span className="font-label-caps text-xs font-bold text-primary flex items-center gap-1">
                                <span className={`material-symbols-outlined text-sm ${cfg.accent}`}>{cfg.icon}</span>
                                {rev.persona_name}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${cfg.badgeBg}`}>{rev.rating}/10</span>
                            </div>
                            <p className="text-xs text-on-surface italic">"{rev.suggestion}"</p>
                            {enhancements.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-outline-variant/50">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1 mb-1">
                                  <span className="material-symbols-outlined text-[12px]">tips_and_updates</span>
                                  Enhance Appeal & Engagement:
                                </span>
                                <ul className="text-[11px] text-on-surface-variant space-y-1 pl-3 list-disc">
                                  {enhancements.slice(0, 2).map((enh, eIdx) => (
                                    <li key={eIdx}>{enh}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-on-surface-variant text-xs italic">
                        No reviews yet. Click "Run AI Critique" or Re-evaluate to get audience feedback.
                      </div>
                    )}
                  </div>
                  <div className="border-t border-outline-variant pt-3 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-outline">Targeted audience feedback</span>
                    <button 
                      className="font-label-caps text-[11px] text-primary hover:underline font-bold"
                      onClick={() => setActiveTab("review")}
                    >
                      Full Report →
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* ==================== 3. KITABGHAR VIEW ==================== */}
        {activeTab === "kitabghar" && (
          <div className="flex-grow flex pt-28 pb-stack-lg max-w-[1440px] mx-auto w-full px-container-padding-mobile relative">
            
            {/* Left Sidebar: Collection list */}
            <aside className="w-[260px] bg-surface-container-low border border-outline-variant z-40 hidden md:flex flex-col py-8 px-6 my-8 rounded-xl shadow-sm border sidebar-transition shrink-0 h-[calc(100vh-12rem)] overflow-y-auto">
              <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-6 tracking-widest font-bold">YOUR COLLECTION</h2>
              <nav className="flex flex-col gap-2">
                {poems.map(poem => {
                  const isActive = poem.id === selectedPoemId;
                  return (
                    <button 
                      key={poem.id}
                      className={`flex items-center text-left px-3 py-2 rounded text-sm relative transition-colors ${
                        isActive 
                          ? "bg-secondary-container/50 text-primary font-bold" 
                          : "text-on-surface-variant hover:bg-outline-variant/20 hover:text-primary"
                      }`}
                      onClick={() => selectPoem(poem.id)}
                    >
                      {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-secondary rounded-full"></div>}
                      <span className="truncate">{poem.title || "Untitled"}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Central Canvas Reader */}
            <main className="flex-grow max-w-[720px] mx-auto py-8 flex flex-col relative group md:ml-12">
              <div className="absolute inset-0 bg-surface-container-lowest opacity-0 group-hover:opacity-100 transition-opacity duration-1000 shadow-[0_0_20px_rgba(0,0,0,0.03)] -z-10 rounded-lg pointer-events-none hidden md:block"></div>
              
              <article className="relative z-10 flex flex-col items-center flex-grow pt-12 pb-24 px-8 md:px-16 transition-all duration-500 shadow-none">
                
                {/* Metadata Header */}
                <header className="text-center mb-16 flex flex-col items-center">
                  <div className="inline-block px-3 py-1 bg-secondary-fixed/30 rounded font-label-caps text-label-caps text-on-secondary-fixed mb-stack-md tracking-widest uppercase">
                    {poemDetails?.poem?.category || "Verse"}
                  </div>
                  <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-stack-sm max-w-2xl leading-tight font-display-hero">
                    {editingTitle || "Untitled"}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-8 h-[1px] bg-outline-variant"></div>
                    <p className="font-body-md text-body-md text-on-surface-variant italic">
                      By {poemDetails?.poem?.author || "Writer"}
                    </p>
                    <div className="w-8 h-[1px] bg-outline-variant"></div>
                  </div>

                  {/* Hindi Translation Toggle */}
                  <div className="mt-8 flex bg-surface-container-high p-1 rounded-full border border-outline-variant select-none">
                    <button
                      className={`px-4 py-1.5 rounded-full text-xs font-label-caps tracking-wider transition-all duration-300 ${
                        !showTranslation 
                          ? "bg-primary text-on-primary shadow-sm" 
                          : "text-on-surface-variant hover:text-primary"
                      }`}
                      onClick={() => setShowTranslation(false)}
                    >
                      Original
                    </button>
                    <button
                      className={`px-4 py-1.5 rounded-full text-xs font-label-caps tracking-wider transition-all duration-300 ${
                        showTranslation 
                          ? "bg-primary text-on-primary shadow-sm" 
                          : "text-on-surface-variant hover:text-primary"
                      }`}
                      onClick={() => setShowTranslation(true)}
                    >
                      Hindi Translation
                    </button>
                  </div>
                </header>

                {/* Poem Body */}
                <div className="font-verse-primary text-verse-primary text-on-surface whitespace-pre-wrap max-w-prose text-left mx-auto leading-loose selection:bg-tertiary-fixed selection:text-on-tertiary-fixed">
                  {showTranslation 
                    ? (poemDetails?.translations?.find(t => t.language.includes("Hindi"))?.content || 
                       "Hindi translation is not available yet. Please open this poem in 'Kaagaz' to trigger translation.")
                    : (editingText || "This poem is empty.")
                  }
                </div>

                <div className="mt-20 border-t border-outline-variant pt-6 w-full flex justify-center items-center gap-6">
                  <button 
                    className="flex items-center gap-2 text-xs font-label-caps text-secondary hover:text-primary transition-colors"
                    onClick={() => {
                      selectPoem(selectedPoemId); // fetch exact current draft poem values
                      setFocusMode(false);
                      setActiveTab("kaagaz");
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit Poem
                  </button>

                  <div className="w-[1px] h-4 bg-outline-variant"></div>

                  <button 
                    className="flex items-center gap-2 bg-primary text-on-primary hover:opacity-90 transition-opacity px-5 py-2.5 rounded-full text-xs font-label-caps uppercase tracking-wider shadow-md"
                    onClick={() => {
                      setActiveTab("review");
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    Analyze & Post
                  </button>
                </div>
              </article>
            </main>
          </div>
        )}

        {/* ==================== 4. AGENT REVIEW VIEW ==================== */}
        {activeTab === "review" && (
          <div className="flex-grow pt-28 pb-stack-lg px-container-padding-desktop max-w-[1440px] mx-auto w-full">
            
            {/* Workspace Header */}
            <div className="flex justify-between items-end mb-stack-lg border-b border-outline-variant pb-base">
              <div>
                <h2 className="text-xs font-label-caps text-on-surface-variant tracking-wider uppercase mb-1">
                  AI Review Evidence report
                </h2>
                <h1 className="font-display-hero text-display-hero text-primary mb-2 font-bold">
                  {editingTitle}
                </h1>
                <div className="flex gap-2">
                  <span className="bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps px-3 py-1 rounded-sm uppercase">
                    {poemDetails?.poem?.category || "Nazm"}
                  </span>
                  <span className="bg-surface-container-high text-on-surface-variant font-label-caps text-label-caps px-3 py-1 rounded-sm uppercase">
                    {poemDetails?.poem?.is_published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-stack-sm">
                <button 
                  className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors px-4 py-2 border border-outline-variant rounded bg-white text-xs font-label-caps shadow-sm"
                  onClick={() => setActiveTab("kaagaz")}
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  <span>Back to Kaagaz</span>
                </button>
                <button 
                  className="flex items-center gap-2 bg-primary text-on-primary hover:opacity-85 transition-opacity px-6 py-2 rounded text-xs font-label-caps uppercase tracking-wide shadow-sm"
                  onClick={approveAndPublishStaged}
                >
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  <span>Approve & Publish</span>
                </button>
              </div>
            </div>

            {/* 3-Column Layout */}
            <div className="grid grid-cols-12 gap-gutter relative">
              
              {/* Left Column: Meter Agent (Technical) */}
              <aside className="col-span-12 md:col-span-3 space-y-stack-md">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>graphic_eq</span>
                  <h3 className="font-label-caps text-label-caps text-secondary tracking-widest uppercase font-bold">Meter Agent</h3>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded ambient-shadow relative space-y-3">
                  <div className="font-label-caps text-label-caps text-on-surface-variant font-bold">Line-by-Line Syllable Count</div>
                  
                  {/* Visually displays the matra count evidence for each line of the selected poem */}
                  <div className="space-y-2">
                    {poemDetails?.meter_analysis?.matra_counts_json?.map((m, mIdx) => (
                      <div key={mIdx} className="flex flex-col gap-1 p-2 bg-surface-container-low rounded border border-outline-variant">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="truncate max-w-[140px] italic">"{m.line_text}"</span>
                          <span className="font-bold text-secondary font-mono">{m.matra_count} Matras</span>
                        </div>
                        {/* Visual Matra Bar */}
                        <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-secondary h-full"
                            style={{ width: `${Math.min(100, (m.matra_count / 28) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-outline-variant pt-3 flex justify-between items-center text-[11px] text-secondary font-label-caps font-bold">
                    <span>Base Bahr: {poemDetails?.meter_analysis?.bahr_chhand || "Baseline"}</span>
                  </div>
                </div>

                {/* Meter Annotation Suggestions */}
                {poemDetails?.meter_analysis?.suggestions_json?.length > 0 ? (
                  poemDetails.meter_analysis.suggestions_json.map((s, idx) => (
                    <div key={idx} className="bg-surface-container-lowest border border-outline-variant p-4 rounded ambient-shadow relative border-l-4 border-l-secondary">
                      <div className="font-label-caps text-label-caps text-on-surface-variant mb-1 font-bold">Line {s.line_number} Correction</div>
                      <p className="text-[11px] text-on-surface mb-3 italic">"{s.line_text}"</p>
                      <p className="text-xs text-on-surface mb-3 font-semibold text-secondary">{s.reason}</p>
                      {s.recommendations?.map((rec, rIdx) => (
                        <button 
                          key={rIdx}
                          className="w-full text-left bg-surface-container-low hover:bg-secondary-container/30 border border-outline-variant p-2 rounded text-xs text-primary transition-all font-body-md"
                          onClick={() => applyMeterSuggestion(s.line_text, editingText.replace(rec.replace, rec.with))}
                        >
                          Replace <strong className="line-through text-red-700">{rec.replace}</strong> → <strong className="text-green-700">{rec.with}</strong>
                        </button>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded ambient-shadow text-center text-xs text-on-surface-variant italic">
                    Line structure satisfies rhyming rules.
                  </div>
                )}
              </aside>

              {/* Center Column: The Canvas */}
              <section className="col-span-12 md:col-span-6 flex justify-center">
                <div className="w-full max-w-[720px] bg-surface-container-lowest border border-outline-variant rounded p-[48px] ambient-shadow min-h-[500px] relative">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-30">
                    <span className="material-symbols-outlined text-sm animate-pulse">auto_awesome</span>
                  </div>
                  <div className="font-verse-primary text-verse-primary text-primary leading-loose whitespace-pre-wrap">
                    {editingText}
                  </div>
                </div>
              </section>

              {/* Right Column: Audience Agent (Sentiment, Appeal & Engagement) */}
              <aside className="col-span-12 md:col-span-4 space-y-stack-md">
                <div className="flex items-center justify-between mb-3 border-b border-outline-variant pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: '"FILL" 1' }}>groups</span>
                    <div>
                      <h3 className="font-label-caps text-label-caps text-on-tertiary-container tracking-widest uppercase font-bold">Audience Agent</h3>
                      <p className="text-[10px] text-on-surface-variant">Perception, Appeal & Engagement</p>
                    </div>
                  </div>
                  <button 
                    className="flex items-center gap-1 bg-surface-container-high hover:bg-surface-container-highest text-primary text-[11px] font-label-caps uppercase px-3 py-1.5 rounded transition-all shadow-xs disabled:opacity-50"
                    onClick={runAudienceEvaluation}
                    disabled={isEvaluatingAudience || (!editingText && !editingTitle)}
                    title="Re-run Audience Agent on this poem"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${isEvaluatingAudience ? "animate-spin text-secondary" : ""}`}>refresh</span>
                    <span>{isEvaluatingAudience ? "Evaluating..." : "Re-evaluate"}</span>
                  </button>
                </div>

                {/* Persona Filter Pills */}
                <div className="flex flex-wrap gap-1.5 pb-2">
                  {["all", "romantic", "critic", "instagram", "aggregator"].map(flt => (
                    <button
                      key={flt}
                      onClick={() => setAudienceFilter(flt)}
                      className={`text-[10px] uppercase font-label-caps px-2.5 py-1 rounded-full transition-all ${
                        audienceFilter === flt
                          ? "bg-primary text-on-primary font-bold shadow-xs"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary"
                      }`}
                    >
                      {flt === "all" ? "All Reviews" : flt === "aggregator" ? "Consensus" : flt}
                    </button>
                  ))}
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  {poemDetails?.audience_reviews
                    ?.filter(review => {
                      if (audienceFilter === "all") return true;
                      const name = (review.persona_name || "").toLowerCase();
                      if (audienceFilter === "romantic") return name.includes("romantic");
                      if (audienceFilter === "critic") return name.includes("critic");
                      if (audienceFilter === "instagram") return name.includes("instagram");
                      if (audienceFilter === "aggregator") return name.includes("aggregator");
                      return true;
                    })
                    .map(review => {
                      const cfg = getPersonaConfig(review.persona_name);
                      const strengths = review.strengths_json || review.strengths || [];
                      const weaknesses = review.weaknesses_json || review.weaknesses || [];
                      const enhancements = review.actionable_enhancements_json || review.actionable_enhancements || [];
                      const appeal = review.appeal_score || review.rating;
                      const engagement = review.engagement_score || review.rating;

                      return (
                        <div key={review.id} className={`bg-surface-container-lowest border border-outline-variant p-4 rounded-lg ambient-shadow relative ${cfg.cardBorder} transition-all hover:shadow-md space-y-3`}>
                          
                          {/* Header with Avatar, Name, and Scores */}
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className={`p-1.5 rounded-full ${cfg.badgeBg} flex items-center justify-center`}>
                                <span className="material-symbols-outlined text-[16px]">{cfg.icon}</span>
                              </span>
                              <div>
                                <span className="font-label-caps text-xs font-bold text-primary block leading-tight">{review.persona_name}</span>
                                <span className="text-[10px] text-on-surface-variant font-label-caps">{review.final_emotion}</span>
                              </div>
                            </div>

                            {/* Ratings badges */}
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs px-2.5 py-0.5 rounded font-bold ${cfg.badgeBg}`}>
                                {review.rating}/10
                              </span>
                              <div className="flex gap-2 text-[10px] font-mono text-on-surface-variant">
                                <span title="Appeal Score" className="flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px] text-amber-500">star</span>
                                  {appeal}
                                </span>
                                <span title="Engagement Score" className="flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px] text-emerald-500">bolt</span>
                                  {engagement}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Core Suggestion */}
                          <div className="bg-surface-container-low p-3 rounded text-xs text-on-surface leading-relaxed italic border border-outline-variant/60">
                            "{review.suggestion}"
                          </div>

                          {/* Favorite Line Callout */}
                          {review.favorite_line && (
                            <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded text-[11px]">
                              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mb-0.5">
                                <span className="material-symbols-outlined text-[13px]">grade</span>
                                Favorite Line
                              </span>
                              <p className="italic text-on-surface line-clamp-2">"{review.favorite_line}"</p>
                            </div>
                          )}

                          {/* Confusing / Stumble Line Callout */}
                          {review.confusing_line && (
                            <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded text-[11px]">
                              <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-0.5">
                                <span className="material-symbols-outlined text-[13px]">report_problem</span>
                                Line Breaking Engagement
                              </span>
                              <p className="italic text-on-surface line-clamp-2">"{review.confusing_line}"</p>
                            </div>
                          )}

                          {/* Strengths Tags */}
                          {strengths.length > 0 && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant block mb-1">Strengths</span>
                              <div className="flex flex-wrap gap-1">
                                {strengths.map((str, sIdx) => (
                                  <span key={sIdx} className="bg-emerald-100/70 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">check</span>
                                    {str}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Weaknesses Tags */}
                          {weaknesses.length > 0 && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant block mb-1">Room for Growth</span>
                              <div className="flex flex-wrap gap-1">
                                {weaknesses.map((w, wIdx) => (
                                  <span key={wIdx} className="bg-amber-100/70 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                                    {w}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* What to Enhance for Greater Appeal & Engagement */}
                          {enhancements.length > 0 && (
                            <div className="bg-primary-container/15 border border-primary/20 rounded p-3 space-y-1.5 mt-2">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-primary uppercase tracking-wide">
                                <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                                <span>How to Enhance Appeal & Engagement:</span>
                              </div>
                              <ul className="space-y-1 text-xs text-on-surface leading-normal pl-3 list-disc">
                                {enhancements.map((enh, eIdx) => (
                                  <li key={eIdx} className="font-body-md text-[11px]">{enh}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        </div>
                      );
                    })}
                </div>
              </aside>

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low w-full py-stack-lg px-container-padding-desktop flex flex-col md:flex-row justify-between items-center gap-base border-t border-outline-variant mt-auto">
        <div className="font-headline-lg text-headline-lg text-primary tracking-tight">PoetryStudio</div>
        <div className="flex flex-wrap justify-center gap-base">
          <button className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">Guidelines</button>
          <button className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">About Us</button>
          <button className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">Privacy</button>
          <button className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">Terms</button>
        </div>
        <div className="font-label-caps text-label-caps text-on-surface text-center md:text-right">
          © 2026 PoetryStudio. Crafted for the modern wordsmith.
        </div>
      </footer>

    </div>
  );
}
