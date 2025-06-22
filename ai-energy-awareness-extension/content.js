// content.js

// Helper function to safely get extension URL
function getExtensionUrl() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL('');
    }
  } catch (error) {
    console.warn('Chrome extension API not available:', error);
  }
  // Fallback - use relative URLs or placeholder
  return '';
}

// Helper function to generate logo HTML with fallbacks
function generateLogoHtml(service, extensionUrl) {
  const logoFile = service === 'google' ? 'google-logo.png' : 'gpt-logo.png';
  const fallbackText = service === 'google' ? 'Google' : 'GPT';
  const logoUrl = extensionUrl ? `${extensionUrl}${logoFile}` : '';
  
  // Prefer an <img> tag for better error handling
  if (logoUrl) {
    return `
      <img src="${logoUrl}" alt="${fallbackText} logo" style="
        width: 40px;
        height: 40px;
        margin: 0 auto 12px auto;
        object-fit: contain;
        border-radius: 8px;
        display: block;
      " onerror="this.replaceWith(document.createTextNode('${fallbackText}'))" />
    `;
  }

  // Fallback plain text badge
  return `
    <div style="
      width: 40px;
      height: 40px;
      margin: 0 auto 12px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f9fafb;
    ">${fallbackText}</div>
  `;
}

// Updated 2025 research-based energy model
//  • Google search: 0.0000424 kWh = 0.0424 Wh (≈0.02 g CO₂ with 367 g CO₂/kWh grid)
//  • ChatGPT (GPT-3.5/4 style) ≈60 × Google → 0.002544 kWh ≈ 2.544 Wh
//    We keep token scaling but calibrate so the average (≈500 tokens) sums to ~2.5 Wh
//    Base inference accounts for 0.5 Wh; remaining 2 Wh distributed over tokens.
const ENERGY_MODELS = {
  google: {
    baseEnergyWh: 0.04,   // Wh per standard Google search (2025 research estimate)
    description: "Traditional search"
  },
  chatgpt: {
    // Base inference energy (Wh) before token generation
    baseEnergyWh: 0.5,
    // Average tokens per query (for scaling)
    tokensPerQuery: 500,
    // Energy per token so that 500 tokens add ≈2 Wh → 0.004 Wh
    energyPerToken: 0.004,
    description: "GPT-4 style inference"
  }
};

// Average grid carbon-intensity (g CO₂ per kWh) — US 2025 figure
const GRID_INTENSITY_G_PER_KWH = 367;

// Query complexity analysis
function analyzeQueryComplexity(query) {
  const wordCount = query.trim().split(/\s+/).length;
  const hasCodeRequest = /code|program|script|function|debug|fix|algorithm/i.test(query);
  const hasCreativeRequest = /write|create|story|poem|essay|draft|design/i.test(query);
  const hasAnalysisRequest = /analyze|explain|compare|summarize|breakdown|research/i.test(query);
  const hasComplexConcepts = /complex|detailed|comprehensive|thorough|in-depth/i.test(query);
  
  let complexity = 1; // Base complexity
  
  // Adjust based on word count
  if (wordCount > 50) complexity += 0.5;
  if (wordCount > 100) complexity += 1;
  
  // Adjust based on request type
  if (hasCodeRequest) complexity += 1.5;
  if (hasCreativeRequest) complexity += 1;
  if (hasAnalysisRequest) complexity += 0.5;
  if (hasComplexConcepts) complexity += 0.5;
  
  return Math.min(complexity, 4); // Cap at 4x base complexity
}

// Estimate expected response length based on query
function estimateResponseTokens(query, complexity) {
  const baseTokens = 500;
  let tokens = baseTokens * complexity;
  
  // Adjust for specific request types
  if (/code|program|script/i.test(query)) tokens *= 1.5;
  if (/list|steps|tutorial/i.test(query)) tokens *= 1.2;
  if (/yes|no|simple|quick/i.test(query)) tokens *= 0.3;
  
  return Math.round(tokens);
}

