const express= require('express');
const mongoose= require('mongoose');
const cors= require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const fetch = require('node-fetch');

const saltRounds = 10;
const app= express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your secret key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        expires: false }
  }));

mongoose.connect("mongodb://0.0.0.0:27017/disatser")

const agencySchema = new mongoose.Schema({
    UID: Number,
    Latitude: Number,
    Longitude: Number,
    Specialisations: String,
    ZoneID: Number
  });
  
const agencyModel = mongoose.model("agencies", agencySchema);
  
const signupSchema = new mongoose.Schema({
    UID: Number,
    Name: String,
    Zone: String,
    Address: String,
    Specialisations: String
  });
  
const signupModel = mongoose.model("signups", signupSchema);

app.get('/getSup', (req, res) => {
    signupModel.find()
    .then((agency => res.json(agency)))
    .catch(err => res.json(err))
})

const loginSchema = new mongoose.Schema({
    UID: Number,
    Password: String
  });
  
const loginModel = mongoose.model("logins", loginSchema);

app.get('/getSup', (req, res) => {
    loginModel.find()
    .then((agency => res.json(agency)))
    .catch(err => res.json(err))
})

const zoneMap = {
    'Gujarat': 14567,
    'Haryana & Delhi': 13522,
    'Uttar Pradesh': 23654,
    'Maharashtra': 78904,
    'Madhya Pradhesh': 90342,
    'Punjab & Himachal': 98123,
    'Tamil Nadu': 347213
};

app.post('/registerAgency', async (req, res) => {
    const { uid, agencyName, zoneName, address, specialization, password } = req.body;

    // Check if the UID already exists
    const existingUser = await signupModel.findOne({ UID: uid });
    if (existingUser) {
        return res.status(400).json('Error: User already exists.');
    }

    // Check if the zone is valid
    if (!zoneMap[zoneName]) {
        return res.status(400).json('Error: Invalid zone.');
    }

    // Convert the address to coordinates using the Geocode API
    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&format=json&api_key=4af26eb869b549568fdd6006cbeb38c8`);
    const data = await response.json();

    // Extract the latitude and longitude
    const latitude = data.results[0].lat;
    const longitude = data.results[0].lon;

    // Create a new agency
    const newAgency = new agencyModel({
        UID: uid,
        Latitude: latitude,
        Longitude: longitude,
        Specialisations: specialization,
        ZoneID: zoneMap[zoneName]
    });

    // Create a new signup
    const newSignup = new signupModel({
        UID: uid,
        Name: agencyName,
        Zone: zoneName,
        Address: address,
        Specialisations: specialization
    });

    // Hash the password and create a new login
    bcrypt.hash(password, saltRounds, async function(err, hash) {
        const newLogin = new loginModel({
            UID: uid,
            Password: hash
        });

        // Save the new agency, signup, and login
        try {
            await newAgency.save();
            await newSignup.save();
            await newLogin.save();
            res.redirect('/login');
        } catch (err) {
            res.status(400).json('Error: ' + err);
        }
    });
});



app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.post('/login', async (req, res) => {
    const user = await loginModel.findOne({ UID: req.body.uid });
    if (!user) return res.status(400).send('Invalid UID.');

    const validPassword = await bcrypt.compare(req.body.password, user.Password);
    if (!validPassword) return res.status(400).send('Invalid password.');

    req.session.user = user; 
    req.session.uid = user.UID;
    res.redirect('/home');
});

function checkAuth(req, res, next) {
    if (!req.session.user) {
      res.redirect('/login');
    } else {
      next();
    }
  }
  
// '/getAgencies' endpoint
app.get('/getAgencies', checkAuth, (req, res) => {
    // Get the UID of the logged-in agency
    const loggedInAgencyUID = req.session.user.UID;

    // Find the logged-in agency in the database
    agencyModel.findOne({ UID: loggedInAgencyUID })
        .then(loggedInAgency => {
            // Get the ZoneID of the logged-in agency
            const loggedInAgencyZoneID = loggedInAgency.ZoneID;

            // Find all agencies in the same zone
            return agencyModel.find({ ZoneID: loggedInAgencyZoneID })
                .then(agenciesInSameZone => {
                    // Prepare the data to be sent
                    const dataToSend = agenciesInSameZone.map(agency => ({
                        UID: agency.UID,
                        Specialisations: agency.Specialisations,
                        coordinates: {
                            Latitude: agency.Latitude,
                            Longitude: agency.Longitude
                        }
                    }));

                    // Get all unique specializations
            const specializations = [...new Set(agenciesInSameZone.map(agency => agency.Specialisations))];
                    // Send the data along with the logged-in agency's coordinates
                    res.json({
                        loggedInAgencyCoordinates: {
                            Latitude: loggedInAgency.Latitude,
                            Longitude: loggedInAgency.Longitude
                        },
                        agencies: dataToSend,
                        specializations: specializations
                    });
                });
        })
        .catch(err => res.json(err));
});



// '/home' endpoint
app.get('/home', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/getLoggedInAgency', checkAuth, (req, res) => {
    const loggedInAgencyUID = req.session.user.UID;
    signupModel.findOne({ UID: loggedInAgencyUID })
        .then(loggedInAgency => res.json(loggedInAgency))
        .catch(err => res.json(err));
});

app.listen(3090, () => {
    console.log("Running on port 3090")
});