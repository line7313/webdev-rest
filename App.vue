<script setup>
import { reactive, ref, onMounted } from 'vue'

let crime_url = ref('http://localhost:8000');
const nominatim_url = ref('https://nominatim.openstreetmap.org');
let dialog_err = ref(false);
let initial_crimes = ref([]);
let displayed_crimes = ref([]);
let isLoading = ref(true);
let agent = ref(navigator.userAgent);
let pan_err = ref(false)
let pan_err_msg = ref("")
let startDate= ref("")
let endDate=ref("")
let maxRows= ref(1000)
const assualt_icon = ref("https://img.icons8.com/ios-filled/50/robber.png")
const burglar_icon = ref("https://img.icons8.com/ios-filled/50/000000/robber.png")
const other_crime_icon = ref("https://img.icons8.com/ios/50/000000/handcuffs.png")
const police_hat_icon = ref("https://img.icons8.com/ios-filled/50/policeman-male--v1.png")


const incidentColor = ref({
  "Narcotics": "green",
  "Assualt": "brown",
  "Vandalism": "purple",
  "Theft": "purple",
  "Proactive Police Visit": "lightskyblue",
  "Robbery": "purple",
  "Criminal Damage": "purple",
  "Burglary": "purple",
  "Agg. Assault Dom." : "brown",
  "Simple Assault Dom.": "brown",
  "Community Event": "lightskyblue",
  "Agg. Assault": "brown",
  "Auto Theft": "purple",
  "Discharge": "green"
})

const crimeTypes = ref({"Property Crime": ["Vandalism", "Robbery", "Criminal Damage", "Burglary", "Auto Theft"],
                        "Violent Crime": ["Assualt", "Agg. Assault Dom.", "Simple Assault Dom.", "Agg. Assault"],
                      "Other Crime" : ["Discharge"]})

let newCrime = ref({
  "case_number": "",
  "code": "",
  "incident": "",
  "police_grid": "",
  "neighborhood_number": null,
  "block": "",
  "date": "",
  "time": ""
})

const neighborhoodLocations = ref([
{id: 1, location : [44.942068, -93.020521]},
{id: 2, location : [44.977413, -93.025156]},
 {id: 3, location : [44.956192, -93.060189]},
 {id: 4, location : [44.978883, -93.068163]},
 {id: 5, location : [44.975766, -93.113887]},
 {id: 6, location : [44.959639, -93.121271]},
 {id: 7, location : [44.947700, -93.128505]},
 {id: 8, location : [44.930276, -93.119911]},
 {id: 9, location : [44.930276, -93.119911]},
 {id: 10, location : [44.982752, -93.147910]},
 {id: 11, location : [44.963631, -93.167548]},
 {id: 12, location : [44.973971, -93.197965]},
 {id: 13, location : [44.949043, -93.178261]},
 {id: 14, location : [44.934848, -93.176736]},
 {id: 15, location : [44.913106, -93.170779]},
 {id: 16, location : [44.937705, -93.136997]},
 {id: 16, location : [44.949203, -93.093739]}
])

let neighborhoodCrimes = ref({})

let addressGeolocation = ref({})

//incident filter
const incidentFilter = ref({
  Narcotics: false,
  Vandalism: false,
  Theft: false,
  Proactive_Police_Visit: false,
  Robbery: false,
  Criminal_Damage: false,
  Burglary: false,
  Agg_Assault_Dom : false,
  Simple_Assault_Dom: false,
  Community_Event: false,
  Agg_Assault: false,
  Auto_Theft: false,
  Discharge: false,

});

const curMapBounds = ref({
  ne: null,
  sw: null
})

const mapCenter = ref({lat: null, lon: null})

const neighborhoodFilter = ref({
  "Conway/Battlecreek/Highwood": false,
  "Greater East Side": false,
  "West Side": false,
  "Dayton's Bluff": false,
  "Payne/Phalen": false,
  "North End": false,
  "Thomas/Dale(Frogtown)": false,
  "Summit/University": false,
  "West Seventh": false,
  "Como": false,
  "Hamline/Midway": false,
  "St. Anthony": false,
  "Union Park": false,
  "Macalester-Groveland": false,
  "Highland": false,
  "Summit Hill": false,
  "Capitol River": false
})