// Calculate energy consumption for different services
function calculateEnergyFootprint(query) {
  const complexity = analyzeQueryComplexity(query);
  const estimatedTokens = estimateResponseTokens(query, complexity);
  
  // Google Search energy calculation
  const googleEnergy = ENERGY_MODELS.google.baseEnergyWh * Math.max(1, complexity * 0.5);
  
  // ChatGPT energy calculation (more sophisticated)
  const chatgptBaseEnergy = ENERGY_MODELS.chatgpt.baseEnergyWh;
  const tokenEnergy = estimatedTokens * ENERGY_MODELS.chatgpt.energyPerToken;
  const chatgptEnergy = chatgptBaseEnergy + tokenEnergy;
  
  // Calculate relative scores (1-6 scale)
  // Google Search baseline: 0.0424 Wh = score 1 (updated)
  const googleScore = Math.max(1, Math.min(6, Math.ceil(1 + Math.log10(googleEnergy / ENERGY_MODELS.google.baseEnergyWh) * 2)));
  const chatgptScore = Math.max(1, Math.min(6, Math.ceil(1 + Math.log10(chatgptEnergy / ENERGY_MODELS.google.baseEnergyWh) * 2)));
  
  return {
    google: {
      energyWh: googleEnergy,
      carbonGrams: (googleEnergy / 1000) * GRID_INTENSITY_G_PER_KWH,
      score: googleScore,
      estimatedTokens: 0,
      complexity: complexity
    },
    chatgpt: {
      energyWh: chatgptEnergy,
      carbonGrams: (chatgptEnergy / 1000) * GRID_INTENSITY_G_PER_KWH,
      score: chatgptScore,
      estimatedTokens: estimatedTokens,
      complexity: complexity
    }
  };
}

// Get additional context information
function getEnvironmentalContext() {
  const now = new Date();
  const hour = now.getHours();
  
  // Estimate grid carbon intensity based on time (simplified)
  let gridIntensity = "Medium";
  let intensityMultiplier = 1;
  
  if (hour >= 10 && hour <= 16) {
    gridIntensity = "Lower (Solar Peak)";
    intensityMultiplier = 0.8;
  } else if (hour >= 18 && hour <= 22) {
    gridIntensity = "Higher (Peak Demand)";
    intensityMultiplier = 1.3;
  }
  
  return {
    gridIntensity,
    intensityMultiplier,
    timeContext: hour >= 10 && hour <= 16 ? "Solar energy is more available now" : 
                 hour >= 18 && hour <= 22 ? "Peak energy demand period" : "Standard grid mix"
  };
}

