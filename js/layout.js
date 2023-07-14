import { getRouteData, routeDataChanged, getBusData, busDataChanged } from './route.js'
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js';

const firebaseConfig = {
    // databaseURL: "https://fbus-388009-default-rtdb.asia-southeast1.firebasedatabase.app/"
    // databaseURL: 'https://fbus-public-map-default-rtdb.asia-southeast1.firebasedatabase.app'
    databaseURL: "https://f-bus-map-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

var routeData = await getRouteData();
var routeIds = [];
var waypoints = [];
var routingControl = null;
var currentRouteId = null;
var busCount = 0;
var oldBusIds = [];
var currentOrder = 0;
var oldE = null;
var busMarkers = [];
var start = true;
var busIcon = L.icon({
    iconUrl: '../img/bus.png',
    iconSize: [60, 60]
})

const getRouteDetails = async (routeId) => {
    const response = await fetch('https://fbus-final.azurewebsites.net/api/routes/' + routeId)
    const data = await response.json();
    return data;
}

const getBusDetails = async (busId) => {
  const response = await fetch('https://fbus-final.azurewebsites.net/api/buses/' + busId, {
    method: 'GET',
    headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJJZCI6IjIiLCJSb2xlIjoiQWRtaW4iLCJleHAiOjE2OTEzMDM0ODEsImlzcyI6IkZCdXNfU1dQIiwiYXVkIjoiRkJ1c19TV1AifQ.vXkop_kEtzEEx3BD-3gT5E4EEVivpMSHNLJ3VChOYGs'
    }
  })
  const data = await response.json();
  return data;
}

const createBoardForRoute = (routeDetails, active) => {
    const carouselItem = document.createElement('div');
    carouselItem.classList.add('carousel-item');
    if (active) {
        carouselItem.classList.add('active');
    }
    carouselItem.setAttribute('data-bs-interval', '5000');

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

    // const mapDiv = document.createElement('div');
    // mapDiv.id = 'route-map-' + routeDetails.id;
    // mapDiv.className = 'map-div';
    // carouselItem.appendChild(mapDiv);

    return carouselItem;
}

const createBoardForStation = (carouselItem, stations) => {
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

    waypoints.push({ routeId: stations[0].routeId, coor: stationCoors })

    stationBoard.appendChild(stationBoardContentContainer);
    carouselItem.querySelector('.board-container').appendChild(stationBoard);
}

const changeRoute = (e, mapObj) => {
    if (oldE == null) {
        for (var i = currentOrder; i < routeIds.length; i++) {
            currentOrder += 1;
            if (currentOrder >= routeIds.length) {
                currentOrder = 0;
            }
            var routeId = waypoints[i].routeId;
            if (routeId != currentRouteId) {
                currentRouteId = routeId;
                routingControl.setWaypoints(waypoints[i].coor);
                routingControl.route();
                for (const busMarker of busMarkers) {
                    for (const bus of busMarker.buses) {
                        mapObj.removeLayer(bus.marker);
                    }
                }
                busMarkers = [];
                busCount = 0;
                oldBusIds = [];
                start = true;
                console.log('current ' + currentRouteId);
                setBusMarkers(currentRouteId, mapObj)
                break;
            }
        }
        oldE = e;
    } else {
        var diff = e.timeStamp - oldE.timeStamp;
        console.log('diff ' + diff);
        if (diff >= 4500) {
            for (var i = currentOrder; i < routeIds.length; i++) {
                currentOrder += 1;
                if (currentOrder >= routeIds.length) {
                    currentOrder = 0;
                }
                var routeId = waypoints[i].routeId;
                if (routeId != currentRouteId) {
                    currentRouteId = routeId;
                    routingControl.setWaypoints(waypoints[i].coor);
                    routingControl.route();
                    for (const busMarker of busMarkers) {
                        for (const bus of busMarker.buses) {
                            mapObj.removeLayer(bus.marker);
                        }
                    }
                    busMarkers = [];
                    busCount = 0;
                    oldBusIds = [];
                    start = true;
                    console.log('current ' + currentRouteId);
                    setBusMarkers(currentRouteId, mapObj)
                    break;
                }
            }
        }
        oldE = e;
    }
}

