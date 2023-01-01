
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

const flight_generator = (start) => {
  const random_index = getRandomInt(0, 5)
  const destinations = ["EWR", "LAX", "RUN", "SFO", "MIA"]

  // minimum rest 24h
  const random_offset = getRandomInt(24, 144)

  // minimum layover 24h, max 72h
  const random_layover1_length = getRandomInt(24, 72)

  if (random_index < 4) {
    // simple rotatiox
    let fake_flight = {
      flight1Start: addHours(random_offset, new Date(start)),
      flight1Number: '700',
      flight1End: addHours(random_offset + 11, new Date(start)),
      destination: destinations[random_index],
      flight2Start: addHours(random_offset + 11 + random_layover1_length, new Date(start)),
      flight2Number: '701',
      flight2End: addHours(random_offset + 11 + random_layover1_length + 11, new Date(start))
    }

    return {rotation: fake_flight, end: fake_flight.flight2End}
  } else {
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

    let fake_flight = {
      flight1Start: addHours(flight1Start_offset, new Date(start)),
      flight1Number: '700',
      flight1End: addHours(flight1End_offset, new Date(start)),
      destination1: "SFO",
      flight2Start: addHours(flight2Start_offset, new Date(start)),
      flight2Number: '731',
      flight2End: addHours(flight2End_offset, new Date(start)),
      destination2: "PPT",
      flight3Start: addHours(flight3Start_offset, new Date(start)),
      flight3Number: '701',
      flight3End: addHours(flight3End_offset, new Date(start)),
      destination3: "SFO",
      flight4Start: addHours(flight4Start_offset, new Date(start)),
      flight4Number: '701',
      flight4End: addHours(flight4End_offset, new Date(start))
    }

    return {rotation: fake_flight, end: fake_flight.flight4End}
  }
}