// Function to inject the popup with dynamic calculations
function showPopup(query) {
  const energyData = calculateEnergyFootprint(query);
  const envContext = getEnvironmentalContext();
  
  // Apply time-based multiplier to carbon emissions
  const adjustedGoogleCarbon = (energyData.google.carbonGrams * envContext.intensityMultiplier).toFixed(2);
  const adjustedChatGPTCarbon = (energyData.chatgpt.carbonGrams * envContext.intensityMultiplier).toFixed(2);
  
  // Convert complexity to 1-10 scale for user-friendly display
  const complexityScore = Math.min(10, Math.max(1, Math.round((energyData.chatgpt.complexity - 1) * 2.5 + 1)));
  
  // Generate user-friendly explanations with specific calculations
  const googleExplanation = generateScoreExplanation('google', energyData.google, complexityScore, envContext);
  const chatgptExplanation = generateScoreExplanation('chatgpt', energyData.chatgpt, complexityScore, envContext);
  
  // Get extension URL for logos
  const extensionUrl = getExtensionUrl();
  
  // Create overlay with modern backdrop
  const overlay = document.createElement('div');
  overlay.id = 'ai-energy-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.15s ease-out;
  `;

  // Add keyframe animations
  if (!document.getElementById('ai-energy-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-energy-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .ai-hover-lift:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
      }
      .ai-button-primary {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .ai-button-primary:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        transform: translateY(-1px);
        box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
      }
      .ai-button-secondary {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .ai-button-secondary:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        transform: translateY(-1px);
        box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
      }
      .ai-expand-button {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .ai-expand-button:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
      }
    `;
    document.head.appendChild(style);
  }

  // Create popup container with modern design
  const popup = document.createElement('div');
  popup.id = 'ai-energy-popup';
  popup.style.cssText = `
    background: white;
    border-radius: 20px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    width: 520px;
    max-width: 90vw;
    height: auto;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: slideUp 0.2s ease-out;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  // Popup content with Supabase/NextJS inspired design
  popup.innerHTML = `
    <div id="main-content" style="
      padding: 32px 32px 24px 32px; 
      flex-shrink: 0; 
      background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    ">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        ">
          ENVIRONMENTAL IMPACT
        </div>
        <h1 style="
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.025em;
          line-height: 1.2;
        ">Choose Wisely</h1>
        <p style="
          margin: 6px 0 0 0;
          font-size: 15px;
          color: #6b7280;
          font-weight: 400;
        ">Compare the environmental cost of your query</p>
      </div>
      
      <!-- Content Container that will change layout -->
      <div id="content-container" style="
        display: flex;
        flex-direction: column;
        gap: 20px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <!-- Left Column (Main Content) -->
        <div id="left-column" style="
          flex: 1;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          <!-- Score Comparison Cards -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
          ">
            <!-- Google Score Card -->
            <div class="ai-hover-lift" style="
              border: 2px solid #d1fae5;
              border-radius: 16px;
              padding: 20px 16px;
              text-align: center;
              background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
              position: relative;
              overflow: hidden;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            ">
              <div style="
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
                pointer-events: none;
              "></div>
              <div style="position: relative;">
                <div style="
                  font-size: 42px;
                  font-weight: 800;
                  color: #059669;
                  margin-bottom: 4px;
                  line-height: 1;
                  text-shadow: 0 2px 4px rgba(5, 150, 105, 0.1);
                ">${energyData.google.score}</div>
                <div style="
                  font-size: 12px;
                  font-weight: 600;
                  color: #047857;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 12px;
                ">out of 6</div>
                ${generateLogoHtml('google', extensionUrl)}
              </div>
            </div>
            
            <!-- ChatGPT Score Card -->
            <div class="ai-hover-lift" style="
              border: 2px solid ${energyData.chatgpt.score >= 4 ? '#fecaca' : '#fed7aa'};
              border-radius: 16px;
              padding: 20px 16px;
              text-align: center;
              background: linear-gradient(135deg, ${energyData.chatgpt.score >= 4 ? '#fef2f2 0%, #fecaca 100%' : '#fffbeb 0%, #fed7aa 100%'});
              position: relative;
              overflow: hidden;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            ">
              <div style="
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, ${energyData.chatgpt.score >= 4 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 124, 0, 0.1)'} 0%, transparent 70%);
                pointer-events: none;
              "></div>
              <div style="position: relative;">
                <div style="
                  font-size: 42px;
                  font-weight: 800;
                  color: ${energyData.chatgpt.score >= 4 ? '#dc2626' : '#ea580c'};
                  margin-bottom: 4px;
                  line-height: 1;
                  text-shadow: 0 2px 4px ${energyData.chatgpt.score >= 4 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(234, 88, 12, 0.1)'};
                ">${energyData.chatgpt.score}</div>
                <div style="
                  font-size: 12px;
                  font-weight: 600;
                  color: ${energyData.chatgpt.score >= 4 ? '#991b1b' : '#c2410c'};
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 12px;
                ">out of 6</div>
                ${generateLogoHtml('chatgpt', extensionUrl)}
              </div>
      </div>
    </div>
          
          <!-- Action Buttons -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
          ">
            <button id="ai-google-button" class="ai-button-secondary" style="
        color: white;
        border: none;
              padding: 16px 24px;
              border-radius: 12px;
              font-size: 15px;
              font-weight: 600;
        cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              letter-spacing: -0.025em;
            ">
              Use Google
            </button>
            <button id="ai-chatgpt-button" class="ai-button-primary" style="
        color: white;
        border: none;
              padding: 16px 24px;
              border-radius: 12px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              letter-spacing: -0.025em;
            ">
              Use ChatGPT
            </button>
          </div>
          
          <!-- Expandable Details -->
          <div style="text-align: center;">
            <button id="expand-details" class="ai-expand-button" style="
              background: white;
              border: 2px solid #e5e7eb;
              padding: 12px 20px;
              border-radius: 50px;
              font-size: 14px;
              font-weight: 500;
              color: #374151;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            ">
              How was this calculated?
              <span id="expand-arrow" style="transition: transform 0.2s ease; font-size: 12px;">▼</span>
            </button>
          </div>
        </div>

        <!-- Right Column (Details - Hidden Initially) -->
        <div id="right-column" style="
          flex: 0 0 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        ">
          <div id="breakdown-content" style="
            background: #f8fafc;
            margin: 0;
            padding: 32px;
            border-top: 1px solid #e2e8f0;
            border-radius: 16px;
            overflow-y: auto;
            flex: 1;
            max-height: calc(90vh - 200px);
          ">
            <!-- Google Breakdown -->
            <div style="margin-bottom: 32px;">
              <div style="
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
              ">
                <div style="
                  width: 32px;
                  height: 32px;
                  border-radius: 8px;
                  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  color: white;
                  font-weight: 600;
                ">G</div>
                <div>
                  <h3 style="
                    margin: 0;
                    color: #059669;
                    font-size: 18px;
                    font-weight: 700;
                    letter-spacing: -0.025em;
                  ">Google Search</h3>
                  <div style="
                    font-size: 14px;
                    color: #6b7280;
                    font-weight: 500;
                  ">${adjustedGoogleCarbon}g CO₂ emissions</div>
                </div>
              </div>
              ${generateConciseExplanation('google', energyData.google, complexityScore, envContext)}
              
              <!-- Detailed Calculation Dropdown for Google -->
              <div style="margin-top: 16px;">
                <button class="detailed-calc-btn" data-service="google" style="
                  background: white;
                  border: 1px solid #10b981;
                  color: #059669;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 13px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                " onmouseover="this.style.background='#10b981'; this.style.color='white'" 
                   onmouseout="this.style.background='white'; this.style.color='#059669'">
                  Show detailed calculation ▼
                </button>
                <div class="detailed-calc-content" data-service="google" style="
                  max-height: 0;
                  overflow: hidden;
                  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  margin-top: 12px;
                ">
                  ${generateDetailedCalculation('google', energyData.google, complexityScore, envContext)}
                </div>
              </div>
            </div>
            
            <!-- ChatGPT Breakdown -->
            <div style="margin-bottom: 32px;">
              <div style="
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
              ">
                <div style="
                  width: 32px;
                  height: 32px;
                  border-radius: 8px;
                  background: linear-gradient(135deg, ${energyData.chatgpt.score >= 4 ? '#ef4444 0%, #dc2626 100%' : '#f59e0b 0%, #d97706 100%'});
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  color: white;
                  font-weight: 600;
                ">AI</div>
                <div>
                  <h3 style="
                    margin: 0;
                    color: ${energyData.chatgpt.score >= 4 ? '#dc2626' : '#d97706'};
                    font-size: 18px;
                    font-weight: 700;
                    letter-spacing: -0.025em;
                  ">ChatGPT</h3>
                  <div style="
                    font-size: 14px;
                    color: #6b7280;
                    font-weight: 500;
                  ">${adjustedChatGPTCarbon}g CO₂ emissions</div>
                </div>
              </div>
              ${generateConciseExplanation('chatgpt', energyData.chatgpt, complexityScore, envContext)}
              
              <!-- Detailed Calculation Dropdown for ChatGPT -->
              <div style="margin-top: 16px;">
                <button class="detailed-calc-btn" data-service="chatgpt" style="
                  background: white;
                  border: 1px solid ${energyData.chatgpt.score >= 4 ? '#ef4444' : '#f59e0b'};
                  color: ${energyData.chatgpt.score >= 4 ? '#dc2626' : '#d97706'};
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 13px;
                  font-weight: 500;
        cursor: pointer;
                  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                " onmouseover="this.style.background='${energyData.chatgpt.score >= 4 ? '#ef4444' : '#f59e0b'}'; this.style.color='white'" 
                   onmouseout="this.style.background='white'; this.style.color='${energyData.chatgpt.score >= 4 ? '#dc2626' : '#d97706'}'">
                  Show detailed calculation ▼
                </button>
                <div class="detailed-calc-content" data-service="chatgpt" style="
                  max-height: 0;
                  overflow: hidden;
                  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  margin-top: 12px;
                ">
                  ${generateDetailedCalculation('chatgpt', energyData.chatgpt, complexityScore, envContext)}
                </div>
              </div>
            </div>
            
            <!-- Query Analysis Card -->
            <div style="
              background: white;
              padding: 24px;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
              margin-bottom: 20px;
            ">
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
              ">
                <div style="
                  width: 20px;
                  height: 20px;
                  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                  border-radius: 4px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 10px;
                  font-weight: 700;
                ">Q</div>
                <h4 style="
                  margin: 0;
                  font-size: 16px;
                  font-weight: 600;
                  color: #374151;
                ">Query Analysis</h4>
              </div>
              <div style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
        font-size: 14px;
              ">
                <div>
                  <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">
                    Complexity Score: ${complexityScore}/10
                  </div>
                  <div style="color: #6b7280;">
                    ${getComplexityDescription(complexityScore)}
                  </div>
                </div>
                <div>
                  <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">
                    Expected Response: ~${energyData.chatgpt.estimatedTokens} tokens
                  </div>
                  <div style="color: #6b7280;">
                    ~${Math.round(energyData.chatgpt.estimatedTokens * 0.75)} words expected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Append popup to overlay
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Handle expand/collapse with horizontal transition
  const expandButton = document.getElementById('expand-details');
  const expandArrow = document.getElementById('expand-arrow');
  const contentContainer = document.getElementById('content-container');
  const leftColumn = document.getElementById('left-column');
  const rightColumn = document.getElementById('right-column');
  let isExpanded = false;

  expandButton.addEventListener('click', () => {
    if (isExpanded) {
      // Collapse - back to vertical narrow layout
      popup.style.width = '520px';
      popup.style.maxWidth = '90vw';
      contentContainer.style.flexDirection = 'column';
      contentContainer.style.gap = '32px';
      leftColumn.style.flex = '1';
      rightColumn.style.flex = '0 0 0';
      rightColumn.style.opacity = '0';
      rightColumn.style.overflow = 'hidden';
      expandArrow.style.transform = 'rotate(0deg)';
      expandButton.innerHTML = expandButton.innerHTML.replace('Hide details', 'How was this calculated?');
    } else {
      // Expand - to horizontal wide layout
      popup.style.width = '900px';
      popup.style.maxWidth = '95vw';
      contentContainer.style.flexDirection = 'row';
      contentContainer.style.gap = '40px';
      leftColumn.style.flex = '0 0 400px';
      rightColumn.style.flex = '1';
      rightColumn.style.opacity = '1';
      rightColumn.style.overflow = 'visible';
      expandArrow.style.transform = 'rotate(180deg)';
      expandButton.innerHTML = expandButton.innerHTML.replace('How was this calculated?', 'Hide details');
    }
    isExpanded = !isExpanded;
  });

  // Handle button clicks
  document.getElementById('ai-google-button').addEventListener('click', () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    // Keep the typed query in ChatGPT input so user can reuse or edit it
    removePopup();
  });

  document.getElementById('ai-chatgpt-button').addEventListener('click', () => {
    removePopup();
    sendQuery(query);
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      removePopup();
    }
  });

  // Handle detailed calculation buttons (legacy)
  const detailedCalcButtons = document.querySelectorAll('.detailed-calc-btn');
  detailedCalcButtons.forEach(button => {
    button.addEventListener('click', () => {
      const service = button.getAttribute('data-service');
      const content = document.querySelector(`.detailed-calc-content[data-service="${service}"]`);
      const isExpanded = content.style.maxHeight !== '0px' && content.style.maxHeight !== '';
      
      if (isExpanded) {
        content.style.maxHeight = '0';
        button.innerHTML = button.innerHTML.replace('Hide detailed calculation ▲', 'Show detailed calculation ▼');
      } else {
        content.style.maxHeight = '400px';
        button.innerHTML = button.innerHTML.replace('Show detailed calculation ▼', 'Hide detailed calculation ▲');
      }
    });
  });

  // Handle new calculation step buttons
  const calcStepButtons = document.querySelectorAll('.calc-step-btn');
  calcStepButtons.forEach(button => {
    button.addEventListener('click', () => {
      const step = button.getAttribute('data-step');
      const content = document.querySelector(`.calc-step-content[data-step="${step}"]`);
      const arrow = button.querySelector('.step-arrow');
      const isExpanded = content.style.maxHeight !== '0px' && content.style.maxHeight !== '';
      
      if (isExpanded) {
        content.style.maxHeight = '0';
        arrow.style.transform = 'rotate(0deg)';
      } else {
        content.style.maxHeight = '120px';
        arrow.style.transform = 'rotate(180deg)';
      }
    });
  });
}

