import { getRouteData, routeDataChanged } from './route.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js';

const firebaseConfig = {
    // databaseURL: "https://fbus-388009-default-rtdb.asia-southeast1.firebasedatabase.app/"
    databaseURL: 'https://fbus-public-map-default-rtdb.asia-southeast1.firebasedatabase.app/'
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

//  Variables
var routeData = await getRouteData();
var routeIds = [];
var waypoints = [];
var routingControl = null;
var currentRouteId = null;
var currentOrder = 0;
var busMarkers = [];
var firstStations = [];
var oldEvent = null;

//  Functions
//  Access Back-end APIs
const getRouteDetails = async (routeId) => {
    const response = await fetch('https://fbus-last.azurewebsites.net/api/Routes/' + routeId);
    const data = await response.json();
    return data;
};

//  Create Board
const createRouteBoard = (routeDetails, active) => {
    //  Init route item
    const carouselItem = document.createElement('div');
    carouselItem.classList.add('carousel-item');
    carouselItem.setAttribute('data-bs-interval', '10000');
    if (active) {
        carouselItem.classList.add('active');
    }

    //  Create Board Container
    const boardContainter = document.createElement('div');
    boardContainter.classList.add('board-container');
    const routeBoard = document.createElement('div');
    routeBoard.classList.add('board');

    //  Add Route Title
    const routeBoardTitleContainer = document.createElement('div');
    routeBoardTitleContainer.classList.add('board-title-container');
    const routeBoardTitle = document.createElement('p');
    routeBoardTitle.classList.add('board-title');
    routeBoardTitle.textContent = 'Route Details:';
    routeBoardTitleContainer.appendChild(routeBoardTitle);
    routeBoard.appendChild(routeBoardTitleContainer);

    //  Create Board Content
    const routeBoardContentContainer = document.createElement('div');
    routeBoardContentContainer.classList.add('board-content-container');

    //  Add Label
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

    //  Add Value
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
    return carouselItem;
};

const createStationBoard = (carouselItem, stations) => {
    //  Create Board Container
    const stationBoard = document.createElement('div');
    stationBoard.classList.add('board');

    //  Add Station Title
    const stationBoardTitleContainer = document.createElement('div');
    stationBoardTitleContainer.classList.add('board-title-container');
    const stationBoardTitle = document.createElement('p');
    stationBoardTitle.classList.add('board-title');
    stationBoardTitle.textContent = 'Stations:';
    stationBoardTitleContainer.appendChild(stationBoardTitle);
    stationBoard.appendChild(stationBoardTitleContainer);

    //  Create Board Content
    const stationBoardContentContainer = document.createElement('div');
    stationBoardContentContainer.classList.add('board-content-container');
    stationBoardContentContainer.classList.add('board-station-content-container');

    var stationCoors = [];
    var stationNames = [];
    for (var i = 1; i <= stations.length; i++) {
        //  Get a Station
        const station = stations[i - 1].station;
        if (i - 1 == 0) {
            firstStations.push(station);
        }

        //  Create Station Container
        const stationContainer = document.createElement('div');
        stationContainer.classList.add('station-container');

        //  Add Order
        const stationOrderContainer = document.createElement('div');
        stationOrderContainer.classList.add('station-order-container');
        const stationOrder = document.createElement('p');
        stationOrder.classList.add('station-order');
        stationOrder.textContent = i;
        stationOrderContainer.appendChild(stationOrder);
        stationContainer.appendChild(stationOrderContainer);

        //  Create Station Infor
        const stationInforContainer = document.createElement('div');
        stationInforContainer.classList.add('station-infor-container');

        //  Add Value
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

        //  Add to Coor List
        stationCoors.push(L.latLng(station.latitude, station.longitude));
        stationNames.push(station.name);
    };
    waypoints.push({ routeId: stations[0].routeId, names: stationNames, coor: stationCoors });
    stationBoard.appendChild(stationBoardContentContainer);
    carouselItem.querySelector('.board-container').appendChild(stationBoard);
};

const trackBus = (routeId, firstStation, mapObj) => {
    const busRef = ref(database, 'locations/' + routeId + '/');
    onValue(busRef, (snapshot) => {
        var busData = snapshot.val();
        var busIds = Object.keys(busData);
        var showed = false;

        for (const busMarker of busMarkers) {
            if (busMarker.routeId != routeId) {
                for (const bus of busMarker.buses) {
                    mapObj.removeLayer(bus.marker);
                    mapObj.removeControl(bus.busLine);
                }
            }
        }

        var existed = false;
        var currentBusMarker = null;
        var currentBuses = null;
        for (const busId of busIds) {
            if (existed == false) {
                for (const busMarker of busMarkers) {
                    if (busMarker.routeId == routeId) {
                        currentBusMarker = busMarker;
                        currentBuses = busMarker.buses;
                        existed = true;
                        break;
                    }
                }
            }
            if (existed) {
                var thisBusExisted = false;
                var thisBus = null;
                for (const bus of currentBuses) {
                    if (bus.busId == busId) {
                        thisBusExisted = true;
                        thisBus = bus;
                        break;
                    }
                }
                if (thisBusExisted) {
                    const latitude = busData[busId].latitude;
                    const longitude = busData[busId].longitude;
                    thisBus.marker.setLatLng([latitude, longitude]);
                    thisBus.busLine.setWaypoints([
                        L.latLng(firstStation.latitude, firstStation.longitude),
                        L.latLng(latitude, longitude)
                    ]);
                } else {
                    const latitude = busData[busId].latitude;
                    const longitude = busData[busId].longitude;
                    var newBusMarker = L.marker([latitude, longitude], {
                        icon: new L.DivIcon({
                            className: 'my-div-icon',
                            html: '<div class="bus-icon-container"> <span class="bus-div-span">BusId</span> <img class="bus-div-image" src="../img/bus-station.png"/> </div>'
                        })
                    }).addTo(mapObj);
                    var newBusLine = L.Routing.control({
                        waypoints: [
                            L.latLng(firstStation.latitude, firstStation.longitude),
                            L.latLng(latitude, longitude)
                        ],
                        addWaypoints: false,
                        draggableWaypoints: false,
                        lineOptions: {
                            styles: [{ pane: 'pane1', color: '#82CD47', opacity: 1, weight: 5, }]
                        },
                        createMarker: function (i, waypoint, numbers) {
                            var marker = L.marker(waypoint.latLng, {
                                icon: new L.DivIcon({
                                    className: 'my-div-icon',
                                    html: ''
                                })
                            });
                            marker.setZIndexOffset(1000);
                            return marker;
                        }
                    });
                    currentBusMarker.buses.push({
                        busId: busId,
                        marker: newBusMarker,
                        busLine: newBusLine
                    });
                    newBusMarker.addTo(mapObj);
                    newBusLine.addTo(mapObj);
                }
            } else {
                const latitude = busData[busId].latitude;
                const longitude = busData[busId].longitude;
                var newBusMarker = L.marker([latitude, longitude], {
                    icon: new L.DivIcon({
                        className: 'my-div-icon',
                        html: '<div class="bus-icon-container"> <span class="bus-div-span">BusId</span> <img class="bus-div-image" src="../img/bus-station.png"/> </div>'
                    })
                });
                var newBusLine = L.Routing.control({
                    waypoints: [
                        L.latLng(firstStation.latitude, firstStation.longitude),
                        L.latLng(latitude, longitude)
                    ],
                    addWaypoints: false,
                    draggableWaypoints: false,
                    lineOptions: {
                        styles: [{ pane: 'pane1', color: '#82CD47', opacity: 1, weight: 5, }]
                    },
                    createMarker: function (i, waypoint, numbers) {
                        var marker = L.marker(waypoint.latLng, {
                            icon: new L.DivIcon({
                                className: 'my-div-icon',
                                html: ''
                            })
                        });
                        marker.setZIndexOffset(1000);
                        return marker;
                    }
                });
                busMarkers.push({
                    routeId: routeId,
                    buses: [
                        {
                            busId: busId,
                            marker: newBusMarker,
                            busLine: newBusLine
                        }
                    ]
                });
                newBusMarker.addTo(mapObj);
                newBusLine.addTo(mapObj);
            }
        }

        // if (routeId == currentRouteId) {
        //     for (const busId of busIds) {
        //         for (const busMarker of busMarkers) {
        //             if (busMarker.routeId != routeId) {
        //                 mapObj.
        //             }
        //         }
        //         const latitude = busData[busId].latitude;
        //         const longitude = busData[busId].longitude;
        //         var newBusMarker = L.marker([latitude, longitude], {
        //             icon: new L.DivIcon({
        //                 className: 'my-div-icon',
        //                 html: '<div class="bus-icon-container"> <span class="bus-div-span">BusId</span> <img class="bus-div-image" src="../img/bus-station.png"/> </div>'
        //             })
        //         }).addTo(mapObj);
        //         var newBusLine = L.Routing.control({
        //             waypoints: [
        //                 L.latLng(firstStation.latitude, firstStation.longitude),
        //                 L.latLng(latitude, longitude)
        //             ],
        //             fitSelectedRoutes: true,
        //             addWaypoints: false,
        //             draggableWaypoints: false,
        //             lineOptions: {
        //                 styles: [{ pane: 'pane1', color: '#82CD47', opacity: 1, weight: 5, }]
        //             },
        //             createMarker: function (i, waypoint, numbers) {
        //                 var marker = L.marker(waypoint.latLng, {
        //                     icon: new L.DivIcon({
        //                         className: 'my-div-icon',
        //                         html: ''
        //                     })
        //                 });
        //                 marker.setZIndexOffset(1000);
        //                 return marker;
        //             }
        //         }).addTo(mapObj);
        //         busMarkers.push({
        //             routeId: routeId,
        //             buses: [
        //                 {
        //                     busId: busId,
        //                     marker: newBusMarker,
        //                     busLine: newBusLine
        //                 }
        //             ]
        //         });
        //     }
        // }
    });
}

const changeRoute = (e, mapObj) => {
    currentOrder += 1;
    if (currentOrder >= routeIds.length) {
        currentOrder = 0;
    }
    currentRouteId = waypoints[currentOrder].routeId;
    routingControl.setWaypoints(waypoints[currentOrder].coor);
    trackBus(currentRouteId, firstStations[currentOrder], mapObj);
}

const setCarouselOnChange = (mapObj) => {
    var mapCarousel = document.getElementById('map-container');
    mapCarousel.addEventListener('slid.bs.carousel', function (e) {
        changeRoute(e, mapObj);
    });
}

export async function createRouteBoards(mapObj) {
    if (routeDataChanged) {
        console.log('get new');
        routeData = await getRouteData();
        mapObj.removeControl(routingControl);

        routeIds = [];
        waypoints = [];
        routingControl = null;
        currentRouteId = null;
        currentOrder = 0;
        busMarkers = [];
        firstStations = [];
    }
    routeIds = Object.keys(routeData);
    var isFirst = true;
    if (currentRouteId != null) {
        for (const routeId of routeIds) {
            if (routeId == currentRouteId) {
                isFirst = false;
                break;
            }
        }
        if (isFirst) {
            currentRouteId = null;
        }
    }
    for (const routeId of routeIds) {
        if (currentRouteId != null) {
            if (routeId == currentRouteId) {
                isFirst = true;
            }
        }
        const routeDetails = await getRouteDetails(routeId);
        const carouselItem = createRouteBoard(routeDetails, isFirst);
        document.getElementById('route-list').appendChild(carouselItem);
        createStationBoard(carouselItem, routeDetails.routeStations);
        if (routingControl == null) {
            currentRouteId = routeId;
            routingControl = L.Routing.control({
                waypoints: waypoints[currentOrder].coor,
                fitSelectedRoutes: true,
                addWaypoints: false,
                draggableWaypoints: false,
                lineOptions: {
                    styles: [{ color: '#e8772e', opacity: 1, weight: 5 }]
                },
                createMarker: function (i, waypoint, numbers) {
                    var marker = L.marker(waypoint.latLng, {
                        icon: new L.DivIcon({
                            className: 'my-div-icon',
                            html: '<div class="station-icon-container"><span class="station-div-span">' + waypoints[currentOrder].names[i] + '</span><img class="station-div-image" alt="Station" src="../img/station.png"/></div>'
                        })
                    });
                    marker.setZIndexOffset(30000);
                    return marker;
                }
            }).addTo(mapObj);
            trackBus(routeId, routeDetails.routeStations[0].station, mapObj);
        }
        isFirst = false;
    }
    setCarouselOnChange(mapObj);
}