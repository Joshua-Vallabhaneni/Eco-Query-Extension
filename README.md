# AI Energy Awareness Extension

A Chrome browser extension that provides real-time environmental impact assessment for AI queries, helping users make informed decisions about their AI usage.

## Features

### 🔬 Dynamic Energy Calculation
- **Query Complexity Analysis**: Analyzes query content to estimate computational requirements
- **Real-time Energy Estimation**: Calculates energy consumption based on:
  - Query complexity and expected response length
  - Current model efficiency data (GPT-4o vs Google Search)
  - Grid carbon intensity based on time of day

### 📊 Environmental Impact Display
- **Carbon Footprint**: Shows CO₂ emissions in grams for each service
- **Energy Consumption**: Displays energy usage in watt-hours (Wh)
- **Environmental Score**: 1-6 scale rating for quick comparison
- **Contextual Information**: Compares impact to everyday activities

### 🕐 Time-Aware Calculations
- **Grid Intensity Tracking**: Adjusts calculations based on typical renewable energy availability
- **Solar Peak Detection**: Lower emissions during solar generation hours (10 AM - 4 PM)
- **Peak Demand Awareness**: Higher emissions during peak usage (6-10 PM)

### 🎯 Smart Query Analysis
The extension analyzes queries for:
- **Complexity Indicators**: Code requests, creative writing, analysis tasks
- **Response Length Estimation**: Predicts token count based on query type
- **Word Count Scaling**: Adjusts calculations for longer inputs

## How It Works

### Energy Models
- **Google Search**: ~0.3 Wh base energy (updated 2025 estimates)
- **ChatGPT**: Dynamic calculation based on:
  - Base inference energy (~0.3 Wh)
  - Token-based energy (15mg CO₂ per token)
  - Query complexity multiplier

### Calculation Methodology
1. **Query Analysis**: Scans for keywords indicating complexity
2. **Token Estimation**: Predicts response length based on query type
3. **Energy Computation**: Combines base energy + token energy
4. **Environmental Context**: Applies time-based grid intensity adjustments
5. **Impact Comparison**: Provides relative context and alternatives

## Data Sources

The extension uses research-backed data from:
- **Epoch AI (2025)**: Latest ChatGPT energy consumption estimates
- **OpenAI Estimates**: Model efficiency and parameter counts
- **Grid Data**: Simplified time-based carbon intensity modeling
- **Academic Research**: Token-to-energy conversion factors

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `ai-energy-awareness-extension` folder
5. The extension will now intercept ChatGPT queries and show environmental impact

## Usage

1. Navigate to ChatGPT or similar AI services
2. Type your query as normal
3. Instead of immediately sending, you'll see an environmental impact assessment
4. Review the energy consumption, carbon footprint, and analysis details
5. Choose between Google Search or proceeding with ChatGPT based on the information

## Examples

### Simple Query: "What's the weather today?"
- **Complexity**: 1.0x (Simple)
- **Estimated Response**: ~150 tokens
- **ChatGPT Energy**: ~2.6 Wh
- **Google Energy**: ~0.3 Wh
- **Recommendation**: Google Search is more efficient

### Complex Query: "Write a Python script to analyze CSV data and create visualizations"
- **Complexity**: 3.0x (Complex - code request)
- **Estimated Response**: ~2,250 tokens  
- **ChatGPT Energy**: ~34 Wh
- **Google Energy**: ~0.45 Wh
- **Insight**: ChatGPT may be worth the extra energy for this specialized task

## Technical Details

### Query Complexity Factors
- **Word Count**: +0.5x for >50 words, +1x for >100 words
- **Code Requests**: +1.5x multiplier
- **Creative Tasks**: +1x multiplier
- **Analysis Tasks**: +0.5x multiplier
- **Complex Concepts**: +0.5x multiplier

### Energy Calculation Formula
```
ChatGPT Energy = Base Energy + (Estimated Tokens × Energy Per Token)
Google Energy = Base Energy × max(1, Complexity × 0.5)
Carbon Impact = Energy × Grid Intensity × Time Multiplier
```

## Limitations

- **Simplified Grid Modeling**: Uses basic time-based intensity estimates
- **Model Assumptions**: Based on publicly available research and estimates
- **Token Prediction**: Heuristic-based, may not always be accurate
- **Regional Variations**: Doesn't account for specific geographic grid mixes

## Contributing

This extension serves as a proof-of-concept for AI environmental awareness. Contributions welcome for:
- More sophisticated grid intensity data
- Additional AI service support
- Improved complexity analysis algorithms
- Real-time API integrations

## Future Enhancements

- **Live Grid Data**: Integration with real-time carbon intensity APIs
- **Regional Customization**: Location-based grid mix calculations
- **Service Expansion**: Support for Claude, Gemini, and other AI services
- **Usage Tracking**: Personal environmental impact dashboard
- **Model Updates**: Automatic updates to energy consumption data

## License

MIT License - Feel free to use, modify, and distribute. 