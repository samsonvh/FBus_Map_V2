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

const getBusDetails = async (busId) => {
    const response = await fetch('https://fbus-last.azurewebsites.net/api/Buses/' + busId);
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
        const stationItemImage = document.createElement('img');
        stationItemImage.classList.add('station-item-img');
        switch (i) {
            case 1:
                stationItemImage.src = '../img/start-marker.png';
                break;
            case stations.length:
                stationItemImage.src = '../img/end-marker.png';
                break;
            default:
                stationItemImage.src = '../img/station-marker.png';
        }
        stationOrderContainer.appendChild(stationOrder);
        stationOrderContainer.appendChild(stationItemImage);
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

const createBusIcons = async (busId, firstStation, latitude, longitude) => {
    var busDetails = await getBusDetails(busId);

    // Create Bus Marker
    var newBusMarker = L.marker([latitude, longitude], {
        pane: 'pane3',
        icon: new L.DivIcon({
            className: 'my-div-icon',
            html: '<div class="bus-icon-container"> <span class="bus-div-span">' + busDetails.licensePlate + '</span> <img class="bus-div-image" src="../img/bus-station.png"/> </div>'
        })
    });

    // Create Bus Completed Line
    var newBusLine = L.Routing.control({
        waypoints: [
            L.latLng(firstStation.latitude, firstStation.longitude),
            L.latLng(latitude, longitude)
        ],
        fitSelectedRoutes: false,
        addWaypoints: false,
        draggableWaypoints: false,
        lineOptions: {
            styles: [{ pane: 'pane2', color: '#82CD47', opacity: 1, weight: 5, }]
        },
        icon: new L.DivIcon({
            className: 'my-div-icon',
            html: ''
        })
    });

    var bus = {
        marker: newBusMarker,
        busLine: newBusLine
    }
    return bus;
}

const trackBus = async (routeId, firstStation, mapObj) => {
    const busRef = ref(database, 'locations/' + routeId + '/');

    for (const busMarker of busMarkers) {
        console.log('routeId: ' + busMarker.routeId);
        console.log(busMarker.routeId == currentRouteId)
        // if (busMarker.routeId != currentRouteId) {
            busMarker.added = false;
            for (const bus of busMarker.buses) {
                mapObj.removeLayer(bus.marker);
                mapObj.removeControl(bus.busLine);
            }
            console.log('remove ' + busMarker.routeId)
        // }
    }

    var busMarker = null;
    for (const currentBusMarker of busMarkers) {
        if (currentBusMarker.routeId == currentRouteId) {
            busMarker = currentBusMarker;
            break;
        }
    };
    console.log(busMarker);

    onValue(busRef, async (snapshot) => {
        var busData = snapshot.val();
        var busIds = Object.keys(busData);

        if (routeId == currentRouteId) {
            for (const busId of busIds) {
                const latitude = busData[busId].latitude;
                const longitude = busData[busId].longitude;

                console.log(latitude, longitude);

                if (busMarker != null) {
                    var bus = null;
                    for (const currentBus of busMarker.buses) {
                        if (currentBus.id == busId) {
                            bus = currentBus;
                            break;
                        }
                    }
                    if (bus != null) {
                        if (busMarker.added) {
                            console.log('added');
                            bus.marker.setLatLng([latitude, longitude]);
                            bus.busLine.remove();
                            var newBusLine = L.Routing.control({
                                waypoints: [
                                    L.latLng(firstStation.latitude, firstStation.longitude),
                                    L.latLng(latitude, longitude)
                                ],
                                fitSelectedRoutes: false,
                                addWaypoints: false,
                                draggableWaypoints: false,
                                lineOptions: {
                                    styles: [{ pane: 'pane2', color: '#82CD47', opacity: 1, weight: 5, }]
                                },
                                icon: new L.DivIcon({
                                    className: 'my-div-icon',
                                    html: ''
                                })
                            });
                            bus.busLine = newBusLine;
                            await bus.busLine.addTo(mapObj);
                        } else {
                            console.log('added');
                            busMarker.added = true;
                            bus.busLine.addTo(mapObj);
                            bus.marker.addTo(mapObj);
                        }
                    } else {
                        console.log('created');
                        bus = await createBusIcons(busId, firstStation, latitude, longitude);
                        bus.busLine.addTo(mapObj);
                        bus.marker.addTo(mapObj);
                        busMarker.buses.push({
                            id: busId,
                            marker: bus.marker,
                            busLine: bus.busLine
                        });
                    }
                } else {
                    console.log('created');
                    var bus = await createBusIcons(busId, firstStation, latitude, longitude);
                    bus.busLine.addTo(mapObj);
                    bus.marker.addTo(mapObj);
                    busMarker = {
                        routeId: routeId,
                        buses: [
                            {
                                id: busId,
                                marker: bus.marker,
                                busLine: bus.busLine
                            }
                        ],
                        added: true
                    };
                    busMarkers.push(busMarker);
                }
            }
        }
    });
}

const changeRoute = async (e, mapObj) => {
    if (oldEvent != null) {
        console.log(e.timeStamp - oldEvent.timeStamp);
    }
    oldEvent = e;
    currentOrder += 1;
    if (currentOrder >= routeIds.length) {
        currentOrder = 0;
    }
    currentRouteId = waypoints[currentOrder].routeId;
    routingControl.remove();
    routingControl = L.Routing.control({
        waypoints: waypoints[currentOrder].coor,
        fitSelectedRoutes: true,
        addWaypoints: false,
        draggableWaypoints: false,
        lineOptions: {
            styles: [{ pane: 'pane1', color: '#e8772e', opacity: 1, weight: 5 }]
        },
        createMarker: function (i, waypoint, numbers) {
            var marker;
            switch (i) {
                case 0:
                    marker = L.marker(waypoint.latLng, {
                        pane: 'pane3',
                        icon: new L.DivIcon({
                            className: 'my-div-icon',
                            html: '<div class="station-icon-container"><span class="station-div-span">' + waypoints[currentOrder].names[i] + '</span>' + '<img class="station-div-image" alt="station" src="../img/start-marker.png"/>' + '</div>'
                        })
                    });
                    break;
                case waypoints[currentOrder].coor.length - 1:
                    marker = L.marker(waypoint.latLng, {
                        pane: 'pane3',
                        icon: new L.DivIcon({
                            className: 'my-div-icon',
                            html: '<div class="station-icon-container"><span class="station-div-span">' + waypoints[currentOrder].names[i] + '</span>' + '<img class="station-div-image" alt="station" src="../img/end-marker.png"/>' + '</div>'
                        })
                    });
                    break;
                default:
                    marker = L.marker(waypoint.latLng, {
                        pane: 'pane3',
                        icon: new L.DivIcon({
                            className: 'my-div-icon',
                            html: '<div class="station-icon-container"><span class="station-div-span">' + waypoints[currentOrder].names[i] + '</span>' + '<img class="station-div-image" alt="station" src="../img/station-marker.png"/>' + '</div>'
                        })
                    });
            }
            return marker;
        }
    }).addTo(mapObj);
    await trackBus(currentRouteId, firstStations[currentOrder], mapObj);
}

const setCarouselOnChange = (mapObj) => {
    var mapCarousel = document.getElementById('map-container');
    mapCarousel.addEventListener('slid.bs.carousel', async function (e) {
        await changeRoute(e, mapObj);
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
                    styles: [{ pane: 'pane1', color: '#e8772e', opacity: 1, weight: 5 }]
                },
                createMarker: function (i, waypoint, numbers) {
                    var marker;
                    switch (i) {
                        case 0:
                            marker = L.marker(waypoint.latLng, {
                                pane: 'pane3',
                                icon: new L.DivIcon({
                                    className: 'my-div-icon',
                                    html: '<div class="station-icon-container"><span class="station-div-span">' + waypoints[currentOrder].names[i] + '</span>' + '<img class="station-div-image" alt="station" src="../img/start-marker.png"/>' + '</div>'
                                })
                            });
                            break;
                        case waypoints[currentOrder].coor.length - 1:
                            marker = L.marker(waypoint.latLng, {
                                pane: 'pane3',
                                icon: new L.DivIcon({
                                    className: 'my-div-icon',
                                    html: '<div class="station-icon-container"><span class="station-div-span">' + waypoints[currentOrder].names[i] + '</span>' + '<img class="station-div-image" alt="station" src="../img/end-marker.png"/>' + '</div>'
                                })
                            });
                            break;
                        default:
                            marker = L.marker(waypoint.latLng, {
                                pane: 'pane3',
                                icon: new L.DivIcon({
                                    className: 'my-div-icon',
                                    html: '<div class="station-icon-container"><span class="station-div-span">' + waypoints[currentOrder].names[i] + '</span>' + '<img class="station-div-image" alt="station" src="../img/station-marker.png"/>' + '</div>'
                                })
                            });
                    }
                    return marker;
                }
            }).addTo(mapObj);
            await trackBus(routeId, routeDetails.routeStations[0].station, mapObj);
        }
        isFirst = false;
    }
    setCarouselOnChange(mapObj);
}