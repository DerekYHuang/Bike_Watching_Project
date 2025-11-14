// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Import D3 as an ES module
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiZHlodWFuZyIsImEiOiJjbWh3bXh6cm4wMWI5MnFxMWd4MnRsM3ZrIn0.2XXCNEVvRtUBvfvpe9wNlg'; // Replace with your actual token

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

// Define bike lane styling
const bikeLaneStyle = {
  'line-color': '#32D400',
  'line-width': 3,
  'line-opacity': 0.5,
};

// Pre-sorted trip buckets for performance optimization
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

// Quantize scale for traffic flow (departures vs arrivals)
let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

// Helper function to convert coordinates (defined globally)
function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

// Helper function to convert minutes to time format
function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

// Helper function to get minutes since midnight from a Date
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Efficient filtering using pre-sorted buckets
function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) {
    return tripsByMinute.flat(); // No filtering, return all trips
  }

  // Normalize both min and max minutes to the valid range [0, 1439]
  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;

  // Handle time filtering across midnight
  if (minMinute > maxMinute) {
    let beforeMidnight = tripsByMinute.slice(minMinute);
    let afterMidnight = tripsByMinute.slice(0, maxMinute);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

// Compute station traffic based on filtered trips
function computeStationTraffic(stations, timeFilter = -1) {
  // Retrieve filtered trips efficiently
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id
  );

  // Update station data with filtered counts
  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

// Wait for the map to load before adding data
map.on('load', async () => {
  console.log('Map loaded, adding bike lane data...');

  // Add Boston bike lanes
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'boston-bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: bikeLaneStyle,
  });

  // Add Cambridge bike lanes
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: bikeLaneStyle,
  });

  console.log('Bike lanes added successfully!');

  // Load Bluebikes station data
  let jsonData;
  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    jsonData = await d3.json(jsonurl);
    console.log('Loaded JSON Data:', jsonData);
  } catch (error) {
    console.error('Error loading JSON:', error);
    return;
  }

  // Load Bluebikes traffic data and parse dates
  let trips;
  try {
    const csvUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
    trips = await d3.csv(csvUrl, (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      
      // Add trips to minute buckets for efficient filtering
      let startedMinutes = minutesSinceMidnight(trip.started_at);
      let endedMinutes = minutesSinceMidnight(trip.ended_at);
      
      departuresByMinute[startedMinutes].push(trip);
      arrivalsByMinute[endedMinutes].push(trip);
      
      return trip;
    });
    console.log('Loaded Trips Data:', trips);
  } catch (error) {
    console.error('Error loading trips CSV:', error);
    return;
  }

  // Compute initial station traffic (all trips)
  let stations = computeStationTraffic(jsonData.data.stations);
  console.log('Stations with traffic data:', stations);

  // Create a square root scale for circle radius based on traffic
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);

  // Select the SVG element inside the map container
  const svg = d3.select('#map').select('svg');

  // Append circles to the SVG for each station
  const circles = svg
    .selectAll('circle')
    .data(stations, (d) => d.short_name) // Use station short_name as the key
    .enter()
    .append('circle')
    .attr('r', (d) => radiusScale(d.totalTraffic))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('fill-opacity', 0.6)
    .style('--departure-ratio', (d) =>
      stationFlow(d.departures / d.totalTraffic),
    )
    .each(function (d) {
      d3.select(this)
        .append('title')
        .text(
          `${d.name}\n${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
        );
    });

  // Function to update circle positions when the map moves/zooms
  function updatePositions() {
    circles
      .attr('cx', (d) => getCoords(d).cx)
      .attr('cy', (d) => getCoords(d).cy);
  }

  // Initial position update when map loads
  updatePositions();

  // Reposition markers on map interactions
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);

  console.log('Bike stations added successfully with traffic data!');

  // Get slider and time display elements
  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');

  // Function to update scatterplot based on time filter
  function updateScatterPlot(timeFilter) {
    // Recompute station traffic based on the time filter
    const filteredStations = computeStationTraffic(stations, timeFilter);

    // Adjust scale range based on filtering
    timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

    // Update the scatterplot by adjusting the radius of circles
    circles
      .data(filteredStations, (d) => d.short_name)
      .join('circle')
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .style('--departure-ratio', (d) =>
        stationFlow(d.departures / d.totalTraffic),
      )
      .each(function (d) {
        // Update tooltips
        d3.select(this)
          .select('title')
          .text(
            `${d.name}\n${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
          );
      });
  }

  // Function to update time display when slider moves
  function updateTimeDisplay() {
    let timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.textContent = '';
      anyTimeLabel.style.display = 'block';
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = 'none';
    }

    // Update the visualization
    updateScatterPlot(timeFilter);
  }

  // Listen for slider input
  timeSlider.addEventListener('input', updateTimeDisplay);
  
  // Initialize display
  updateTimeDisplay();
});