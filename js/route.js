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
  databaseURL: "https://fbus-388009-default-rtdb.asia-southeast1.firebasedatabase.app/"
  // databaseURL: 'https://fbus-public-map-default-rtdb.asia-southeast1.firebasedatabase.app'
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
  return busData;
}


export function until(conditionFunction) {
  const poll = resolve => {
    if (conditionFunction()) resolve();
    else setTimeout(_ => poll(resolve), 400);
  }
  return new Promise(poll);
}

export { routeDataChanged , busDataChanged}

export async function getRouteData() {
  await until(_ => routeData != null);
  routeDataChanged = false;
  return routeData;
}

// onValue(routeRef, async (snapshot) => {
//   if (routingControl != null) {
//     mapObj.removeControl(routingControl);
//     routingControl = null;
//   }

//   mapObj.eachLayer(function (layer) {
//     mapObj.removeLayer(layer)
//   });
//   // add tile để map có thể hoạt động, xài free từ OSM
//   L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
//     attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
//   }).addTo(mapObj);


//   const routeData = snapshot.val();
//   console.log(routeData)
//   routeIdList = Object.keys(routeData);
//   var isFirst = true;

//   for (const routeId of routeIdList) {
//     busList.push(routeData[routeId]);
//     const routeDetails = await getRouteDetails(routeId);
//     const carouselItem = createBoardForRoute(routeDetails, isFirst);
//     document.getElementById('my-map-carousel').appendChild(carouselItem);
//     createBoardForStation(carouselItem, routeDetails.stations, mapObj);
//     if (isFirst) {
//       currentRouteId = routeId;
//       if (routingControl == null) {
//         for (const waypoint of waypointList) {
//           if (waypoint.routeId == currentRouteId) {
//             routingControl = L.Routing.control({
//               waypoints: waypoint.newKey,
//               fitSelectedRoutes: true
//             }).addTo(mapObj);

//             busIdList = Object.keys(busList[currentCoor]);
//             const busData = routeData[currentRouteId];
//             for (const busId of busIdList) {
//               var busIcon = L.icon({
//                 iconUrl: '../img/bus.png',
//                 iconSize: [60, 60]
//               })
//               if (busMarkers.some(busMarker => busMarker.busId === busId)) {
//                 for (const busMarker of busMarkers) {
//                   if (busMarker.busId === busId) {
//                     console.log(busMarker);
//                     busMarker.marker.setLatLng([busData[busId].latitude, busData[busId].longitude]);
//                   }
//                 }
//               } else {
//                 busMarkers.push({
//                   busId: busId,
//                   marker: L.marker([busData[busId].latitude, busData[busId].longitude], { icon: busIcon }).addTo(mapObj)
//                 })
//               }
//             }
//           }
//         }
//       }
//     }
//     isFirst = false;
//   }

//   document.getElementById('my-map').addEventListener('slide.bs.carousel', function () {
//     if (routingControl != null) {
//       mapObj.removeControl(routingControl);
//       routingControl = null;
//     }

//     for (var i = currentCoor; i < waypointList.length; i++) {
//       if (+waypointList[i].routeId !== +currentRouteId) {
//         currentRouteId = +waypointList[i].routeId;
//         routingControl = L.Routing.control({
//           waypoints: waypointList[i].newKey,
//           fitSelectedRoutes: true
//         }).addTo(mapObj);

//         const busData = routeData[currentRouteId];
//         currentCoor = i;
//         console.log('current coor ' + currentCoor);
//         console.log(busList[currentCoor]);
//         busIdList = Object.keys(busList[currentCoor]);
//         if (currentCoor === waypointList.length - 1) {
//           currentCoor = 0;
//         }
//         for (const busId of busIdList) {
//           var busIcon = L.icon({
//             iconUrl: '../img/bus.png',
//             iconSize: [60, 60]
//           })
//           if (busMarkers.some(busMarker => busMarker.busId === busId)) {
//             for (const busMarker of busMarkers) {
//               if (busMarker.busId === busId) {
//                 // console.log(busMarker.marker.dragging._marker._latlng);
//                 // busMarker.marker.setLatLng([busData[busId].latitude, busData[busId].longitude]);
//                 // busMarker.marker.dragging._marker._latlng = {lat: busData[busId].latitude, lng: busData[busId].longitude};
//                 break;
//               }
//             }
//           } else {
//             busMarkers.push({
//               busId: busId,
//               marker: L.marker([busData[busId].latitude, busData[busId].longitude], { icon: busIcon }).addTo(mapObj)
//             })
//           }
//         }
//         currentCoor = i;
//         console.log('coor ' + currentCoor);
//         if (currentCoor === waypointList.length - 1) {
//           currentCoor = 0;
//         }
//         break;
//       }
//     }
//   })


