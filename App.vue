<script setup>
import { reactive, ref, onMounted } from 'vue'

let crime_url = ref('http://localhost:8000');
let dialog_err = ref(false);
let initial_crimes = ref('');

//incident filter
const incidentFilter = ref({
  Narcotics: false,
  Assault: false,
  Theft: false,
  Other: false
});

const neighborhoodFilter= ref({
    "Conway/Battlecreek/Highwood":false,
    "Greater East Side":false,
    "West Side":false,
    "Dayton's Bluff":false,
    "Payne/Phalen":false,
    "North End":false,
    "Thomas/Dale(Frogtown)":false,
    "Summit/University":false,
    "West Seventh":false,
    "Como":false,
    "Hamline/Midway":false,
    "St. Anthony":false,
    "Union Park":false,
    "Macalester-Groveland":false,
    "Highland":false,
    "Summit Hill":false,
    "Capitol River":false
})

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

    initializeCrimes();

    // Create Leaflet map (set bounds and valied zoom levels)
    map.leaflet = L.map('leafletmap').setView([map.center.lat, map.center.lng], map.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 11,
        maxZoom: 18
    }).addTo(map.leaflet);
    map.leaflet.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);

    // Get boundaries for St. Paul neighborhoods
    let district_boundary = new L.geoJson();
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
            console.log(result);
            initial_crimes = result;
        }).catch((err) => {
            console.log(err);
        })
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


// Function for generating code conditions
function generateCodeConditions(incidentFilter) {
  let codeConditions = [];

  for (const [key, value] of Object.entries(incidentFilter.value)) {
    if (value === true) {
      const lowerKey = key.toLowerCase();
      console.log("current key is "+lowerKey)
      if (lowerKey === 'vandalism') {
        codeConditions.push('code >= 1400 AND code < 1430');
      } else if (lowerKey === 'theft') {
        codeConditions.push('code > 600 AND code < 693');
      } else if (lowerKey === 'narcotics') {
        codeConditions.push('code > 1800 AND code < 1885');
        console.log(codeConditions)
      } else if (lowerKey === 'assault') {
        codeConditions.push('code > 400 AND code < 863 AND incident LIKE "%assau%"');
      } else if (lowerKey === 'other') {
        // other code conditions
        codeConditions.push('code > 100 AND code NOT BETWEEN 1400 AND 1430 AND code NOT BETWEEN 600 AND 693 AND code NOT BETWEEN 1800 AND 1885 AND code NOT BETWEEN 400 AND 863');
      }
    }
  }
  
  if(codeConditions.length>1){
    return codeConditions.join(' OR ');
  }else{
    return codeConditions;
  }
 
}

// Function for generating neighborhood conditions
function generateNeighborhoodNames(neighborhoodFilter) {
  let neighborhoodNames = [];

  for (const [key, value] of Object.entries(neighborhoodFilter.value)) {
    if (value === true && key.toLowerCase() !== 'other') {
      // Construct neighborhood conditions based on selected filters
      neighborhoodNames.push(`neighborhood = '${key}'`);
    }
  }
  if(neighborhoodNames.length>1){
    return neighborhoodNames.join(' OR ');
  }else{
    return neighborhoodNames;
  }
}


function updateFilter() {
  
  const codeConditions = generateCodeConditions(incidentFilter);
  const neighborhood = generateNeighborhoodNames(neighborhoodFilter);
  
  //console.log(codeConditions);
  //console.log(neighborhood);
  
  let finalCodeCondition = '';

  if (codeConditions.length>0 ) {
    finalCodeCondition += codeConditions;
  }

  if (neighborhood.length > 0) {
    if (finalCodeCondition !== '') {
      finalCodeCondition += ' AND ';
    }
    finalCodeCondition += neighborhood;
  }

  if (finalCodeCondition === '') {
    finalCodeCondition = 'code > 100';
  }
  console.log(`This is the start-----------------------------------------------`)
  console.log(finalCodeCondition);
  console.log(`This is the end-----------------------------------------------`)

  fetch(`http://localhost:8000/incidents?code=${finalCodeCondition}`)
    .then((response) => response.json())
    .then((json) => {
      console.log(json);
    })
    .catch((err) => {
      console.log(err);
    });
}


</script>

<template>
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

    <div>
        <form>
            <!--Will add report a crime form here -->
        </form>
    </div>

    <!--Incident filter check box-->
    <div>
        <p style="font-weight: bold;">Incident Filter</p>
        <label style="display: inline; padding:10px;" v-for="(checked, incident) in incidentFilter" :key="incident">
            <input type="checkbox" v-model="incidentFilter[incident]" @change="updateFilter" />
            {{ incident }}
        </label>
  </div>

  <!--neighborhood filter check box-->
  <div>
        <p style="font-weight: bold;">Neighborhood Filter</p>
        <label style="display: inline; padding:10px;" v-for="(checked, neighborhood) in neighborhoodFilter" :key="neighborhood">
            <input type="checkbox" v-model="neighborhoodFilter[neighborhood]" @change="updateFilter" />
            {{ neighborhood }}
        </label>
  </div>

    <div>
        <div>
            <h2>Crime Table</h2>
            <!-- Once map working will modify to only include crimes that are visible on the map -->
            <table>
                <thead>
                    <tr>
                        <th>Block</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Incident</th>
                        <th>Case Number</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="crime in initial_crimes" :key="crime.case_number">
                        <td>{{ crime.block }}</td>
                        <td>{{ crime.date }}</td>
                        <td>{{ crime.time }}</td>
                        <td>{{ crime.incident }}</td>
                        <td>{{ crime.case_number }}</td>
                    </tr>
                </tbody>
            </table>
        </div>


    </div>
</template>

<style>
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
</style>
