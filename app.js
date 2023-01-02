
const parser = require('node-html-parser');
const axios = require('axios');
const FormData = require('form-data');
const express = require('express');
const cors = require('cors');
const { myRoster, emptyRoster, lanaRoster } = require(__dirname + '/fake-data');
const fs = require('fs');
const cheerio = require('cheerio');
const ical = require('node-ical');

// const { faker } = require('@faker-js/faker');

// cmds
// git status
// git add .
// git commit -m 'msg'
// git push heroku main
// heroku ps
// heroku ps:restart
// heroku local web


let https;
try {
  https = require('node:https');
} catch (err) {
  console.log('https support is disabled');
}

const app = express();

const dateTransformer = (str) => {
  // const str = '22/04/2022 07:30:16';

  const [dateComponents, timeComponents] = str.split(' ');

  const [day, month, year] = dateComponents.split('/');
  const [hours, minutes] = timeComponents.split(':');

  const date = new Date(Date.UTC(+year, month - 1, +day, +hours, +minutes, 0));

  return date;
}

const icao_iata = (str) => {
  if (str === "LFPO") return "ORY"
  if (str === "FMEE") return "RUN"
  if (str === "NTAA") return "PPT"
  if (str === "KSFO") return "SFO"
  if (str === "KEWR") return "EWR"
  if (str === "KLAX") return "LAX"
  if (str === "KMIA") return "MIA"
  if (str === "LFBO") return "TLS"

  return str
}