var assualtIcon = L.icon({
  iconUrl: assualt_icon.value,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

var theftIcon = L.icon({
  iconUrl: burglar_icon.value,
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

var otherCrimeIcon = L.icon({
  iconUrl: other_crime_icon.value,
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

var notCrimeIcon = L.icon({
  iconUrl: police_hat_icon.value,
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

let map = reactive(
  {
    leaflet: null,
    center: {
      lat: 44.955139,
      lng: -93.102222,
      address: ''
    },
    zoom: 12,
    bounds: {
      nw: { lat: 45.008206, lng: -93.217977 },
      se: { lat: 44.883658, lng: -92.993787 }
    },
    neighborhood_markers: [
      { location: [44.942068, -93.020521], marker: null },
      { location: [44.977413, -93.025156], marker: null },
      { location: [44.931244, -93.079578], marker: null },
      { location: [44.956192, -93.060189], marker: null },
      { location: [44.978883, -93.068163], marker: null },
      { location: [44.975766, -93.113887], marker: null },
      { location: [44.959639, -93.121271], marker: null },
      { location: [44.947700, -93.128505], marker: null },
      { location: [44.930276, -93.119911], marker: null },
      { location: [44.982752, -93.147910], marker: null },
      { location: [44.963631, -93.167548], marker: null },
      { location: [44.973971, -93.197965], marker: null },
      { location: [44.949043, -93.178261], marker: null },
      { location: [44.934848, -93.176736], marker: null },
      { location: [44.913106, -93.170779], marker: null },
      { location: [44.937705, -93.136997], marker: null },
      { location: [44.949203, -93.093739], marker: null }
    ]
  }
);



// Vue callback for once <template> HTML has been added to web page
onMounted(() => {
  // setUpNeighborhoodCoords()
  initializeCrimes()
  
  

  // Create Leaflet map (set bounds and valied zoom levels)
  map.leaflet = L.map('leafletmap').setView([map.center.lat, map.center.lng], map.zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 11,
    maxZoom: 18
  }).addTo(map.leaflet);
  var markersGroup = L.layerGroup();
  map.leaflet.addLayer(markersGroup);
  map.leaflet.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);

  // map.neighborhood_markers.forEach((marker) => {
  //   var marker = L.marker(marker["location"])
  //   .bindTooltip("Null")
  //   .addTo(markersGroup);
  // })

  getNeighborhoodStats().then((stats) => {
    console.log(stats)
    stats.forEach((stat) => {
      console.log(stat)
      const location = neighborhoodLocations.value[stat["id"] - 1]["location"]
      var marker = L.marker(location)
      .bindTooltip("Crimes: " + stat["crimes"])
      .addTo(markersGroup);
    })
  })

  map.leaflet.on('move', function onDragEnd() {
    updateMapParams()
    filterCrimesByMapPosition()
  });

  function updateMapParams() {
    curMapBounds.ne = map.leaflet.getBounds()["_northEast"]
    curMapBounds.sw = map.leaflet.getBounds()["_southWest"]
    mapCenter.lat = map.leaflet.getCenter()["lat"]
    mapCenter.lon = map.leaflet.getCenter()["lng"]
    document.getElementById("latInput").placeholder = mapCenter.lat
    document.getElementById("lonInput").placeholder = mapCenter.lon
  }

  // Get boundaries for St. Paul neighborhoods
  let district_boundary = new L.geoJson();

  // set map bounds refs
  curMapBounds.ne = map.leaflet.getBounds()["_northEast"]
  curMapBounds.sw = map.leaflet.getBounds()["_southWest"]
  mapCenter.lat = map.leaflet.getCenter()["lat"]
  mapCenter.lon = map.leaflet.getCenter()["lng"]

  document.addEventListener("add-marker", function(event) {

    const location = event.detail.coordinates
    const label = event.detail.label
    const icon = event.detail.markerIcon
    var crimeMarker = L.marker(location, {icon: icon}).bindTooltip(label).addTo(map.leaflet)
    goToCoordinates(location[0], location[1])  })

  function goToCoordinates(lat, lon) {
    if (lat.length == 0) {
      lat = mapCenter.lat
    }
    if (lon.length == 0) {
      lon = mapCenter.lon
    }
    if ((isNaN(lat) || isNaN(lon))) {
      console.log("Not a number")
      pan_err_msg.value = "Invalid input"
      pan_err.value = true
      return
    }
    lat = parseFloat(lat)
    lon = parseFloat(lon)
    if (!inRange(lat, map.bounds.se.lat, map.bounds.nw.lat) || !inRange(lon, map.bounds.nw.lng, map.bounds.se.lng)) {
      console.log("invalid input for " + lat + " " + lon)
      pan_err_msg.value = "coordinates not in map bounds"
      pan_err.value = true
      return
    }
    console.log("pan to " +lat + ", " + lon)
    map.leaflet.panTo([lat, lon])
    updateMapParams()
  }

  //Map pan function
  document.getElementById("pan-button").addEventListener("click", function goToCoordinates() {
    let lat = document.getElementById("latInput").value.trim()
    let lon = document.getElementById("lonInput").value.trim()
    if (lat.length == 0) {
      lat = mapCenter.lat
    }
    if (lon.length == 0) {
      lon = mapCenter.lon
    }
    if ((isNaN(lat) || isNaN(lon))) {
      console.log("Not a number")
      pan_err_msg.value = "Invalid input"
      pan_err.value = true
      return
    }
    lat = parseFloat(lat)
    lon = parseFloat(lon)
    if (!inRange(lat, map.bounds.se.lat, map.bounds.nw.lat) || !inRange(lon, map.bounds.nw.lng, map.bounds.se.lng)) {
      console.log("invalid input for " + lat + " " + lon)
      pan_err_msg.value = "coordinates not in map bounds"
      pan_err.value = true
      return
    }
    console.log("pan to " +lat + ", " + lon)
    map.leaflet.panTo([lat, lon])
    updateMapParams()
  });


  district_boundary.addTo(map.leaflet);
  fetch('data/StPaulDistrictCouncil.geojson')
    .then((response) => {
      return response.json();
    })
    .then((result) => {
      result.features.forEach((value) => {
        district_boundary.addData(value);
      });
    })
    .catch((error) => {
      console.log('Error:', error);
    });
});

//TODO: replace other fetch functions with this
function fetchData(url,params) {
  let requestUrl = `${url}/${params}`
  console.log(requestUrl)
  return fetch(`${url}/${params}`, {
    headers: {
      "User-Agent": agent.value
    }
  })
  .then((response) => {
      return response.json();
    })
    .then((result) => {
      console.log(result)
      return result
    }).catch((err) => {
      console.log(err);
    })
}

// FUNCTIONS
// Function called once user has entered REST API URL
function initializeCrimes() {
  // TODO: get code and neighborhood data
  //       get initial 1000 crimes
  fetch(`${crime_url.value}/incidents?limit=1000`)
    .then((response) => {
      return response.json();
    })
    .then((result) => {
      initial_crimes.value = result;
      filterCrimesByMapPosition()
      isLoading.value = false;
    }).catch((err) => {
      console.log(err);
    })
}

function submitNewCrime() {  
  fetch('http://localhost:8000/new-incident', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newCrime.value),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    console.log(response);
  })
  .then(data => {
    console.log(data);
  })
  .catch(err => {
    console.error(err);
  });
}
// Function called when user presses 'OK' on dialog box
function closeDialog() {
  let dialog = document.getElementById('rest-dialog');
  let url_input = document.getElementById('dialog-url');
  if (crime_url.value !== '' && url_input.checkValidity()) {
    dialog_err.value = false;
    dialog.close();
    initializeCrimes();
  }
  else {
    dialog_err.value = true;
  }
}

//Queries the nominatim API based on string address
//Returns a tup;e map {lat : va, lon : val} 
function getCoordsFromAddress(address) {
  if (address in addressGeolocation) {
    return addressGeolocation[address]
  }
  
  let addresString = address.trim()
  addresString = addresString.replace(" AND ", " & ")
  let tempList = address.split(" ")
  tempList[0] = tempList[0].replaceAll("X", "0")
  addresString = tempList.join("+")

  const queryString = "search.php?q=" + addresString+"+Saint+Paul&format=json&limit=1"
  console.log(queryString)

  return fetchData(nominatim_url.value, queryString).then((result) => {
    if (result) {
      console.log(result[0])
      const coords = {"lat": result[0]["lat"], "lon": result[0]["lon"]}
      addressGeolocation[address] = coords
      return coords
    }
    return null
  }).catch((err) => {
      console.log(err);
    });

}

function generateConditions(filters) {
  const incidentNames = {
    theft: 'Theft',
    vandalism: 'Vandalism',
    narcotics: 'Narcotics',
    proactive_police_visit: 'Proactive Police Visit',
    robbery: 'Robbery',
    criminal_damage: 'Criminal Damage',
    burglary: 'Burglary',
    agg_assault_dom : 'Agg. Assault Dom.',
    simple_assault_dom: 'Simple Assault Dom.',
    community_event: 'Community Event',
    agg_assault: 'Agg. Assault',
    auto_theft: 'Auto Theft',
    discharge: 'Discharge ',

  };


  const conditions = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value && incidentNames[key.toLowerCase()]) {
      conditions.push(`${incidentNames[key.toLowerCase()]}`);
    } else if (value) {
      let condition;
      condition = `${key}`;
      conditions.push(condition);
    }
  }
  return conditions;
}

function inRange(x, min, max) {
    return ((x-min)*(x-max) <= 0);
}

function updateFilter() {
  const selectedIncidents = generateConditions(incidentFilter.value);
  const selectedNeighborhoods = generateConditions(neighborhoodFilter.value);
  const mapBounds = curMapBounds.value;
  console.log(mapBounds);

  let finalCodeCondition = '';

  if (selectedIncidents.length > 0) {
    finalCodeCondition = selectedIncidents.length > 1 ? `incident=${selectedIncidents.join(',')}` : `incident=${selectedIncidents[0]}`;
  }

  if (selectedNeighborhoods.length > 0) {
    const neighborhoodCondition = selectedNeighborhoods.length > 1 ? `neighborhood=${selectedNeighborhoods.join(',')}` : `neighborhood=${selectedNeighborhoods[0]}`;


    if (finalCodeCondition) {
      finalCodeCondition += `&${neighborhoodCondition}`;
    } else {
      finalCodeCondition = neighborhoodCondition;
    }
  }

  if (startDate.value && endDate.value) {
    console.log(startDate.value + " " + endDate.value)
    finalCodeCondition += `&start_date=${startDate.value}&end_date=${endDate.value}`;
  }

  if (finalCodeCondition === '') {
    finalCodeCondition = 'limit=1000';
  }else{
    finalCodeCondition += `&limit=${maxRows.value}`;
  }
console.log("_____________________________")
  console.log(finalCodeCondition);
  console.log("_____________________________")
  const filterUrl = `http://localhost:8000/incidents?${finalCodeCondition}`;

  console.log(filterUrl);

  fetch(filterUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((result) => {
      initial_crimes.value = result;
      console.log(initial_crimes.value);
      filterCrimesByMapPosition()
    })
    .catch((err) => {
      console.log(err);
    });
}


function deleteRow(id) {
  const deleteUrl = `${crime_url.value}/remove-incident`;
  const body = JSON.stringify({"case_number": parseInt(id)})
  console.log(body)
  console.log(deleteUrl)
  fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
    },
    body: body
  })
    .then((response) => {
      if (!response.ok) {
        alert(`Failed to delete case #${id}`)
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      alert(`Deleted case #${id}`)
      updateFilter()
    })
}

function getNeighborhoodStats() {
  const url_path = "neighborhood_stats"
  return fetchData(crime_url.value, url_path).then((response) => {
    response.forEach((neighborhood) => {
      neighborhoodCrimes[neighborhood.id] = neighborhood.crimes
    })
    return response
  })
}

function filterCrimesByMapPosition() {
  const visibleNeighborhoods = new Set()
  for (let i = 0; i<map.neighborhood_markers.length; i++) {
    const center = neighborhoodLocations.value[i]["location"]
    const lat = center[0]
    const lon = center[1]
    if (inRange(lat, curMapBounds.sw["lat"], curMapBounds.ne["lat"]) &&
    inRange(lon, curMapBounds.ne["lng"], curMapBounds.sw["lng"])) {
      visibleNeighborhoods.add(i+1)
    }
  }
  displayed_crimes = initial_crimes.value.filter((crime) => {
    return visibleNeighborhoods.has(crime.neighborhood_number)
  })
  console.log(displayed_crimes)
}

// function createCrimeMarker(crime) {
//   var marker = L.marker([44.942068, -93.020521])
//        .bindTooltip("Clickable Row!")
//        .addTo(markerGroup.value);
//   const location = getCoordsFromAddress(crime.block)
//    var marker = L.marker([location["lat"], location["lon"]])
//        .bindTooltip("Clickable Row!")
//        .addTo(markerGroup.value);
//   }

function setCrimeMarker(crime) {
  let crimeIcon = theftIcon
  if (incidentColor.value[crime.incident] == "green") {
    crimeIcon = otherCrimeIcon
  } if (incidentColor.value[crime.incident] == "lightskyblue") {
    crimeIcon = notCrimeIcon
  } if (incidentColor.value[crime.incident] == "brown") {
    crimeIcon = assualtIcon
  }
  console.log(incidentColor.value[crime.incident])
  console.log(crimeIcon.iconUrl)
  const markerLabel = `${crime.incident} on ${crime.date} at ${crime.time}`
  getCoordsFromAddress(crime.block).then((location) => {
    const coordArray = [location["lat"], location["lon"]]
    // const crimeInfo = {"location" : coordArray, "color": markerColor, "label": markerLabel}
    document.dispatchEvent(new CustomEvent("add-marker", {
      detail: { coordinates: coordArray, label: markerLabel, markerIcon: crimeIcon },
      bubbles: true
    }))
  })
}

</script>

<template>

  <div class="off-canvas-wrapper">
       
       <!-- Your page content lives here -->
       <div class="off-canvas-content" data-off-canvas-content>
           <!-- main content within a `grid-container` -->
           <div class="grid-container">

            <div  class="about-project">
            <h2 ><a href="./public/html/aboutProject.html" target="_blank" style="color: white;">About the Project</a></h2>
          </div>
          <br>
          <br>

          <dialog id="rest-dialog" open>
            <h1 class="dialog-header">St. Paul Crime REST API</h1>
            <label class="dialog-label">URL: </label>
            <input id="dialog-url" class="dialog-input" type="url" v-model="crime_url" placeholder="http://localhost:8000" />
            <p class="dialog-error" v-if="dialog_err">Error: must enter valid URL</p>
            <br />
            <button class="button" type="button" @click="closeDialog">OK</button>

          </dialog>
          <div class="grid-container ">
            <div class="grid-x grid-padding-x">
              <div id="leafletmap" class="cell auto"></div>
            </div>
          </div>
          <div class="cell large-auto" style="background-color: #150347;">
            <div class="center" >
            <p class="dialog-error" v-if="pan_err">{{pan_err_msg}}</p>
              <label for="lat"  style="color: white;">Latitude: </label>
              <input type="text" id="latInput" name="latInput">
              <label for="lon"  style="color: white;">Longitude: </label>
              <input type="text" id="lonInput" name="lonInput">
              <button id="pan-button" class="button" type="button" @click="goToCoordinates">Go!</button>
            </div>
          </div>
          
               <!-- `grid-x` represents a row -->
               <div class="grid-x grid-padding-x">
                <div class="cell large-auto" style="background-color: #616263;">
                  
                  <form @submit="submitNewCrime" class="input-form" >
                    <div class="center"><b>Report a Crime</b></div>
                    <label  style="color: white;" for="caseNumber">Case Number:</label>
                    <input type="text" id="caseNumber" v-model="newCrime.case_number" required>

                    <label  style="color: white;" for="code">Code:</label>
                    <input type="text"  id="code" v-model="newCrime.code" required>

                    <label  style="color: white;" for="incident">Incident:</label>
                    <input type="text" id="incident" v-model="newCrime.incident" required>

                    <label  style="color: white;" for="police_grid">Police Grid:</label>
                    <input type="text"  id="police_grid" v-model="newCrime.police_grid" required>

                    <label  style="color: white;" for="neighborhood_number">Neighborhood Number:</label>
                    <input type="number"  id="neightborhood_number" v-model="newCrime.neighborhood_number" required>

                    <label  style="color: white;" for="block">Block:</label>
                    <input type="text" id="block" v-model="newCrime.block" required>

                    <label  style="color: white;" for="date">Date:</label>
                    <input type="text" id="date" v-model="newCrime.date" required>

                    <label  style="color: white;" for="time">Time:</label>
                    <input type="text" id="time" v-model="newCrime.time" required>

                    <button type="submit" class="submit-button">Submit</button>
                  </form>
                </div>
               </div>
               
               <div class="grid-x grid-padding-x" style="display: inline;">
                      <!-- Incident filter check box -->
                      <div class="cell small-auto large-12" style="background-color: #000000;">
                        <div v-if="Object.keys(incidentFilter).length > 0">
                          <p style="font-weight: bold;">Incident Filter</p>
                       
                            <label style="display: inline; color:white; padding:10px;" v-for="(checked, incident) in incidentFilter" :key="incident">
                              <input type="checkbox" v-model="incidentFilter[incident]" @change="updateFilter" />
                              {{ incident }}
                            </label>
                        
                        </div>
                      </div>
               </div>

               <div class="grid-x grid-padding-x" style="display: inline;">
                      <!-- Neighborhood filter check box -->
                      <div class="cell small-auto large-12" style="background-color: #040404;">
                        <div v-if="Object.keys(neighborhoodFilter).length > 0">
                          <p style="font-weight: bold;">Neighborhood Filter</p>
                            <label style="display: inline; color:white; padding:10px;" v-for="(checked, neighborhood) in neighborhoodFilter" :key="neighborhood">
                              <input type="checkbox" v-model="neighborhoodFilter[neighborhood]" @change="updateFilter" />
                              {{ neighborhood }}
                            </label>
                         
                        </div>
                      </div>
               </div>
               <div class="grid-x grid-padding-x" style="display: inline;">
                    <!-- Date filters -->
                    <div class="cell small-auto large-12" style="background-color: #000000; color: white;">
                     
                        <label for="startDate">Start Date:</label>
                        <input type="date" id="startDate" v-model="startDate" @input="updateFilter" />

                        <label for="endDate">End Date:</label>
                        <input type="date" id="endDate" v-model="endDate" @input="updateFilter" />

                        <label class="cell" for="maxRows" style="color: white;">Number of Rows To Retrieve</label>
                        <input class="cell" type="number" id="maxRows" v-model="maxRows" @input="updateFilter" />
                        
                    </div>
               </div>


               <div class="grid-x grid-padding-x">
                   <div class="cell small-auto large-12" style="background-color: #121111;">
                    <div v-if="!isLoading">
                        <h2>Crime Table</h2>
                        <table>
                          <thead>
                            <tr>
                              <th>Block</th>
                              <th>Date</th>
                              <th>Time</th>
                              <th>Incident</th>
                              <th>Case Number</th>
                              <th>Neighborhood Number</th>
                              <th>Delete</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="crime in displayed_crimes" :key="crime.case_number" :style="{backgroundColor: incidentColor[crime.incident]}" 
                            id="table-row" @click="setCrimeMarker(crime)">
                              <td>{{ crime.block }}</td>
                              <td>{{ crime.date }}</td>
                              <td>{{ crime.time }}</td>
                              <td>{{ crime.incident }}</td>
                              <td>{{ crime.case_number }}</td>
                              <td>{{ crime.neighborhood_number }}</td>
                              <button id="delete-button" class="button" type="button" @click="deleteRow(crime.case_number)"
                              >Delete</button>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div v-else>
                        Loading...
                      </div>
                  </div>
               </div>
           </div>
       </div>
   </div>

</template>

<style>

body{
  background-color: rgb(23, 23, 58);;
  color: white;
}
#rest-dialog {
  width: 20rem;
  margin-top: 1rem;
  z-index: 1000;
}

#leafletmap {
  height: 500px;
}

.dialog-header {
  font-size: 1.2rem;
  font-weight: bold;
}

.dialog-label {
  font-size: 1rem;
}

.dialog-input {
  font-size: 1rem;
  width: 100%;
}

.dialog-error {
  font-size: 1rem;
  color: #D32323;
}

.input-form-container {
  width: 33.33%;
  margin-top: 5rem;
  margin-left: 5rem;
  padding: 1rem;
  
}

.input-form {
  border: solid black 1px;
  padding: 1rem;
}

.submit-button {
  background-color: rgb(30, 30, 141);
  color: white;
  padding: 0.5rem;
}

.center {
  display: flex;
  justify-content: center;
  margin: 10px auto;
  }

  .about-project {
    margin-left: 43%;
    margin-top: 1rem;
    font-weight: bold;  
  }
</style>