// Generate user-friendly score explanations with specific calculations
function generateScoreExplanation(service, data, complexityScore, envContext) {
  if (service === 'google') {
    const baseEnergy = ENERGY_MODELS.google.baseEnergyWh;
    const complexityFactor = Math.max(1, data.complexity * 0.5);
    const totalEnergy = baseEnergy * complexityFactor;
    const carbonWithoutGrid = (totalEnergy / 1000) * GRID_INTENSITY_G_PER_KWH;
    const finalCarbon = carbonWithoutGrid * envContext.intensityMultiplier;
    
    // Show the score calculation
    const scoreCalculation = Math.max(1, Math.min(6, Math.ceil(1 + Math.log10(totalEnergy / baseEnergy) * 2)));
    
    return `
      <div style="margin-bottom: 12px;"><strong>Search energy = Base search (${(baseEnergy * 1000).toFixed(1)} Wh) × complexity factor</strong></div>
      <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #000;">
        Base energy: ${(baseEnergy * 1000).toFixed(1)} Wh<br>
        Complexity factor: ${complexityFactor.toFixed(2)}<br>
        Total energy: ${(totalEnergy * 1000).toFixed(1)} Wh<br>
        Carbon (base): ${carbonWithoutGrid.toFixed(2)}g CO₂<br>
        Grid multiplier: ${envContext.intensityMultiplier}×<br>
        <strong>Final carbon: ${finalCarbon.toFixed(2)}g CO₂</strong><br><br>
        <strong>Score calculation:</strong><br>
        Score = 1 + log₁₀(${(totalEnergy * 1000).toFixed(1)} ÷ ${(baseEnergy * 1000).toFixed(1)}) × 2<br>
        Score = 1 + log₁₀(${(totalEnergy / baseEnergy).toFixed(2)}) × 2<br>
        Score = 1 + ${Math.log10(totalEnergy / baseEnergy).toFixed(2)} × 2<br>
        <strong>Final score: ${scoreCalculation}/6</strong>
      </div>
    `;
  } else {
    const baseEnergy = ENERGY_MODELS.chatgpt.baseEnergyWh;
    const tokenEnergy = data.estimatedTokens * ENERGY_MODELS.chatgpt.energyPerToken;
    const totalEnergy = baseEnergy + tokenEnergy;
    const carbonWithoutGrid = (totalEnergy / 1000) * GRID_INTENSITY_G_PER_KWH;
    const finalCarbon = carbonWithoutGrid * envContext.intensityMultiplier;
    
    // Show the score calculation
    const scoreCalculation = Math.max(1, Math.min(6, Math.ceil(1 + Math.log10(totalEnergy / baseEnergy) * 2)));
    
    return `
      <div style="margin-bottom: 12px;"><strong>AI energy = Base inference + (${data.estimatedTokens} tokens × energy per token)</strong></div>
      <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #000;">
        Base inference: ${(baseEnergy * 1000).toFixed(1)} Wh<br>
        Token energy: ${data.estimatedTokens} × ${(ENERGY_MODELS.chatgpt.energyPerToken * 1000).toFixed(3)} = ${(tokenEnergy * 1000).toFixed(1)} Wh<br>
        Total energy: ${(baseEnergy * 1000).toFixed(1)} + ${(tokenEnergy * 1000).toFixed(1)} = ${(totalEnergy * 1000).toFixed(1)} Wh<br>
        Carbon (base): ${carbonWithoutGrid.toFixed(2)}g CO₂<br>
        Grid multiplier: ${envContext.intensityMultiplier}×<br>
        <strong>Final carbon: ${finalCarbon.toFixed(2)}g CO₂</strong><br><br>
        <strong>Score calculation:</strong><br>
        Score = 1 + log₁₀(${(totalEnergy * 1000).toFixed(1)} ÷ ${(baseEnergy * 1000).toFixed(1)}) × 2<br>
        Score = 1 + log₁₀(${(totalEnergy / baseEnergy).toFixed(2)}) × 2<br>
        Score = 1 + ${Math.log10(totalEnergy / baseEnergy).toFixed(2)} × 2<br>
        <strong>Final score: ${scoreCalculation}/6</strong>
      </div>
    `;
  }
}