const profile_generator = (month) => {

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

  let rotations = []
  let cursor = range_start;
  while (cursor < range_end) {
    const fake_flight = flight_generator(cursor);

    if (fake_flight.rotation.flight1Start < range_end) {
      rotations.push(fake_flight.rotation);
    }

    cursor = fake_flight.end;
  }

  const fake_profile = {
    fullName: faker.name.fullName(),
    rotations: rotations
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
          const rotation = [flight1, flight2]

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

              const rotation = [flight1, flight2, flight3, flight4]

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

app.get('/api/old_profile/', (req, res_api) => {
  const login = req.query.login;
  const password = req.query.password;

  //cyberjet: request login page
  const my_httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
  });

  const get_login_config = {
      httpsAgent: my_httpsAgent,
    }

  let full_dump;

  console.log("Requesting Login page...");
  axios.get('https://cyberjet.frenchbee.com/js_crew_access/PAGE_Home', get_login_config)
  .then(res_cyber => {
    const headerDate = res_cyber.headers && res_cyber.headers.date ? res_cyber.headers.date : 'no response date';
    // console.log('Status Code:', res_cyber.status);

    const cheerio_login_page = cheerio.load(res_cyber.data);

    // page title
    const page_title = cheerio_login_page('title').text();
    console.log("Page title received: " + page_title);

    if (page_title !== "Erreur") {
      // form action
      const form_action_login = cheerio_login_page('form').attr('action')
      console.log("Form action (inside login page): " + form_action_login)
      const home_url = "https://cyberjet.frenchbee.com" + form_action_login;

      var bodyFormData = new FormData();
      // bodyFormData.append("WD_JSON_PROPRIETE_", "{\"m_oProprietesSecurisees\":{}}");
      bodyFormData.append("WD_BUTTON_CLICK_", "A1");
      bodyFormData.append("WD_ACTION_", "");
      bodyFormData.append("A3", login);
      bodyFormData.append("A2", password);

      const standard_config = {
        httpsAgent: my_httpsAgent,
      }

      console.log("Requesting Home page...");
      axios.post(home_url, bodyFormData, standard_config).then(res_cyber => {
        const cheerio_home_page = cheerio.load(res_cyber.data);

        // page title
        const page_title = cheerio_home_page('title').text();
        console.log("Page title received: " + page_title);

        if (page_title === "Login") {
          // login unsuccessful
          console.log("Invalid credentials, returning 404");
          return res_api.status(403).send({
             message: 'Credentials invalid!'
          });
        }

        // fullName in #tzM93
        const fullName = cheerio_home_page("#tzM93").text();
        console.log("fullName: " + fullName);

        // form action
        const form_action_home = cheerio_home_page('form').attr('action')
        console.log("Form action (inside home page): " + form_action_home)

        // old way
        console.log("Requesting Planning (via HOME) page...");
        const planning_url = "https://cyberjet.frenchbee.com" + form_action_home;
        var context_payload = new FormData();
        context_payload.append("WD_ACTION_", "MENU");
        context_payload.append("ID", "M70");

        axios.post(planning_url, context_payload, standard_config).then(res_cyber => {
          console.log("Planning (via menu) request executed");

          // algo
          // go previous, load flights for month - 1
          // go next, load current month
          // try to go next again, if next roster is up

          // form action
          const cheerio_planning_page = cheerio.load(res_cyber.data);
          const form_action_planning = cheerio_planning_page('form').attr('action')
          console.log("Form action (inside planning via menu): " + form_action_planning)

          // building url for prerequest
          const prerequest_url = "https://cyberjet.frenchbee.com" + form_action_planning;

          console.log("(1/2) Pre-request to set UTC")
          var context_payload_utc = new FormData();
          context_payload_utc.append("WD_ACTION_", "AJAXPAGE");
          context_payload_utc.append("EXECUTE", "47");
          context_payload_utc.append("WD_CONTEXTE_", "M76");
          context_payload_utc.append("M76", "1");

          axios.post(prerequest_url, context_payload_utc, standard_config).then(res_cyber => {
            console.log("Pre-request to set UTC executed")

            console.log("(2/2) Request for UTC")
            var utc_payload = new FormData();
            utc_payload.append("WD_ACTION_", "AJAXPAGE");
            utc_payload.append("LIGNESTABLE", "A2");
            utc_payload.append("0", "0");

            axios.post(prerequest_url, utc_payload, standard_config).then(res_cyber => {
              console.log("Request for UTC executed")

              console.log("(1/2) Pre-request M-1 (backward)")
              var context_payload_bwd = new FormData();
              context_payload_bwd.append("WD_ACTION_", "AJAXPAGE");
              context_payload_bwd.append("EXECUTE", "16");
              context_payload_bwd.append("WD_CONTEXTE_", "A3");
              context_payload_bwd.append("upgrade-insecure-requests", "1");

              axios.post(prerequest_url, context_payload_bwd, standard_config).then(res_cyber => {
                console.log("Pre-request M-1 executed (backward)")

                console.log("(2/2) Planning request for M-1 (for xml content)")
                var planning_payload = new FormData();
                planning_payload.append("WD_ACTION_", "AJAXPAGE");
                planning_payload.append("LIGNESTABLE", "A2");
                planning_payload.append("0", "0");

                axios.post(prerequest_url, planning_payload, standard_config).then(res_cyber => {
                  console.log("Planning request for M-1 (for xml content) executed")

                  // dumping result
                  let dump_M_minus1 = res_cyber.data.replaceAll("<![CDATA[", "");
                  dump_M_minus1 = dump_M_minus1.replaceAll("]]>", "");
                  full_dump = full_dump + dump_M_minus1;

                  console.log("(1/2) Pre-request M (forward)")
                  var context_payload_fwd = new FormData();
                  context_payload_fwd.append("WD_ACTION_", "AJAXPAGE");
                  context_payload_fwd.append("EXECUTE", "16");
                  context_payload_fwd.append("WD_CONTEXTE_", "A7");
                  context_payload_fwd.append("upgrade-insecure-requests", "1");

                  axios.post(prerequest_url, context_payload_fwd, standard_config).then(res_cyber => {
                    console.log("Pre-request M executed (forward)")

                    console.log("(2/2) Planning request for M (for xml content)")
                    var planning_payload = new FormData();
                    planning_payload.append("WD_ACTION_", "AJAXPAGE");
                    planning_payload.append("LIGNESTABLE", "A2");
                    planning_payload.append("0", "0");
                    axios.post(prerequest_url, planning_payload, standard_config).then(res_cyber => {
                      console.log("Planning request for M (for xml content) executed")

                      // dumping result
                      let dump_M = res_cyber.data.replaceAll("<![CDATA[", "");
                      dump_M = dump_M.replaceAll("]]>", "");
                      full_dump = full_dump + dump_M;

                      console.log("(1/2) Pre-request M+1 (forward)")
                      var context_payload_fwd = new FormData();
                      context_payload_fwd.append("WD_ACTION_", "AJAXPAGE");
                      context_payload_fwd.append("EXECUTE", "16");
                      context_payload_fwd.append("WD_CONTEXTE_", "A7");
                      context_payload_fwd.append("upgrade-insecure-requests", "1");
                      axios.post(prerequest_url, context_payload_fwd, standard_config).then(res_cyber => {
                        console.log("Pre-request M+1 executed (forward)")

                        console.log("(2/2) Planning request for M+1 (for xml content)")
                        var planning_payload = new FormData();
                        planning_payload.append("WD_ACTION_", "AJAXPAGE");
                        planning_payload.append("LIGNESTABLE", "A2");
                        planning_payload.append("0", "0");
                        axios.post(prerequest_url, planning_payload, standard_config).then(res_cyber => {
                          console.log("Planning request for M+1 (for xml content) executed")

                          // dumping result
                          let dump_M_plus1 = res_cyber.data.replaceAll("<![CDATA[", "");
                          dump_M_plus1 = dump_M_plus1.replaceAll("]]>", "");

                          if (dump_M.length !== dump_M_plus1.length) {
                            console.log("M+1 is available, added to the dump")
                            full_dump = full_dump + dump_M_plus1;
                          } else {
                            console.log("M+1 is not available")
                          }

                          console.log("All requests done. Processing now...")
                          const roster = process_dump(full_dump, fullName)
                          res_api.send(roster);
                        }).catch(error => console.log(error));
                      }).catch(error => console.log(error));
                    }).catch(error => console.log(error));
                  }).catch(error => console.log(error));
                }).catch(error => console.log(error));
              }).catch(error => console.log(error));
            }).catch(error => console.log(error));
          }).catch(error => console.log(error));
        }).catch(error => console.log(error));
      }).catch(error => console.log(error));
    }
    // res_api.send(myRoster);
  })
  .catch(err => {
    console.log('Error: ', err.message);
  });

  // res_api.send(rosters);
})

//PORT ENVIRONMENT VARIABLE
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Listening on port ${port}..`));
