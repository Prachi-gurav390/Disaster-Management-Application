fetch('http://localhost:3090/getAgencies')
    .then(response => response.json())
    .then(data => {
        // Center the map on the logged-in agency
        var map = L.map('map').setView([data.loggedInAgencyCoordinates.Latitude, data.loggedInAgencyCoordinates.Longitude], 7);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Create a LayerGroup for each specialization and store them in an object
        var layers = {};
        data.specializations.forEach(specialization => {
            layers[specialization] = L.layerGroup();
        });

        // Create a marker for each agency and add it to the corresponding LayerGroup
        data.agencies.forEach(agency => {
            var marker = L.marker([agency.coordinates.Latitude, agency.coordinates.Longitude])
                .bindTooltip(`UID: ${agency.UID}, ${agency.Specialisations}`);
            marker.addTo(layers[agency.Specialisations]);
            marker.addTo(map);  // Add all markers to the map initially
        });

        // Create a filter for each specialization
        var filters = document.getElementById('filters');
        data.specializations.forEach(specialization => {
            var filter = document.createElement('div');
            filter.textContent = specialization;
            filter.classList.add('filter');
            filter.dataset.specialization = specialization;
            filter.addEventListener('click', function() {
                // Toggle the filter
                this.classList.toggle('active');

                // Update the map
                if (this.classList.contains('active')) {
                    // If the filter is active, remove all markers from the map
                    data.agencies.forEach(agency => {
                        layers[agency.Specialisations].remove();
                    });

                    // Then add only the markers for the active specialization
                    layers[this.dataset.specialization].addTo(map);
                } else {
                    // If the filter is inactive, add all markers to the map
                    data.agencies.forEach(agency => {
                        layers[agency.Specialisations].addTo(map);
                    });
                }
            });
            filters.appendChild(filter);
        });
    })
    .catch(error => console.error('Error:', error));

fetch('http://localhost:3090/getLoggedInAgency')
    .then(response => response.json())
    .then(data => {
        var agencyInfo = document.getElementById('agencyInfo');
        agencyInfo.innerHTML = `
            <h2>${data.Name}</h2>
            <p>UID: ${data.UID}</p>
            <p>Zone: ${data.Zone}</p>
            <p>Address: ${data.Address}</p>
            <p>Specialisations: ${data.Specialisations}</p>
        `;
    })
    .catch(error => console.error('Error:', error));

document.getElementById('zoneName').addEventListener('change', function() {
        const zoneMap = {
            'Gujarat': 14567,
            'Haryana & Delhi': 13522,
            'Uttar Pradesh': 23654,
            'Maharashtra': 78904,
            'Madhya Pradhesh': 90342,
            'Punjab & Himachal': 98123,
            'Tamil Nadu': 347213
        };
        document.getElementById('zoneId').value = zoneMap[this.value] || '';
    });
    