// Generate concise score explanations
function generateConciseExplanation(service, data, complexityScore, envContext) {
  if (service === 'google') {
    return `
      <div style="
        background: white;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        font-size: 14px;
        line-height: 1.5;
        color: #6b7280;
      ">
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Energy consumption:</strong> ${(data.energyWh * 1000).toFixed(1)} Wh
        </div>
        <div>
          <strong style="color: #374151;">Efficiency:</strong> Standard search processing
        </div>
      </div>
    `;
  } else {
    return `
      <div style="
        background: white;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        font-size: 14px;
        line-height: 1.5;
        color: #6b7280;
      ">
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Energy consumption:</strong> ${(data.energyWh * 1000).toFixed(1)} Wh
        </div>
        <div>
          <strong style="color: #374151;">Complexity:</strong> ${getComplexityDescription(complexityScore)}
        </div>
      </div>
    `;
  }
}

// Generate detailed calculation breakdown
function generateDetailedCalculation(service, data, complexityScore, envContext) {
  if (service === 'google') {
    const baseEnergy = ENERGY_MODELS.google.baseEnergyWh;
    const complexityFactor = Math.max(1, data.complexity * 0.5);
    const totalEnergy = baseEnergy * complexityFactor;
    const carbonWithoutGrid = (totalEnergy / 1000) * GRID_INTENSITY_G_PER_KWH;
    const finalCarbon = carbonWithoutGrid * envContext.intensityMultiplier;
    const scoreCalculation = Math.max(1, Math.min(6, Math.ceil(1 + Math.log10(totalEnergy / baseEnergy) * 2)));
    
    return `
      <!-- Simplified Calculation -->
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">
          Calculation Breakdown
        </h4>
        
        <div style="
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          font-family: ui-monospace, monospace;
          font-size: 13px;
          line-height: 1.6;
        ">
          <div style="color: #6b7280; margin-bottom: 12px;">
            <strong style="color: #374151;">Base energy:</strong> ${(baseEnergy * 1000).toFixed(1)} Wh
          </div>
          <div style="color: #6b7280; margin-bottom: 12px;">
            <strong style="color: #374151;">Complexity factor:</strong> ×${complexityFactor.toFixed(2)}
          </div>
          <div style="color: #6b7280; margin-bottom: 12px;">
            <strong style="color: #374151;">Total energy:</strong> ${(totalEnergy * 1000).toFixed(1)} Wh
          </div>
          <div style="color: #6b7280; margin-bottom: 12px;">
            <strong style="color: #374151;">Carbon (${envContext.intensityMultiplier}× grid):</strong> ${finalCarbon.toFixed(2)}g CO₂
          </div>
          <div style="color: #059669; font-weight: 600;">
            <strong>Environmental Score:</strong> ${scoreCalculation}/6
          </div>
        </div>


      </div>
    `;
  } else {
    const baseEnergy = ENERGY_MODELS.chatgpt.baseEnergyWh;
    const tokenEnergy = data.estimatedTokens * ENERGY_MODELS.chatgpt.energyPerToken;
    const totalEnergy = baseEnergy + tokenEnergy;
    const carbonWithoutGrid = (totalEnergy / 1000) * GRID_INTENSITY_G_PER_KWH;
    const finalCarbon = carbonWithoutGrid * envContext.intensityMultiplier;
    const scoreCalculation = Math.max(1, Math.min(6, Math.ceil(1 + Math.log10(totalEnergy / baseEnergy) * 2)));
    const scoreColor = data.score >= 4 ? '#dc2626' : '#d97706';
    const bgColor = data.score >= 4 ? '#fef2f2' : '#fffbeb';
    const borderColor = data.score >= 4 ? '#fecaca' : '#fed7aa';
    
    return `
      <!-- Simplified Calculation -->
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">
          Calculation Breakdown
        </h4>
        
        <div style="
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          font-family: ui-monospace, monospace;
          font-size: 13px;
          line-height: 1.6;
        ">
          <div style="color: #6b7280; margin-bottom: 12px;">
            <strong style="color: #374151;">Base inference:</strong> ${(baseEnergy * 1000).toFixed(1)} Wh
          </div>
          <div style="color: #6b7280; margin-bottom: 12px;">
            <strong style="color: #374151;">Token processing:</strong> ${data.estimatedTokens} tokens × ${(ENERGY_MODELS.chatgpt.energyPerToken * 1000).toFixed(3)} Wh
          </div>
          <div style="color: #6b7280; margin-bottom: 12px;">
            <strong style="color: #374151;">Total energy:</strong> ${(totalEnergy * 1000).toFixed(1)} Wh
          </div>
          <div style="color: #6b7280; margin-bottom: 12px;">
            <strong style="color: #374151;">Carbon (${envContext.intensityMultiplier}× grid):</strong> ${finalCarbon.toFixed(2)}g CO₂
          </div>
          <div style="color: ${scoreColor}; font-weight: 600;">
            <strong>Environmental Score:</strong> ${scoreCalculation}/6
          </div>
        </div>
      </div>
    `;
  }
}