//     // for (const waypoint of waypointList) {
//     //   var routeId = +waypoint.routeId;
//     //   console.log('routeId ' + routeId);
//     //   console.log('current ' + currentRouteId);
//     //   const isDup = routeId === +currentRouteId;
//     //   console.log(isDup);
//     //   if(!isDup){
//     //     currentRouteId = waypoint.routeId;
//     //     console.log(currentRouteId);
//     //     break;
//     //   }
//     // }

// });

// const loadRoutes = onValue(routeRef, (snapshot) => {
//   routingControl = null
//   const data = snapshot.val();
//   routeIdList = Object.keys(data);
//   var isFirst = true;
//   routeIdList.forEach(async key => {
//     busList.push(data[key])
//     const routeDetails = await getRouteDetails(key);
//     const carouselItem = createBoardForRoute(routeDetails, isFirst);
//     document.getElementById('my-map-carousel').appendChild(carouselItem);

//     createBoardForStation(carouselItem, routeDetails.stations, mapObj);

//     if (routingControl == null) {
//       currentRouteId = key;
//       routingControl = L.Routing.control({
//         waypoints: waypointList[currentCoor].newKey,
//         fitSelectedRoutes: true
//       }).addTo(mapObj);
//       currentCoor++;
//       if (currentCoor >= waypointList.length) {
//         currentCoor = 0;
//       }

//       const busRef = ref(database, 'locations/' + currentRouteId + '/');
//       onValue(busRef, (snapshot) => {
//         const busData = snapshot.val();
//         if(waypointList[0].routeId === currentRouteId){
//           console.log("dup");
//         } else {
//           for(var i = 0; i<waypointList.length; i++){
//             if(waypointList[i].routeId === currentRouteId){
//               currentCoor = i;
//               break;
//             }
//           }
//         }
//         busIdList = Object.keys(busList[currentCoor]);
//         busIdList.forEach(id => {
//           var busIcon = L.icon({
//             iconUrl: '../img/bus.png',
//             iconSize: [60, 60]
//           })
//           if (busMarkers.some(busMarker => busMarker.busId === id)) {
//             busMarkers.forEach(busMarker => {
//               if(busMarker.busId === id){
//                 busMarker.setLatLng([busData[id].latitude, busData[id].longitude]);
//               }
//             });
//           } else {
//             busMarkers.push({
//               busId: id,
//               marker: L.marker([busData[id].latitude, busData[id].longitude], { icon: busIcon }).addTo(mapObj)
//             })
//           }
//         });
//       })
//     }

//     isFirst = false;
//   });
//   document.getElementsByClassName('carousel')[0].addEventListener('slide.bs.carousel', function () {
//     currentCoor++;
//     if(waypointList[0].routeId === currentRouteId){
//       console.log("dup");
//     } else {
//       for(var i = 0; i<waypointList.length; i++){
//         if(waypointList[i].routeId === currentRouteId){
//           currentCoor = i;
//           break;
//         }
//       }
//     }
//     if (currentCoor >= waypointList.length) {
//       currentCoor = 0;
//     }
//     if (routingControl != null) {
//       mapObj.removeControl(routingControl);
//     }
//     routingControl = L.Routing.control({
//       waypoints: waypointList[currentCoor].newKey,
//       fitSelectedRoutes: true
//     }).addTo(mapObj);

//     // const busRef = ref(database, 'locations/' + waypointList[currentCoor].routeId + '/');
//     // onValue(busRef, (snapshot) => {
//     //   const busData = snapshot.val();
//     //   busIdList = Object.keys(busList[currentCoor]);
//     //   console.log(busData[0]);
//     // })
//     const busRef = ref(database, 'locations/' + currentRouteId + '/');
//     onValue(busRef, (snapshot) => {
//       const busData = snapshot.val();
//       busIdList = Object.keys(busList[currentCoor]);
//       busIdList.forEach(id => {
//         var busIcon = L.icon({
//           iconUrl: '../img/bus.png',
//           iconSize: [60, 60]
//         })
//         L.marker([busData[id].latitude, busData[id].longitude], { icon: busIcon }).addTo(mapObj);
//       });
//     })
//   })
// });



const getRouteDetails = async (routeId) => {
  const response = await fetch('https://fbus-final.azurewebsites.net/api/routes/' + routeId)
  const data = await response.json();
  return data;
}

