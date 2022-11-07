let map = null;
let hub = null;
let destinations = [];
let numOfDrones = 5;
let numOfClicks = 0;
const HUB_COLOUR = "#FBBC04";
const DESTINATION_COLOR = "#eb34c3";
let markers = [];
let dronePaths = [];
let dronePathsMap = [];
let baseApiUrl = "http://localhost:3000";
let dronesCurrLocation = [];
let dronesSavedLocation = [];
let dronesMarker = [];
let animateInterval = null;
const colourPallete = ["#091FBD", "#FFFF00", "#75151E", "#102C54", "#474B4E", "#287233", "#7FB5B5", "#2E3A23", "#FE0000", "#9DA1AA", "#3F514B"];

function addMarker(args) {
    console.log(args);
    numOfClicks++;
    const point = { lat: args.latLng.lat(), lng: args.latLng.lng()};
    let markerColour = DESTINATION_COLOR;
    if (numOfClicks == 1) {
        hub = point;
        markerColour = HUB_COLOUR;
    } else {
        destinations.push(point);
    }
    markers.push(new google.maps.marker.AdvancedMarkerView({
        map,
        position: point,
        content: new google.maps.marker.PinView({
            background: markerColour,
          }).element,
    }));
    console.log(hub, destinations);
    console.log(markers);
}

function initMap(){
    console.log("init map");
    const myLatlng = { lat: 17.3883904, lng: 78.5008787 };
    let mapOptions = {
        zoom: 10,
        center: myLatlng,
        mapId: "nakulh"
    };
    map = new google.maps.Map(document.getElementById("map"), mapOptions);
    map.addListener("click", addMarker);
}

window.initMap = initMap;

$('#inputForm').on('submit', function (e) {
    const droneCount = $("#droneNum").val();
    console.log(droneCount);
    console.log(destinations);
    console.log(hub);
    if(droneCount > destinations.length) {
        $('#invalidFeedback').css('visibility','visible');
    }
    else {
        $('#invalidFeedback').css('visibility','hidden');
    }
    const reqPayload = {
        destinations,
        hub,
        droneCount
    }
    $.post(
        baseApiUrl + "/addFlightInstance",
        reqPayload
      )
      .done((data) => {
        console.log(data);
        //markers.forEach((marker) => marker.setMap(null));
        generatePaths(data);
        
    });
    return false;
});

function generatePaths(data){
    initMap();
    markers = [];
    colourIndex = 0;
    dronePaths = [];
    dronePathsMap = [];
    data.paths.forEach((path) => {
        p = path.path.coordinates.length;
        dronePath = [];
        //closestPoint = { lat: path.path.coordinates[i][1], lng: path.path.coordinates[i][0]};
        for(let i = 0; i < p; i++){
            markers.push(new google.maps.marker.AdvancedMarkerView({
                map,
                position: { lat: path.path.coordinates[i][1], lng: path.path.coordinates[i][0]},
                content: new google.maps.marker.PinView({
                    background: colourPallete[colourIndex],
                    }).element,
                zIndex: 2
            }));
            dronePath.push({lat: path.path.coordinates[i][1], lng: path.path.coordinates[i][0]});
        }
        dronePaths.push({
            dronePath,
            id: path.id
        });
        const flightPath = new google.maps.Polyline({
            path: dronePath,
            geodesic: true,
            strokeColor: colourPallete[colourIndex],
            strokeOpacity: 1.0,
            strokeWeight: 2,
        });
        flightPath.setMap(map);
        dronePathsMap.push(flightPath);
        colourIndex++;
    });
    if(dronesMarker.length < 1) {
        dronePaths.forEach((path) => {
            dronesCurrLocation.push(0);
            dronesSavedLocation.push(path.dronePath[0]);
            dronesMarker.push(new google.maps.Marker({
                position: path.dronePath[0],
                map,
                zIndex: 999,
                icon: "drone.png"
            }));
        })
    }
    else {
        dronesMarker = [];
        let droneCount = dronePaths.length;
        for(let i = 0; i < droneCount; i++) {
            currDronePathLength = dronePaths[i].dronePath.length;
            dronesMarker.push(new google.maps.Marker({
                position: dronesSavedLocation[i],
                map,
                zIndex: 999,
                icon: "drone.png"
            }));
            for(let j = 0; j < currDronePathLength; j++){
                if(dronePaths[i].dronePath[j].lng == dronesSavedLocation[i].lng &&
                    dronePaths[i].dronePath[j].lat == dronesSavedLocation[i].lat) {
                        dronesCurrLocation[i] = j;
                        console.log("old point found");
                        break;
                    }
            }
        }
    }
    markers.push(new google.maps.marker.AdvancedMarkerView({
        map,
        position: hub,
        content: new google.maps.marker.PinView({
            background: HUB_COLOUR,
            }).element,
    }));
    animateDrones();
}

function animateDrones() {
    animateInterval = setInterval(moveDronesAhead, 2000);
}

function moveDronesAhead() {
    droneCount = dronesMarker.length;
    for(let i = 0; i < droneCount; i++){
        currMarker = dronesMarker[i];
        dronesCurrLocation[i] += 1;
        newLocation = dronePaths[i].dronePath[dronesCurrLocation[i] % (dronePaths[i].dronePath.length - 1)];
        dronesSavedLocation[i] = newLocation;
        dronesMarker[i].setPosition(newLocation);
    }
    console.log(dronesMarker);
}

function killOne() {
    if(dronePaths.length < 1){
        return false;
    }
    let killedDrone = Math.floor(Math.random() * dronePaths.length);
    let killedDroneId = dronePaths[killedDrone].id;
    console.log("start killing ", killedDrone, killedDroneId);
    let killedDronePoints = dronePaths[killedDrone].dronePath;
    $.post(
        baseApiUrl + "/killDrone",
        {
            killedDroneId,
            killedDronePoints
        }
      )
      .done((data) => {
        console.log(data);
        //markers.forEach((marker) => marker.setMap(null));
        dronesCurrLocation.splice(killedDrone, 1);
        dronesSavedLocation.splice(killedDrone, 1);
        dronesMarker.splice(killedDrone, 1);
        generatePaths(data);
    });
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
}
  
function deg2rad(deg) {
    return deg * (Math.PI/180);
}