// Get complexity description for display
function getComplexityDescription(score) {
  if (score <= 3) return "Simple query, minimal processing";
  if (score <= 5) return "Moderate complexity, standard response";
  if (score <= 7) return "Complex query, detailed response needed";
  return "High complexity, extensive processing required";
}

// Function to remove the popup
function removePopup() {
  const overlay = document.getElementById('ai-energy-overlay');
  if (overlay) {
    document.body.removeChild(overlay);
  }
}

// Function to clear the input field
function clearInputField() {
  const inputField = document.getElementById('prompt-textarea');
  if (inputField) {
    inputField.innerHTML = '<p><br></p>';
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Function to send the query to ChatGPT
function sendQuery(query) {
  const inputField = document.getElementById('prompt-textarea');

  if (inputField) {
    // Set the input value
    inputField.innerHTML = `<p>${query}</p>`;

    // Dispatch input event to update any React bindings
    inputField.dispatchEvent(new Event('input', { bubbles: true }));

    // Simulate Enter key press to send the message
    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      which: 13,
    });
    inputField.dispatchEvent(enterEvent);
  }
}

// Function to intercept input events using event delegation
function interceptInputEvents() {
  document.addEventListener(
    'keydown',
    function (event) {
      const inputField = document.getElementById('prompt-textarea');
      if (!inputField) return;
      if (document.activeElement !== inputField) return;
      if (event.key === 'Enter' && !event.shiftKey) {
        event.stopImmediatePropagation();
        event.preventDefault();
        const query = inputField.innerText.trim();
        showPopup(query);
      }
    },
    true // Use capture phase
  );

  document.addEventListener(
    'click',
    function (event) {
      // Capture clicks on various possible ChatGPT send buttons
      const targetButton = event.target.closest('button');
      if (!targetButton) return;
      const isSendButton = targetButton.matches(
        'button[aria-label="Send message"], #composer-submit-button, button[aria-label="Send prompt"], button[data-testid="send-button"]'
      );
      if (isSendButton) {
        event.stopImmediatePropagation();
        event.preventDefault();
        const inputField = document.getElementById('prompt-textarea');
        if (inputField) {
          const query = inputField.innerText.trim();
          showPopup(query);
        }
      }
    },
    true // Use capture phase
  );
}

// Observe the DOM for changes to reattach event listeners if needed
const observer = new MutationObserver(() => {
  // Reattach event listeners in case elements were replaced
  interceptInputEvents();
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Initial call to set up event listeners
interceptInputEvents();