function getRandomBase() {
  var d = Math.random();
  if (d < 0.8) {
    // 80% chance of being here
    // ORY base
    return "ORY"
  } else {
    // 20%, RUN base
    return "RUN"
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

function addHours(numOfHours, date) {
  let  newDate = new Date(date);
  newDate.setTime(newDate.getTime() + numOfHours * 60 * 60 * 1000);

  return newDate;
}

const rotation_generator = (base, start) => {
  if (base === "ORY") {
    const random_index = getRandomInt(0, 5)
    const destinations = ["EWR", "LAX", "RUN", "SFO", "MIA"]

    // minimum rest 24h
    const random_offset = getRandomInt(24, 144)

    // minimum layover 24h, max 72h
    const random_layover1_length = getRandomInt(24, 72)

    if (random_index < 4) {
      // simple rotation
      // flights
      // startDate
      // endDate
      const flight1 = {
        origin: base,
        startDate: addHours(random_offset, new Date(start)),
        flightNumber: '700',
        destination: destinations[random_index],
        endDate: addHours(random_offset + 11, new Date(start))
      }

      const flight2 = {
        origin: destinations[random_index],
        startDate: addHours(random_offset + 11 + random_layover1_length, new Date(start)),
        flightNumber: '701',
        destination: base,
        endDate: addHours(random_offset + 11 + random_layover1_length + 11, new Date(start))
      }

      const startDate = addHours(random_offset, new Date(start))
      const endDate = addHours(random_offset + 11 + random_layover1_length + 11, new Date(start))

      const fake_rotation = {
        flights: [flight1, flight2],
        startDate: startDate,
        endDate: endDate
      }

      return fake_rotation
    } else {
      // PPT rotation
      const random_layover2_length = getRandomInt(24, 72)
      const random_layover3_length = getRandomInt(24, 72)

      const flight1Start_offset = random_offset;
      const flight1End_offset = flight1Start_offset + 13;
      const flight2Start_offset = flight1End_offset + random_layover1_length;
      const flight2End_offset = flight2Start_offset + 13;
      const flight3Start_offset = flight2End_offset + random_layover2_length;
      const flight3End_offset = flight3Start_offset + 13;
      const flight4Start_offset = flight3End_offset + random_layover3_length;
      const flight4End_offset = flight4Start_offset + 13;

      const flight1 = {
        origin: base,
        startDate: addHours(flight1Start_offset, new Date(start)),
        flightNumber: '710',
        destination: 'SFO',
        endDate: addHours(flight1End_offset, new Date(start))
      }

      const flight2 = {
        origin: 'SFO',
        startDate: addHours(flight2Start_offset, new Date(start)),
        flightNumber: '731',
        destination: 'PPT',
        endDate: addHours(flight2End_offset, new Date(start))
      }

      const flight3 = {
        origin: 'PPT',
        startDate: addHours(flight3Start_offset, new Date(start)),
        flightNumber: '732',
        destination: 'SFO',
        endDate: addHours(flight3End_offset, new Date(start))
      }

      const flight4 = {
        origin: 'SFO',
        startDate: addHours(flight4Start_offset, new Date(start)),
        flightNumber: '711',
        destination: base,
        endDate: addHours(flight4End_offset, new Date(start))
      }

      const startDate = addHours(flight1Start_offset, new Date(start))
      const endDate = addHours(flight4End_offset, new Date(start))

      const fake_rotation = {
        flights: [flight1, flight2, flight3, flight4],
        startDate: startDate,
        endDate: endDate
      }

      return fake_rotation
    }
  } else {
    // RUN base
  }


}

const profile_generator = (month) => {

  const fake_base = getRandomBase()

  console.log(month)
  const month_int = parseInt(month) -1
  console.log(month_int)

  const month_start = new Date(Date.UTC(2022, month_int, 1));
  const month_end = new Date(Date.UTC(2022, month_int + 1, 0));

  console.log("Month:")
  console.log(month_start)
  console.log(month_end)

  const range_start = addHours(-getRandomInt(0, 72), month_start);
  const range_end = addHours(getRandomInt(0, 72), month_end);

  console.log("Range:")
  console.log(range_start)
  console.log(range_end)

  let fake_rotations = []
  let cursor = range_start;
  while (cursor < range_end) {
    const fake_rotation = rotation_generator(fake_base, cursor);

    if (fake_rotation.startDate < range_end) {
      fake_rotations.push(fake_rotation);
    }

    cursor = fake_rotation.endDate;
  }

  const fake_profile = {
    base: fake_base,
    rotations: fake_rotations
  }

  return fake_profile;
}

const process_ical = (ical, base) => {

  // extract the flights or MEP from the ical
  let flights_meps = []
  for (const event of Object.values(ical)) {
      if (event.summary && event.summary.startsWith("7")) {

        const [startBase, endBase] = event.location.substring(0, 9).split("-").map(icao_iata)
        const signin_date = event.start
        const end_date = event.end

        console.log("Flight found: " + startBase + " (" + signin_date.toUTCString() + ")" + " to " + endBase + " (" + end_date.toUTCString() + ")")

        const flight = {
          origin: startBase,
          startDate: signin_date,
          flightNumber: event.summary,
          endDate: end_date,
          destination: endBase,
        }

        flights_meps.push(flight)

      } else if (event.summary && event.summary.startsWith("MEP")) {
        const [startBase, endBase] = event.location.substring(0, 9).split("-").map(icao_iata)
        const signin_date = event.start
        const end_date = event.end


        if ((startBase !== "TLS") && (endBase !== "TLS")) {

          console.log("MEP found: " + startBase + " (" + signin_date.toUTCString() + ")" + " to " + endBase + " (" + end_date.toUTCString() + ")")

          const mep = {
            origin: startBase,
            startDate: signin_date,
            flightNumber: 'MEP',
            endDate: end_date,
            destination: endBase,
          }

          flights_meps.push(mep)
        }
      }
  }

  // building the roster with rotations (simple or b2b)
  let roster = {
    base: base,
    rotations: []
  }

  // finds a flight or MEP departing the base and closes the rotation when back in the base
  for (let i = 0; i < flights_meps.length; i++) {
    // if departing ORY, open the rotation and look for the end
    if (flights_meps[i].origin === base) {
      console.log("1 flight departing " + base + " found")
      const flight1 = flights_meps[i];

      // look for the next flight or MEP (if it exists)
      // if return from same destination back to ORY, rotation complete
      // console.log(i+1)
      if (i+1 < flights_meps.length) {
        //console.log(flights_meps.length)
        //console.log(flight1.destination)
        //console.log(flights_meps[i+1].origin)
        //console.log(flights_meps[i+1].destination)

        if ((flight1.destination === flights_meps[i+1].origin)
            && (flights_meps[i+1].destination === base)) {
          const flight2 = flights_meps[i+1];

          // short rotation found, building the rotation
          const rotation = {flights: [flight1, flight2], startDate: flight1.startDate, endDate: flight2.endDate}

          // adding it to the roster
          roster.rotations.push(rotation)

          // skipping the next flight
          i++;
        } else if ((flight1.destination === flights_meps[i+1].origin)
            && (flights_meps[i+1].destination != base)) {
            // long rotation found
            if (i+3 < flights_meps.length && flights_meps[i+3].destination === base) {
              //full rotation available and back to ORY, proceeding
              const flight2 = flights_meps[i+1];
              const flight3 = flights_meps[i+2];
              const flight4 = flights_meps[i+3];

              const rotation = {flights: [flight1, flight2, flight3, flight4], startDate: flight1.startDate, endDate: flight4.endDate}

              // adding it to the roster
              roster.rotations.push(rotation);

              // skipping the next 3 flights
              i = i + 3;
            }
        }
      } else {
        console.log("Last flight, cannot close the rotation")
      }
    }
  }

  return roster;
}


app.use(express.json());
app.use(cors());

axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios.defaults.withCredentials = true;

axios.interceptors.request.use(x => {
  console.log("====== AXIOS REQUEST ======");
  console.log(x);
  return x;
})

axios.interceptors.response.use(x => {
  console.log("====== AXIOS RESPONSE ======");
  console.log(x);
  return x;
})

//READ Request Handlers
app.get('/', (req, res) => {
  res.send('Bee Buddy API');
});

app.get('/api/fake/random/', (req, res_api) => {
  const month = req.query.month
  const fake_profile = profile_generator(month)

  res_api.send(fake_profile);
});

app.get('/api/fake/norotations', (req, res_api) => {
  res_api.send(emptyRoster);
});

app.get('/api/fake/lana', (req, res_api) => {
  res_api.send(lanaRoster);
});

app.get('/api/test/cal', async (req, res_api) => {
  let wlink = "webcal://cyberjet.frenchbee.com/CrewAccessICS/CrewICS?ics=8F3C62AE-89DD-4BD4-93E5-57E56AEE3776"
  let nlink = encodeURI(wlink.replace("webcal", "https"))

  const webEvents = await ical.async.fromURL(nlink);

  // const ics_file = fs.readFileSync('/tmp.ics');


  for (const event of Object.values(webEvents)) {
      console.log(
          'Summary: ' + event.summary
      );
  };

  res_api.send('Done');
});

app.get('/api/profile/', async (req, res_api) => {
  let wlink = req.query.ics
  let base = req.query.base
  let nlink = encodeURI(wlink.replace("webcal", "https"))
  //console.log(nlink)

  const webEvents = await ical.async.fromURL(nlink);

  const roster = process_ical(webEvents, base)

  res_api.send(roster);
});

//PORT ENVIRONMENT VARIABLE
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Listening on port ${port}..`));
