let tarlat;
let tarlong;

async function fetchRandomLocation() {
  try {
    const response = await fetch('/api/randomLocation');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const locationData = await response.json();

    // Set global variables or call another function with the data
    tarlat = locationData.latitude;
    tarlong = locationData.longitude;

    console.log('Random Location Data:', locationData);
    console.log('Latitude:', tarlat);
    console.log('Longitude:', tarlong);

    // ... rest of your code

  } catch (error) {
    console.error('Error fetching random location:', error);
  }
}

// Call the function to fetch and use the random location data
fetchRandomLocation();

// Now you can use the latitude and longitude variables outside the async function
let userLocation;




if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                
            };

                // Log user location information
                console.log("User Location:", userLocation);

                // Send the user location to the server
                fetch("/api/storeUserLocation", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(userLocation),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        console.log("User Location stored:", data);

                        // Initialize the map with the user's location
                        initMap(userLocation.latitude, userLocation.longitude,true);
                    })
                    .catch((error) =>
                        console.error("Error storing user location:", error)
                    );
            },
            (error) => {
                initMap(tarlat, tarlong, false);
                console.error("Error getting user location:", error.message);
                
            }
        );
    } else {
        console.error("Geolocation is not supported by your browser.");
        initMap(tarlat, tarlong, false);
    }

    function initMap(latitude, longitude,showPinpoint) {
        var map = L.map("map").setView([latitude, longitude], 13); // Set view to Dadar, Mumbai

        // Add OpenStreetMap as the base layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        // Add satellite view button
        // L.control.layers({
        //         "Street Map": L.tileLayer(
        //             "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        //             {
        //                 attribution: "&copy; OpenStreetMap contributors",
        //             }
        //         ),
        //         "Satellite View": L.tileLayer(
        //             "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        //             {
        //                 attribution:
        //                     "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        //             }
        //         ),
        //     },
        //     {
        //         collapsed: false,
        //     }
    
        //     )
        //     .addTo(map);

        if (showPinpoint) {
        // Only add the marker if showPinpoint is true
        L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup("Your Current Location")
            .openPopup();
    }

        // Initial radius of radiation
        var initialRadius = 1000; // Set initial radius to 1000 meters
        // const targetLatitude = 19.1825;
        //     const targetLongitude =73.1926;
        // Add danger zone circle at virar, Mumbai
        var dangerZone = L.circle([tarlat, tarlong], {
            color: "red",
            fillColor: "#f03",
            fillOpacity: 0.2,
            radius: initialRadius,
        }).addTo(map);

      
    map.fitBounds(dangerZone.getBounds());

        // Updates container
        var updatesContainer = document.getElementById("updates-content");
        var areaCoveredElement = document.getElementById("area-covered");
        var alertSound;
        if(showPinpoint){

            // Add current location marker add this as a Geolocation Marker
            var currentLocationMarker = L.marker([latitude, longitude], {
    draggable: true,
    title: "My Current Location",
 }).addTo(map);
       

        currentLocationMarker.bindPopup("You are here!").openPopup();

        // Show latitude and longitude when marker is dragged
        currentLocationMarker.on("dragend", function (event) {
            var marker = event.target;
            var position = marker.getLatLng();
            console.log("this is,", position);
            marker
                .bindPopup(
                    "Current Location: " +
                    position.lat.toFixed(6) +
                    ", " +
                    position.lng.toFixed(6)
                )
                .openPopup();
                updateAlarmSound(position);
        });
        }

        var userLocation1 = {
            lat: latitude,
            lng: longitude
        }

        
        
        
        updateAlarmSound(userLocation1);

        // Function to play the alert sound
        function playAlertSound() {
            alertSound = new Audio("user/images/FUN.mp3");
            alertSound.loop = true;
            alertSound.play();
        }

        // Function to stop the alert sound
        function stopAlertSound() {
            if (alertSound) {
                alertSound.pause();
                alertSound.currentTime = 0;
            }
        }

        // Function to update real-time updates container
        function updateUpdatesContainer(content) {
            updatesContainer.innerHTML = content;
        }

        // Function to update the alarm sound based on marker position
        function updateAlarmSound(position) {
            console.log("position: ,",position)
            if (dangerZone.getBounds().contains(position)) {
                // Inside danger zone
                if (!alertSound || alertSound.paused) {
                    playAlertSound();
                    currentLocationMarker
                        .bindPopup(
                            '<strong class="flash-popup" style="color: red;">You are in the danger zone!</strong>'
                        )
                        .openPopup();
                    getRoute(position);
                }
            } else {
                // Outside danger zone
                stopAlertSound();
                currentLocationMarker
                    .bindPopup(
                        "Current Location: " +
                        position.lat.toFixed(6) +
                        ", " +
                        position.lng.toFixed(6)
                    )
                    .openPopup();
            }
        }

        // Function to calculate and display the route using Leaflet Routing Machine
        function getRoute(destination) {
            var currentLocation = currentLocationMarker.getLatLng();
            if (dangerZone.getBounds().contains(currentLocation)) {
                L.Routing.control({
                    waypoints: [
                        L.latLng(currentLocation.lat, currentLocation.lng),
                        L.latLng(destination.lat, destination.lng),
                    ],
                    routeWhileDragging: true,
                }).addTo(map);
            }
        }

        // Update the radius of radiation every 9 seconds
        setInterval(function () {
            // Increase the radius slowly
            initialRadius += 10; // Adjust the increment as needed
            dangerZone.setRadius(initialRadius);

            // Calculate and display the area covered by the radius
            var areaCovered = Math.PI * Math.pow(initialRadius, 2);
            areaCoveredElement.textContent =
                areaCovered.toFixed(2) + " square meters";

            // Display updates in the container
            updateUpdatesContainer(`
      <strong>Circle Latitude:</strong> ${dangerZone
                .getLatLng()
                .lat.toFixed(6)}<br>
      <strong>Circle Longitude:</strong> ${dangerZone
                .getLatLng()
                .lng.toFixed(6)}<br>
      <strong>Radius of Circle:</strong> ${initialRadius} meters<br>
      <strong>Area Covered by Radius:</strong> ${areaCovered.toFixed(
                2
            )} square meters<br>
      <strong>Time:</strong> ${new Date().toLocaleTimeString()}<br>
      <strong>Day:</strong> ${new Date().toLocaleDateString()}
    `);
        }, 9000);
       
        // comment out this code when in production
        function checkDangerZone(latitude, longitude) {
            // Replace these values with the actual target latitude, longitude, and radius
            const targetLatitude = tarlat;
            const targetLongitude = tarlong;
            const alertRadius = initialRadius; // Set the radius of the danger zone

            const distance = Math.sqrt(
                Math.pow(latitude - targetLatitude, 2) +
                Math.pow(longitude - targetLongitude, 2)
            );
            return distance < alertRadius;
        }

        // Function to send an alert
        function sendAlert(latitude, longitude) {
            // Replace this URL with the actual endpoint for sending alerts
            const alertEndpoint = "/send-alerts";

            // Check if the user is in the danger zone
            if (checkDangerZone(latitude, longitude)) {
                // Send an alert to the server
                fetch(alertEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        latitude:latitude,
                        longitude:longitude,
                        targetLatitude:  tarlat,
                        targetLongitude: tarlong,
                        alertRadius: initialRadius, // Set the radius of the danger zone
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => console.log(data))
                    .catch((error) =>
                        console.error("Error sending alert:", error)
                    );
            } else {
                console.log("User is not in the danger zone.");
            }
        }

        // Call the function to send an alert (you can trigger this based on user actions or events)
        sendAlert(userLocation1.lat, userLocation1.lng);
    }
