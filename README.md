## 🌟 Project Overview

Bikewatching transforms over 260,000 trip records from March 2024 into an interactive geospatial visualization that reveals hidden patterns in urban bike-sharing behavior. By combining temporal filtering with traffic flow analysis, this project uncovers how commuter patterns shift dramatically between morning and evening rush hours.

**Live Demo:** [https://derekyhuang.github.io/Bike_Watching_Project/](https://derekyhuang.github.io/Bike_Watching_Project/)

## 🎯 Key Features

### Interactive Map Visualization
- **260+ Station Coverage**: Visualizes all BlueBikes stations across Boston and Cambridge
- **Dynamic Bike Lane Overlay**: Shows existing bike infrastructure from city open data
- **Pan & Zoom**: Full Mapbox GL JS integration for smooth map interaction

### Time-Based Traffic Analysis
- **Temporal Filtering**: Slider control to filter trips by time of day (±60 minute window)
- **Real-time Updates**: Circle sizes adjust dynamically based on filtered traffic volumes
- **Performance Optimized**: Pre-sorted data buckets enable smooth filtering of 260K+ records

### Traffic Flow Visualization
- **Color-Coded Stations**: 
  - 🔵 Blue circles indicate departure-heavy stations (people leaving)
  - 🟠 Orange circles indicate arrival-heavy stations (people arriving)
  - 🟣 Purple circles show balanced traffic
- **Square Root Scaling**: Circle areas accurately represent traffic volume without distortion
- **Interactive Tooltips**: Hover to see exact trip counts (arrivals, departures, total)

### Data Insights Revealed
- **Morning Rush**: Downtown and MIT campus show orange (arrivals) as commuters flow in
- **Evening Rush**: Same stations turn blue (departures) as people return home
- **Station Hotspots**: Largest circles reveal the busiest transit hubs

## 🛠️ Technical Implementation

### Technology Stack
- **Mapbox GL JS**: High-performance map rendering and tile management
- **D3.js v7**: Data manipulation, SVG overlay, and dynamic visualizations
- **Vanilla JavaScript**: ES6 modules for clean, modular code
- **GitHub Pages**: Static site hosting with continuous deployment
