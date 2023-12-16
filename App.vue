<script setup>
import { reactive, ref, onMounted } from 'vue'

let crime_url = ref('http://localhost:8000');
let dialog_err = ref(false);
let initial_crimes = ref([]);
let isLoading = ref(true);
let submitError = ref(null);

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

//incident filter
const incidentFilter = ref({
  Narcotics: false,
  Assault: false,
  Theft: false,
  Other: false,
});

const neighborhoodFilter = ref({
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
  8: false,
  9: false,
  10: false,
  11: false,
  12: false,
  13: false,
  14: false,
  15: false,
  16: false,
  17: false
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
      initial_crimes.value = result;
      isLoading.value = false;
    }).catch((err) => {
      console.log(err);
    })
}

function submitNewCrime() {  
  //curl -X PUT -H "Content-Type: application/json" -d "{\"case_number\": \"123456\",\"code\": \"99999\",\"incident\": \"Theft\",\"police_grid\": \"ABC\",\"neighborhood_number\": 123,\"block\": \"XYZ\",\"date\": \"2023-12-15\",\"time\": \"12:34:56\"}" "http://localhost:8000/new-incident"
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
    submitError.value = false;
    console.log("HERRE");
    console.log(data);
  })
  .catch(err => {
    console.log("HER");
    submitError.value = true;
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


// Function for checking which filter has been selected
function generateConditions(filters) {
  const conditionMap = {
    vandalism: 'between 1400 and 1430',
    theft: 'between 600 and 693',
    narcotics: 'between 1800 and 1885',
    assault: 'between 400 and 863 and incident LIKE "%assau%"',
    //might take this out
    other: 'NOT BETWEEN 1400 AND 1430 AND code NOT BETWEEN 600 AND 693 AND code NOT BETWEEN 1800 AND 1885 AND code NOT BETWEEN 400 AND 863'
  };
  const conditions = [];

  //checking which checkbox is checked or not and pushing
  for (const [key, value] of Object.entries(filters)) {
    if (value && conditionMap[key.toLowerCase()]) {
      conditions.push(`code=${conditionMap[key.toLowerCase()]}`);
    } else if (value) {
      conditions.push(`neighborhood_number=${key}`);
    }
  }
  console.log("This is what gets sent")
  console.log(conditions)
  console.log("************************************")

  return conditions;
}


function updateFilter() {
  const selectedIncidents = generateConditions(incidentFilter.value);
  const selectedNeighborhoods = generateConditions(neighborhoodFilter.value);

  let finalCodeCondition = '';

  if (selectedIncidents.length > 0) {
    finalCodeCondition = selectedIncidents.length > 1 ? `${selectedIncidents.join(' OR ')}` : selectedIncidents[0];
  }

  if (selectedNeighborhoods.length > 0) {
    const neighborhoodCondition = selectedNeighborhoods.length > 1 ? `${selectedNeighborhoods.join(' OR ')}` : selectedNeighborhoods[0];

    if (finalCodeCondition) {
      finalCodeCondition += ` AND ${neighborhoodCondition}`;
    } else {
      finalCodeCondition = neighborhoodCondition;
    }
  }

  if (finalCodeCondition === '') {
    finalCodeCondition = 'limit=1000';
  }

  console.log(finalCodeCondition);

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


  <div class="input-form-container">

    <div class="center">
      <b v-if="!submitError">
        Successfully Reported Crime
      </b>

      <b v-if="submitError">
        Error Reporting Crime
      </b>
    </div>

    <form @submit="submitNewCrime" class="input-form">
      <div class="center"><b>Report a Crime</b></div>
      <label for="caseNumber">Case Number:</label>
      <input type="text" id="caseNumber" v-model="newCrime.case_number" required>

      <label for="code">Code:</label>
      <input type="text"  id="code" v-model="newCrime.code" required>

      <label for="incident">Incident:</label>
      <input type="text" id="incident" v-model="newCrime.incident" required>

      <label for="police_grid">Police Grid:</label>
      <input type="text"  id="police_grid" v-model="newCrime.police_grid" required>

      <label for="neighborhood_number">Neighborhood Number:</label>
      <input type="number"  id="neightborhood_number" v-model="newCrime.neighborhood_number" required>

      <label for="block">Block:</label>
      <input type="text" id="block" v-model="newCrime.block" required>

      <label for="date">Date:</label>
      <input type="text" id="date" v-model="newCrime.date" required>

      <label for="time">Time:</label>
      <input type="text" id="time" v-model="newCrime.time" required>

      <button type="submit" class="submit-button">Submit</button>
    </form>
  </div>

  <!--Incident filter check box-->
  <div v-if="Object.keys(incidentFilter).length > 0">
    <p style="font-weight: bold;">Incident Filter</p>
    <label style="display: inline; padding:10px;" v-for="(checked, incident) in incidentFilter" :key="incident">
      <input type="checkbox" v-model="incidentFilter[incident]" @change="updateFilter" />
      {{ incident }}
    </label>
  </div >

  <!--neighborhood filter check box-->
  <div v-if="Object.keys(neighborhoodFilter).length > 0">
    <p style="font-weight: bold;">Neighborhood Filter</p>
    <label style="display: inline; padding:10px;" v-for="(checked, neighborhood) in neighborhoodFilter"
      :key="neighborhood">
      <input type="checkbox" v-model="neighborhoodFilter[neighborhood]" @change="updateFilter" />
      {{ neighborhood }}
    </label>
  </div>

  <div>
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
          </tr>
        </thead>
        <tbody>
          <tr v-for="crime in initial_crimes" :key="crime.case_number">
            <td>{{ crime.block }}</td>
            <td>{{ crime.date }}</td>
            <td>{{ crime.time }}</td>
            <td>{{ crime.incident }}</td>
            <td>{{ crime.case_number }}</td>
            <td>{{ crime.neighborhood_number }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>
      Loading...
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
  }
</style>
