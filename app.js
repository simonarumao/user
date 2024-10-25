const express = require('express');
const app = express();
const http = require('http');
const WebSocket = require('ws');

const session = require('express-session');
const mongoose = require('mongoose');
const ejsmate = require('ejs-mate')
const passport = require('passport');
const localstrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('./models/user')
const Location = require('./models/location')
const EvacuationTips = require('./models/evacuationtips')
const path = require('path')
const {exec} = require('child_process');
const { stdout, stderr } = require('process');
const cors = require('cors');
const bodyparser = require('body-parser');
const twilio = require('twilio')


mongoose.connect('mongodb://127.0.0.1:27017/adminlog')
.then(()=>
{
    console.log(" mongo connection open");
})
.catch(err=>{
    console.log("oh no error mongo connection error");
    console.log(err);
})

app.use(cors())
app.engine('ejs',ejsmate)
app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))
app.use(express.urlencoded({ extended: false }))
app.use(express.static(__dirname + '/public'));
app.use(session({
    secret: "verygoodsecret",
    resave: false,
    saveUninitialized: true
}));

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());



app.get('/api/randomLocation', async (req, res) => {
  try {
    // Query the database to get a completely random location
    const location = await Location.aggregate([{ $sample: { size: 1 } }]);

    if (location.length > 0) {
      res.json({
        latitude: location[0].latitude,
        longitude: location[0].longitude,
      });
    } else {
      res.status(404).json({ error: 'Location not found' });
    }
  } catch (error) {
    console.error('Error fetching random location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//
const accountSid = 'ACda142b2f7c984f7f7cc2d6c0612539bf';

// 
const authToken = '07b39b4e265c763d0b3c2e253aa58e3f';

//
const fromNumber = '+19704144167';

const client = twilio(accountSid, authToken);

function checkAlertCondition(userLatitude, userLongitude, targetLatitude, targetLongitude, alertRadius) {
  const earthRadius = 6371; // Earth's radius in kilometers*
  const toRadians = (angle) => (angle * Math.PI) / 180;

  const dLat = toRadians(targetLatitude - userLatitude);
  const dLon = toRadians(targetLongitude - userLongitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(userLatitude)) * Math.cos(toRadians(targetLatitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadius * c;

  // Log the values for debugging
  console.log('Distance:', distance);
  console.log('Alert Radius:', alertRadius);
  const alertRadiusKm = alertRadius / 1000;

  // Check if the user is within the specified alertRadius
  return distance <= alertRadiusKm;
}

app.post('/send-alerts', async (req, res) => {
  const users = [
    { phone_number: '+917028886778', latitude: req.body.latitude, longitude: req.body.longitude },
    { phone_number: '+919867043783', latitude: req.body.latitude, longitude: req.body.longitude },
    { phone_number: '+919137675962', latitude: req.body.latitude, longitude: req.body.longitude },
    { phone_number: '+919619072004', latitude: req.body.latitude, longitude: req.body.longitude },
    { phone_number: '+918291008299', latitude: req.body.latitude, longitude: req.body.longitude },
    { phone_number: '+917400219669', latitude: req.body.latitude, longitude: req.body.longitude },

    


    
  ];

  console.log(req.body);
  const targetLatitude = req.body.targetLatitude; // Replace with the actual target latitude
  const targetLongitude = req.body.targetLongitude; // Replace with the actual target longitude
  const alertRadius = req.body.alertRadius; // Replace with the actual alert radius
  const alertMessage = '🚨 Emergency Alert 🚨\nMissile Threat Detected. Take Immediate Shelter!\n - Move to a basement or an interior room.\n - Avoid windows and stay low.\n - If outside, seek the nearest sturdy shelter.\nStay tuned for updates from authorities. This is NOT a drill.\nFollow local emergency instructions.\nStay Safe! : https://www.example.com';

  const maxretries = 10;
  const retrydelay = 5000;

  // Filter users in the target zone
  const usersInTargetZone = users.filter(user => {
    const userLatitude = user.latitude;
    const userLongitude = user.longitude;

    const inTargetZone = checkAlertCondition(userLatitude, userLongitude, targetLatitude, targetLongitude, alertRadius);

    console.log(`User: ${user.phone_number}, In Target Zone: ${inTargetZone}`);

    return inTargetZone;
  });

  try {
    // Use Promise.all to send both SMS and Voice messages concurrently
    await Promise.all(
      usersInTargetZone.map(async user => {
        let retrycount = 0;
        while (retrycount < maxretries) {
          try {
            const smsPromise = client.messages.create({
              body: `${alertMessage} (SMS)`,
              from: fromNumber,
              to: user.phone_number
            });

            const voicePromise = client.calls.create({
              url: 'http://demo.twilio.com/docs/voice.xml',
              to: user.phone_number,
              from: fromNumber
            });


            const [smsresult, voiceresult] = await Promise.all([smsPromise, voicePromise]);

            if (voiceresult && voiceresult.status === 'completed')
            {
              console.log(`voice call to ${user.phone_number} successful.`);
              break;
            }

            console.error(`Error sending alerts to ${user.phone_number} (retry ${retrycount + 1}): voice call failed`);
            retrycount++;
            await new Promise(resolve => setTimeout(resolve, retrydelay));
          } catch (error) {
            console.error(`Error sending alerts to ${user.phone_number} (retry ${retrycount + 1}):`, error);
            retrycount++;
            await new Promise(resolve => setTimeout(resolve, retrydelay));
          }
        }
      })
    );

    console.log('All alerts sent successfully');
    res.send('Alerts sent successfully.');
  } catch (error) {
    console.error('Error sending alerts:', error);
    res.status(500).send('Error sending alerts.');
  }
});


passport.serializeUser(function (user, done) {
    done(null, user.id);

})
passport.deserializeUser(async function(id, done) {
    try {
      const user = await User.findById(id).lean();
  
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
  
passport.use(new localstrategy(
    async function(username, password, done) {
      try {
        const user = await User.findOne({ username: username });
  
        if (!user) {
          return done(null, false, { message: 'Incorrect username.' });
        }
  
        const isPasswordValid = await bcrypt.compare(password, user.password);
  
        if (!isPasswordValid) {
          return done(null, false, { message: 'Incorrect password.' });
        }
  
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}
function isLoggedOut(req, res, next) {
    if (!req.isAuthenticated()) return next();
    res.redirect('/admin');
}

app.get('/admin',isLoggedIn,(req,res)=>{
    res.render('admin/index',{title:"admin"})
})

app.post('/execute_script', (req, res) => {
    exec('python python/callalerts.py', (error, stdout, stderr) => {
      if (error) {
        console.error(`error executing script: ${error.message}`);
        res.status(500).send('Internal Server error');
        return;
      }
      console.log(`script output:${stdout}`);
      res.redirect('/admin');
    })
  })
app.get('/login', isLoggedOut, (req, res) => {
    let response = {
        title: "login",
        error:req.query.error
    }
    res.render('admin/login', response)
})

app.post('/login', passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/login?error=true'
}));

app.get('/logout', function (req, res) {
    req.logout(function(err) {
        if (err) {
            // Handle error if logout fails
            return res.redirect('/admin'); // Redirect to a different page or handle it as per your requirements
        }
        res.redirect('/login'); // Redirect after successful logout
    });
});


//setup our admin
app.get('/setup', async (req, res) => {
	const exists = await User.exists({ username: "admin" });

    if (exists) {
        
		res.redirect('/login');
		return;
	};

	bcrypt.genSalt(10, function (err, salt) {
		if (err) return next(err);
		bcrypt.hash("pass", salt, function (err, hash) {
			if (err) return next(err);
			
			const newAdmin = new User({
				username: "admin",
				password: hash
			});

			newAdmin.save();

			res.redirect('/login');
		});
	});
});
app.get('/', async (req, res) => {
  try {
    const tips = await EvacuationTips.find({})
    res.render('User/index',{evacuationTips:tips})
  }
  catch (err)
  {
    console.error(err);
    res.status(500).send('Internal Server Error')
  }
})

app.post('/api/storeUserLocation',express.json(),(req,res)=>{
    const userLocation = req.body;
    console.log('user location received',userLocation);
    res.json({message:'User location stored sucessfully'})
})

app.get('/about', (req, res) => {
    res.render('User/about')
})

app.get('/contact', (req, res) => {
    res.render('User/contact')
})

app.get('/do&dont', (req, res) => {
    res.render('User/do&dont')
})



app.listen(3000, () => {
    console.log('server is running on the port 3000');
})