const createBoardForRoute = (routeDetails, active) => {
  const carouselItem = document.createElement('div');
  carouselItem.classList.add('carousel-item');
  if (active) {
    carouselItem.classList.add('active');
  }

  const boardContainter = document.createElement('div');
  boardContainter.classList.add('board-container');

  const routeBoard = document.createElement('div');
  routeBoard.classList.add('board');

  const routeBoardTitleContainer = document.createElement('div');
  routeBoardTitleContainer.classList.add('board-title-container');
  const routeBoardTitle = document.createElement('p');
  routeBoardTitle.classList.add('board-title');
  routeBoardTitle.textContent = 'Route Details';
  routeBoardTitleContainer.appendChild(routeBoardTitle);
  routeBoard.appendChild(routeBoardTitleContainer);

  const routeBoardContentContainer = document.createElement('div');
  routeBoardContentContainer.classList.add('board-content-container');

  const routePropertyContainer = document.createElement('div');
  routePropertyContainer.classList.add('route-property-container');
  const beginningProp = document.createElement('p');
  beginningProp.classList.add('route-property');
  beginningProp.textContent = 'Beginning: ';
  const destinationProp = document.createElement('p');
  destinationProp.classList.add('route-property');
  destinationProp.textContent = 'Destination: ';
  routePropertyContainer.appendChild(beginningProp);
  routePropertyContainer.appendChild(destinationProp);
  routeBoardContentContainer.appendChild(routePropertyContainer);

  const routeBoardValueContainer = document.createElement('div');
  routeBoardValueContainer.classList.add('route-value-container');
  const beginningValue = document.createElement('p');
  beginningValue.classList.add('route-value');
  beginningValue.textContent = routeDetails.beginning;
  const destinationValue = document.createElement('p');
  destinationValue.classList.add('route-value');
  destinationValue.textContent = routeDetails.destination;
  routeBoardValueContainer.appendChild(beginningValue);
  routeBoardValueContainer.appendChild(destinationValue);
  routeBoardContentContainer.appendChild(routeBoardValueContainer);

  routeBoard.appendChild(routeBoardContentContainer);
  boardContainter.appendChild(routeBoard);
  carouselItem.appendChild(boardContainter);

  const mapDiv = document.createElement('div');
  mapDiv.id = 'route-map-' + routeDetails.id;
  mapDiv.className = 'map-div';
  carouselItem.appendChild(mapDiv);

  return carouselItem;
}

const createBoardForStation = (carouselItem, stations, mapObj) => {
  const stationBoard = document.createElement('div');
  stationBoard.classList.add('board');

  const stationBoardTitleContainer = document.createElement('div');
  stationBoardTitleContainer.classList.add('board-title-container');
  const stationBoardTitle = document.createElement('p');
  stationBoardTitle.classList.add('board-title');
  stationBoardTitle.textContent = 'Stations';
  stationBoardTitleContainer.appendChild(stationBoardTitle);
  stationBoard.appendChild(stationBoardTitleContainer);

  const stationBoardContentContainer = document.createElement('div');
  stationBoardContentContainer.classList.add('board-content-container');
  stationBoardContentContainer.classList.add('board-station-content-container');

  var stationCoors = [];

  for (var i = 1; i <= stations.length; i++) {
    const station = stations[i - 1].station;

    const stationContainer = document.createElement('div');
    stationContainer.classList.add('station-container');

    const stationOrderContainer = document.createElement('div');
    stationOrderContainer.classList.add('station-order-container');
    const stationOrder = document.createElement('p');
    stationOrder.classList.add('station-order');
    stationOrder.textContent = i;
    stationOrderContainer.appendChild(stationOrder);
    stationContainer.appendChild(stationOrderContainer);

    const stationInforContainer = document.createElement('div');
    stationInforContainer.classList.add('station-infor-container');

    const stationName = document.createElement('p');
    stationName.classList.add('station-name');
    stationName.textContent = station.name;
    stationInforContainer.appendChild(stationName);

    const stationAddress = document.createElement('p');
    stationAddress.classList.add('station-address');
    stationAddress.textContent = station.addressNumber + " " + station.street + ", " + station.ward + ", " + station.district + ", " + station.city;

    stationInforContainer.appendChild(stationAddress);
    stationContainer.appendChild(stationInforContainer);
    stationBoardContentContainer.appendChild(stationContainer);

    stationCoors.push(L.latLng(station.latitude, station.longitude));
  }

  var newKey = stations[0].routeId;
  waypointList.push({ routeId: stations[0].routeId, newKey: stationCoors })

  stationBoard.appendChild(stationBoardContentContainer);
  carouselItem.querySelector('.board-container').appendChild(stationBoard);
}

const createMap = (routeId) => {
  const routeDiv = 'route-map-' + routeId;



  return mapObj;
}