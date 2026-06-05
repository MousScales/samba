/**
 * LeafletMap — OpenStreetMap via WebView.
 * Works in Expo Go and any build without native Google Maps SDK compiled in.
 */
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const buildHtml = ({ lat, lng, zoom, pins, userLat, userLng }) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; background:#141414; }
  .leaflet-container    { background:#141414 !important; }
  .leaflet-control-attribution,
  .leaflet-control-zoom { display:none !important; }
  .ecm          { cursor:pointer; display:flex; flex-direction:column; align-items:center; }
  /* Title pill — floats above the image, fully separate */
  .ecm .ttl {
    background:rgba(12,12,12,0.92);
    border:1px solid rgba(255,255,255,0.12);
    border-radius:6px;
    padding:3px 8px;
    margin-bottom:5px;
    max-width:88px;
    text-align:center;
    font-size:9px; font-weight:700; color:#fff;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    font-family:-apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    transition:transform 0.15s;
  }
  /* Portrait image card */
  .ecm .img-wrap {
    width:56px; height:78px;
    border-radius:10px;
    overflow:hidden;
    border:1.5px solid rgba(255,255,255,0.14);
    box-shadow:0 4px 16px rgba(0,0,0,0.65);
    transition:transform 0.15s, border-color 0.15s;
  }
  .ecm .img-wrap img { width:56px; height:78px; object-fit:cover; display:block; }
  /* Pin dot at the bottom */
  .ecm .dot {
    width:7px; height:7px; border-radius:50%;
    background:#fff; margin-top:3px;
    box-shadow:0 0 0 2.5px rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.6);
  }
  /* Selected state */
  .ecm.sel .ttl     { border-color:rgba(255,255,255,0.35); transform:scale(1.06); }
  .ecm.sel .img-wrap{ border-color:rgba(255,255,255,0.4); transform:scale(1.06); box-shadow:0 6px 22px rgba(0,0,0,0.8); }
  .ecm.sel .dot     { background:#FF4B8C; box-shadow:0 0 0 3px rgba(255,75,140,0.35); }
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map', {
  zoomControl: false,
  attributionControl: false,
  tap: true,
}).setView([${lat}, ${lng}], ${zoom});

// CartoDB dark tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19, subdomains: 'abcd',
}).addTo(map);

// ── White live location dot ──────────────────────────────────────────────────
function whiteLocationIcon() {
  return L.divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,0.25),0 2px 8px rgba(0,0,0,0.5)"></div>',
    className: '',
    iconSize:   [14, 14],
    iconAnchor: [7, 7],
  });
}

// ── Event photo-card marker ──────────────────────────────────────────────────
// Layout (top → bottom): title pill | portrait image | pin dot
function cardIcon(imgSrc, title, selected) {
  var cls = 'ecm' + (selected ? ' sel' : '');
  var safeTitle = (title || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  var html =
    '<div class="' + cls + '">' +
      '<div class="ttl">' + safeTitle + '</div>' +
      '<div class="img-wrap">' +
        '<img src="' + imgSrc + '" onerror="this.style.background=\\'#1a1a1a\\'">' +
      '</div>' +
      '<div class="dot"></div>' +
    '</div>';
  return L.divIcon({
    html:       html,
    className:  '',
    iconSize:   [90, 106],   // wide enough for title, tall enough for img + dot
    iconAnchor: [45, 106],   // anchor at center of dot
  });
}

// ── User location ────────────────────────────────────────────────────────────
${(userLat && userLng) ? `
L.marker([${userLat}, ${userLng}], { icon: whiteLocationIcon(), zIndexOffset: 2000 })
  .addTo(map);
` : ''}

// ── Event pins ───────────────────────────────────────────────────────────────
var pins   = ${JSON.stringify(pins)};
var markers = {};

pins.forEach(function(p) {
  var m = L.marker([p.lat, p.lng], { icon: cardIcon(p.image, p.title, false) }).addTo(map);
  markers[p.id] = m;
  m.on('click', function(e) {
    L.DomEvent.stopPropagation(e);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type:'markerPress', id: p.id }));
  });
});

// Highlight selected marker from RN
document.addEventListener('message', function(e) {
  try {
    var msg = JSON.parse(e.data);
    if (msg.type === 'selectPin') {
      pins.forEach(function(p) {
        var sel = p.id === msg.id;
        if (markers[p.id]) markers[p.id].setIcon(cardIcon(p.image, p.title, sel));
      });
    }
  } catch(err) {}
});

// Dismiss on map tap
map.on('click', function() {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type:'mapPress' }));
});

window.ReactNativeWebView.postMessage(JSON.stringify({ type:'ready' }));
</script>
</body>
</html>
`;

const LeafletMap = forwardRef(function LeafletMap({
  initialRegion,
  pinEvents = [],
  selectedPin,
  onMarkerPress,
  onMapPress,
  userLocation,
  style,
}, ref) {
  const webRef = useRef(null);

  // Expose injectJavaScript so parent can pan/zoom the map
  useImperativeHandle(ref, () => ({
    injectJavaScript: (js) => webRef.current?.injectJavaScript(js),
    animateToRegion: ({ latitude, longitude }) => {
      webRef.current?.injectJavaScript(
        `map.setView([${latitude},${longitude}], 14, {animate:true}); true;`
      );
    },
  }));

  const lat  = initialRegion?.latitude  ?? 40.7128;
  const lng  = initialRegion?.longitude ?? -74.006;
  const zoom = 12;

  // Pass image + title for each pin so the card marker can show them
  const pins = pinEvents.map(e => ({
    id:    e.id,
    lat:   e._coords.latitude,
    lng:   e._coords.longitude,
    image: e.image || '',
    title: e.title || '',
  }));

  const html = buildHtml({
    lat, lng, zoom, pins,
    userLat: userLocation?.latitude,
    userLng: userLocation?.longitude,
  });

  const onMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'markerPress') onMarkerPress?.(msg.id);
      if (msg.type === 'mapPress')    onMapPress?.();
    } catch {}
  };

  // Tell the WebView which pin is selected (highlights the card)
  useEffect(() => {
    if (!webRef.current) return;
    webRef.current.injectJavaScript(
      `document.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'selectPin',id:${JSON.stringify(selectedPin ?? null)}})})); true;`
    );
  }, [selectedPin]);

  // Pan to user location when it arrives
  useEffect(() => {
    if (!userLocation?.latitude || !webRef.current) return;
    webRef.current.injectJavaScript(
      `map.setView([${userLocation.latitude},${userLocation.longitude}], 13, {animate:true}); true;`
    );
  }, [userLocation?.latitude, userLocation?.longitude]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        scrollEnabled={false}
        javaScriptEnabled
        style={{ flex: 1, backgroundColor: '#141414' }}
      />
    </View>
  );
});

export default LeafletMap;
