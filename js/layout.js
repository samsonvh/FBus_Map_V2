import { getRouteData, routeDataChanged, getBusData, busDataChanged } from './route.js'
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js';

const firebaseConfig = {
    databaseURL: "https://fbus-388009-default-rtdb.asia-southeast1.firebasedatabase.app/"
    // databaseURL: 'https://fbus-public-map-default-rtdb.asia-southeast1.firebasedatabase.app'
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

var routeData = await getRouteData();
var routeIds = [];
var waypoints = [];
var routingControl = null;
var currentRouteId = null;
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

const createBoardForRoute = (routeDetails, active) => {
    const carouselItem = document.createElement('div');
    carouselItem.classList.add('carousel-item');
    if (active) {
        carouselItem.classList.add('active');
    }
    carouselItem.setAttribute('data-bs-interval', '20000');

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
                setBusMarkers(routeId, mapObj)
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
                    setBusMarkers(routeId, mapObj)
                    break;
                }
            }
        }
        oldE = e;
    }
}

const setBusMarkers = async (routeId, mapObj) => {
    var busData = await getBusData(routeId);
    var busIds = Object.keys(busData);

    const busRef = ref(database, 'locations/' + routeId + "/");
    onValue(busRef, async (snapshot) => {
        if (start == false) {
            busData = snapshot.val();
            busIds = Object.keys(busData);

            console.log(busMarkers)

            for (const busMarker of busMarkers) {
                if (busMarker.routeId != routeId) {
                    for (const bus of busMarker.buses) {
                        mapObj.removeLayer(bus.marker);
                    }
                }
            }

            for (const busId of busIds) {
                if (busMarkers.some(busMarker => busMarker.routeId == routeId)) {
                    var marker;
                    var buses = [];
                    for (const busMarker of busMarkers) {
                        if (busMarker.routeId == routeId) {
                            marker = busMarker;
                            buses = busMarker.buses;
                            break;
                        }
                    }
                    if (buses.some(bus => bus.busId == busId)) {
                        for (const bus of marker.buses) {
                            if (bus.busId == busId) {
                                bus.marker.setLatLng([busData[busId].latitude, busData[busId].longitude]);
                                bus.marker.addTo(mapObj);
                                break;
                            }
                        }
                    } else {
                        var newMarker = L.marker([busData[busId].latitude, busData[busId].longitude], { 
                            icon: new L.DivIcon({
                                className: 'my-div-icon',
                                html: '<img class="my-div-image" src="../img/bus.png"/>' + '<span class="my-div-span">BusId ' + busId + '</span>'
                            })
                        });
                        marker.buses.push({
                            busId: busId,
                            marker: newMarker
                        })
                        newMarker.bindTooltip("BusId " + busId).openTooltip();
                        newMarker.addTo(mapObj);
                    }
                } else {
                    var newMarker = L.marker([busData[busId].latitude, busData[busId].longitude], { 
                        icon: new L.DivIcon({
                            className: 'my-div-icon',
                            html: '<img class="my-div-image" src="../img/bus.png"/>' + '<span class="my-div-span">BusId ' + busId + '</span>'
                        })
                    });
                    busMarkers.push({
                        routeId: routeId,
                        buses: [{
                            busId: busId,
                            marker: newMarker
                        }]
                    })
                    newMarker.bindTooltip("BusId " + busId).openTooltip();
                    newMarker.addTo(mapObj);
                }
            }
        }
    })
    if (start) {
        for (const busMarker of busMarkers) {
            if (busMarker.routeId != routeId) {
                for (const bus of busMarker.buses) {
                    mapObj.removeLayer(bus.marker);
                }
            }
        }
        for (const busId of busIds) {
            if (busMarkers.some(busMarker => busMarker.routeId == routeId)) {
                var marker;
                var buses = [];
                for (const busMarker of busMarkers) {
                    if (busMarker.routeId == routeId) {
                        marker = busMarker;
                        buses = busMarker.buses;
                        break;
                    }
                }
                if (buses.some(bus => bus.busId == busId)) {
                    for (const bus of marker.buses) {
                        if (bus.busId == busId) {
                            bus.marker.setLatLng([busData[busId].latitude, busData[busId].longitude]);
                            bus.marker.addTo(mapObj);
                            break;
                        }
                    }
                } else {
                    var newMarker = L.marker([busData[busId].latitude, busData[busId].longitude], { 
                        icon: new L.DivIcon({
                            className: 'my-div-icon',
                            html: '<img class="my-div-image" src="../img/bus.png"/>' + '<span class="my-div-span">BusId ' + busId + '</span>'
                        })
                    });
                    marker.buses.push({
                        busId: busId,
                        marker: newMarker
                    })
                    newMarker.bindTooltip("BusId " + busId).openTooltip();
                    newMarker.addTo(mapObj);
                }
            } else {
                var newMarker = L.marker([busData[busId].latitude, busData[busId].longitude], { 
                    icon: new L.DivIcon({
                        className: 'my-div-icon',
                        html: '<img class="my-div-image" src="../img/bus.png"/>' + '<span class="my-div-span">BusId ' + busId + '</span>'
                    })
                });
                busMarkers.push({
                    routeId: routeId,
                    buses: [{
                        busId: busId,
                        marker: newMarker
                    }]
                })
                newMarker.bindTooltip("BusId " + busId).openTooltip();
                newMarker.addTo(mapObj);
            }
            console.log('bus ' + busId)
        }
        start = false;
        console.log(busMarkers)
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
                    styles: [{color: '#e8772e', opacity: 1, weight: 5}]                    
                },
                createMarker: function(i, waypoint, numbers){
                    console.log(waypoint.latLng)
                    return L.marker(waypoint.latLng, {
                        icon: new L.DivIcon({
                            className: 'my-div-icon',
                            html: '<img class="station-div-image" src="../img/bus-station.png"/>' + '<span class="station-div-span">' + (i+1) + '</span>'
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