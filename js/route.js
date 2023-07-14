import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js';

var busList = [];
var busIdList = [];
var busMarkers = [];

var waypointList = [];
var routingControl = null;
var currentCoor = 0;
var currentRouteId = null;

const firebaseConfig = {
  // databaseURL: "https://fbus-388009-default-rtdb.asia-southeast1.firebasedatabase.app/"
  // databaseURL: 'https://fbus-public-map-default-rtdb.asia-southeast1.firebasedatabase.app'
  databaseURL: "https://f-bus-map-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

var routeData = null;
var routeDataChanged;
var routeIds = [];

const routeRef = ref(database, 'locations/');
onValue(routeRef, async (snapshot) => {
  var newRouteData = snapshot.val();
  if (routeData == null) {
    routeData = newRouteData;
  } else {
    var oldKeys = Object.keys(routeData);
    var newKeys = Object.keys(newRouteData);
    if (oldKeys.length == newKeys.length) {
      for (var i = 0; i < oldKeys.length; i++) {
        if (oldKeys[i] != newKeys[i]) {
          routeDataChanged = true;
          break;
        }
      }
    } else {
      routeDataChanged = true;
    }
    routeData = newRouteData;
  }
  routeIds = Object.keys(routeData);
})

var busData = null;
var busDataChanged = false;

export async function getBusData(routeId) {
  const busRef = ref(database, 'locations/' + routeId + "/");
  onValue(busRef, async (snapshot) => {
    const newBusData = snapshot.val();
    if (busData == null) {
      busData = newBusData;
    } else {
      var oldKeys = Object.keys(busData);
      var newKeys = Object.keys(newBusData);
      if (oldKeys.length == newKeys.length) {
        for (var i = 0; i < oldKeys.length; i++) {
          if (oldKeys[i] != newKeys[i]) {
            busDataChanged = true;
            break;
          }
        }
      } else {
        busDataChanged = true;
      }
      busData = newBusData;
    }
  });
  await until(_ => busData != null);
  busDataChanged = false;
  console.log('call')
  return busData;
}


export function until(conditionFunction) {
  const poll = resolve => {
    if (conditionFunction()) resolve();
    else setTimeout(_ => poll(resolve), 400);
  }
  return new Promise(poll);
}

export { routeDataChanged, busDataChanged }

export async function getRouteData() {
  await until(_ => routeData != null);
  routeDataChanged = false;
  return routeData;
}

const getRouteDetails = async (routeId) => {
  const response = await fetch('https://fbus-final.azurewebsites.net/api/routes/' + routeId)
  const data = await response.json();
  return data;
}

const getBusDetails = async (busId) => {
  const response = await fetch('https://fbus-final.azurewebsites.net/api/buses/' + busId)
  const data = await response.json();
  return data;
}