const setBusMarkers = async (routeId, mapObj) => {

    var newRouteData;
    var newRouteIds;
    var busData;
    var busIds;

    if (start) {
        start = false;
        busData = await getBusData(routeId);
        busIds = Object.keys(busData);
        var buses = [];
        for (const busId of busIds) {
            console.log('busId ' + busId)
            var busDetails = await getBusDetails(busId);
            var licensePlate = busDetails.licensePlate;
            licensePlate = licensePlate.substring(0,3) + '-' + licensePlate.substring(3)
            var newMarker = L.marker([busData[busId].latitude, busData[busId].longitude], {
                icon: new L.DivIcon({
                    className: 'my-div-icon',
                    html: '<img class="my-div-image" src="../img/bus.png"/>' + '<span class="my-div-span">' + licensePlate + '</span>'
                })
            });
            buses.push({
                busId: busId,
                marker: newMarker.addTo(mapObj)
            })
        }
        busMarkers.push({
            routeId: routeId,
            buses: buses
        })

        const busRef = ref(database, 'locations/')
        onValue(busRef, (snapshot) => {
            newRouteData = snapshot.val();
            newRouteIds = Object.keys(newRouteData);

            for (const routeId of newRouteIds) {
                if (routeId == currentRouteId) {
                    busIds = Object.keys(newRouteData[routeId])
                    for (const busId of busIds) {
                        for (const busMarker of busMarkers) {
                            if (busMarker.routeId == currentRouteId) {
                                var oldBuses = busMarker.buses;
                                var newBuses = newRouteData[routeId];
                                for (const bus of oldBuses) {
                                    if (bus.busId == busId) {
                                        mapObj.removeLayer(bus.marker);
                                        bus.marker.setLatLng([newBuses[busId].latitude, newBuses[busId].longitude])
                                        bus.marker.addTo(mapObj);
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                        break;
                    }
                    break;
                }
            }
        })
    }
}

const setCarouselOnChange = (mapObj) => {
    var mapCarousel = document.getElementById('my-map');
    mapCarousel.addEventListener('slide.bs.carousel', function (e) {
        changeRoute(e, mapObj);
    });
}

export async function createRouteBoards(mapObj) {
    if (routeDataChanged) {
        routeData = await getRouteData();
        console.log(routeData);
        mapObj.removeControl(routingControl);
        routingControl = null;
        routeIds = [];
        waypoints = [];
        routingControl = null;
        currentRouteId = null;
        currentOrder = 0;
    }
    routeIds = Object.keys(routeData);
    var isFirst = true;
    for (const routeId of routeIds) {
        const routeDetails = await getRouteDetails(routeId);
        const carouselItem = createBoardForRoute(routeDetails, isFirst);
        document.getElementById('my-map-carousel').appendChild(carouselItem);
        createBoardForStation(carouselItem, routeDetails.stations);
        if (routingControl == null) {
            currentRouteId = routeId;
            routingControl = L.Routing.control({
                waypoints: waypoints[currentOrder].coor,
                fitSelectedRoutes: true,
                lineOptions: {
                    styles: [{ color: '#e8772e', opacity: 1, weight: 5 }]
                },
                createMarker: function (i, waypoint, numbers) {
                    return L.marker(waypoint.latLng, {
                        icon: new L.DivIcon({
                            className: 'my-div-icon',
                            html: '<img class="station-div-image" src="../img/bus-station.png"/>' + '<span class="station-div-span">' + (i + 1) + '</span>'
                        })
                    })
                }
            }).addTo(mapObj);
            setBusMarkers(routeId, mapObj);
        }
        isFirst = false;
    }
    setCarouselOnChange(mapObj);
}